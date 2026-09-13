import { computed, onBeforeUnmount, ref } from 'vue'
import {
  get,
  onDisconnect,
  onValue,
  ref as databaseRef,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update
} from 'firebase/database'
import { auth, db, rtdb } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import {
  canJoinRoom,
  createRoomCode,
  findOpenSeat,
  findPlayerSeat,
  forfeitReason,
  getConnectedPlayers,
  getMatchPlayers,
  getRoomPlayers,
  isRoomExpired,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PUBLIC_START_DELAY_MS,
  ROOM_CODE_LENGTH,
  ROOM_GRACE_MS,
  ROOM_LIFETIME_MS,
  ROOM_SLOTS,
  normalizeRoomCode,
  shouldStartPublicRoom
} from '../utils/quietRoomProtocol'

const ACTIVE_ROOM_KEY = 'trace_active_multiplayer_room'
const PROGRESS_THROTTLE_MS = 160
const PLAYER_NAMES = {
  one: 'Still Pine',
  two: 'Quiet River',
  three: 'Soft Rain',
  four: 'Warm Cedar',
  five: 'Dawn Mist'
}

const roomPath = code => 'multiplayerRooms/' + code
const activePath = uid => 'activeMultiplayer/' + uid
const openPath = code => 'publicMultiplayerRooms/' + code

const friendlyError = error => {
  const code = String(error?.code || '')
  if (code.includes('PERMISSION_DENIED') || code.includes('permission-denied')) {
    return 'This room could not be entered. Publish the matching Realtime Database rules, then try again.'
  }
  if (code.includes('NETWORK') || code.includes('unavailable')) {
    return 'The current is quiet while your connection returns.'
  }
  return error?.message || 'The room could not be opened.'
}

export const useQuietRoom = () => {
  const roomCode = ref('')
  const room = ref(null)
  const localSeat = ref(null)
  const roomError = ref('')
  const isBusy = ref(false)
  const connectionState = ref('idle')
  const isOnline = ref(true)
  const serverOffset = ref(0)

  let stopRoom = null
  let stopConnection = null
  let stopOffset = null
  let disconnectPlayer = null
  let disconnectHost = null
  let progressTimer = null
  let publicStartTimer = null
  let cleanupTimer = null
  let matchWatchdog = null
  let reconciling = false
  let intentionallyLeaving = false

  const players = computed(() => room.value?.meta?.status === 'lobby'
    ? getRoomPlayers(room.value?.players)
    : getMatchPlayers(room.value?.players))
  const connectedPlayers = computed(() => getConnectedPlayers(room.value?.players))
  const matchPlayers = computed(() => getMatchPlayers(room.value?.players, room.value?.meta?.forfeits))
  const localPlayer = computed(() => room.value?.players?.[localSeat.value] || null)
  const isHost = computed(() => room.value?.meta?.hostUid === auth.currentUser?.uid)
  const isLobby = computed(() => room.value?.meta?.status === 'lobby')
  const isPlaying = computed(() => room.value?.meta?.status === 'playing')
  const hasEnded = computed(() => room.value?.meta?.status === 'ended')
  const canStart = computed(() => isHost.value && isLobby.value && connectedPlayers.value.length >= MIN_PLAYERS)

  const resolvePlayerNames = async () => {
    try {
      const profile = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data()?.profile
      const preferred = profile?.isAnonymous ? profile.alias : auth.currentUser.displayName
      const name = String(preferred || '').trim().slice(0, 36)
      return seat => name || PLAYER_NAMES[seat]
    } catch {
      // Never reveal a name when the privacy preference cannot be loaded.
      return seat => PLAYER_NAMES[seat]
    }
  }

  const clearListeners = () => {
    stopRoom?.()
    stopConnection?.()
    stopOffset?.()
    stopRoom = null
    stopConnection = null
    stopOffset = null
    clearTimeout(progressTimer)
    clearTimeout(publicStartTimer)
    clearInterval(matchWatchdog)
    progressTimer = null
    publicStartTimer = null
    matchWatchdog = null
  }

  const rememberRoom = async code => {
    if (!auth.currentUser) return
    localStorage.setItem(ACTIVE_ROOM_KEY, code)
    await set(databaseRef(rtdb, activePath(auth.currentUser.uid)), {
      code,
      touchedAt: serverTimestamp()
    })
  }

  const forgetRoom = async () => {
    localStorage.removeItem(ACTIVE_ROOM_KEY)
    if (auth.currentUser) await remove(databaseRef(rtdb, activePath(auth.currentUser.uid))).catch(() => {})
  }

  const playerPayload = (seat, name = PLAYER_NAMES[seat]) => ({
    uid: auth.currentUser.uid,
    name,
    connected: true,
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    disconnectedAt: null,
    progress: 0,
    complete: false,
    finishOrder: 0
  })

  const scheduleExpiredCleanup = (code, deadline) => {
    clearTimeout(cleanupTimer)
    cleanupTimer = setTimeout(async () => {
      const target = databaseRef(rtdb, roomPath(code))
      const snapshot = await get(target).catch(() => null)
      const value = snapshot?.val()
      if (value?.meta && isRoomExpired(value.meta)) {
        await remove(target).catch(() => {})
        await remove(databaseRef(rtdb, openPath(code))).catch(() => {})
      }
    }, Math.max(0, deadline - Date.now()) + 250)
  }

  const attachPresence = async () => {
    if (!roomCode.value || !localSeat.value || !auth.currentUser) return
    const playerRef = databaseRef(rtdb, roomPath(roomCode.value) + '/players/' + localSeat.value)
    disconnectPlayer = onDisconnect(playerRef)
    await disconnectPlayer.update({
      connected: false,
      disconnectedAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    })

    if (isHost.value) {
      const hostRef = databaseRef(rtdb, roomPath(roomCode.value) + '/meta/hostDisconnectedAt')
      disconnectHost = onDisconnect(hostRef)
      await disconnectHost.set(serverTimestamp())
    }

    await update(playerRef, {
      connected: true,
      disconnectedAt: null,
      lastSeen: serverTimestamp()
    })
    if (isHost.value) {
      await set(databaseRef(rtdb, roomPath(roomCode.value) + '/meta/hostDisconnectedAt'), null)
    }
  }

  const endMatch = async reason => {
    if (!roomCode.value || room.value?.meta?.status === 'ended') return
    await update(databaseRef(rtdb, roomPath(roomCode.value) + '/meta'), {
      status: 'ended',
      endedReason: reason,
      endedAt: serverTimestamp()
    }).catch(error => { roomError.value = friendlyError(error) })
    await remove(databaseRef(rtdb, openPath(roomCode.value))).catch(() => {})
  }

  // Every connected client checks the shared clock. A backgrounded or abruptly
  // disconnected client does not need to run its own timer to be disqualified.
  const reconcileMatch = async () => {
    const code = roomCode.value
    if (!code || room.value?.meta?.status !== 'playing' || !isOnline.value || reconciling) return
    reconciling = true
    try {
      const snapshot = await get(databaseRef(rtdb, roomPath(code))).catch(() => null)
      const current = snapshot?.val()
      if (roomCode.value !== code || current?.meta?.status !== 'playing') return
      const now = Date.now() + serverOffset.value
      const startedAt = Number(current.meta.startedAt || 0)
      if (!startedAt) return
      const pending = getMatchPlayers(current.players, current.meta.forfeits)
        .map(player => ({ player, reason: forfeitReason(player, startedAt, now) }))
        .filter(entry => entry.reason)
      for (const { player, reason } of pending) {
        if (roomCode.value !== code) return
        const target = databaseRef(rtdb, roomPath(code) + '/meta/forfeits/' + player.seat)
        await runTransaction(target, value => value || { uid: player.uid, reason, at: now }, { applyLocally: false }).catch(error => {
          roomError.value = friendlyError(error)
        })
      }
      const latest = pending.length ? (await get(databaseRef(rtdb, roomPath(code))).catch(() => null))?.val() : current
      if (roomCode.value !== code || latest?.meta?.status !== 'playing') return
      const remaining = getMatchPlayers(latest.players, latest.meta.forfeits)
      if (remaining.length <= 1) await endMatch('last-light')
      else if (remaining.every(player => player.complete)) await endMatch('complete')
    } finally {
      reconciling = false
    }
  }

  const startMatch = async () => {
    if (!canStart.value) return { ok: false, reason: 'players' }
    await update(databaseRef(rtdb, roomPath(roomCode.value) + '/meta'), {
      status: 'playing',
      startedAt: serverTimestamp(),
      startsAt: null
    })
    await remove(databaseRef(rtdb, openPath(roomCode.value))).catch(() => {})
    return { ok: true }
  }

  const coordinatePublicStart = () => {
    if (room.value?.meta?.type !== 'public' || !isLobby.value) return
    const count = connectedPlayers.value.length
    const startsAt = Number(room.value?.meta?.startsAt || 0)
    const startsRef = databaseRef(rtdb, roomPath(roomCode.value) + '/meta/startsAt')

    if (count >= MIN_PLAYERS && !startsAt) {
      const deadline = Date.now() + serverOffset.value + PUBLIC_START_DELAY_MS
      void runTransaction(startsRef, value => value || deadline, { applyLocally: false }).catch(error => {
        roomError.value = friendlyError(error)
      })
      return
    }
    clearTimeout(publicStartTimer)
    publicStartTimer = null
    if (count < MIN_PLAYERS) {
      if (startsAt) void runTransaction(startsRef, value => value === startsAt ? null : undefined, { applyLocally: false }).catch(() => {})
      return
    }
    if (!startsAt) return

    publicStartTimer = setTimeout(async () => {
      const snapshot = await get(databaseRef(rtdb, roomPath(roomCode.value))).catch(() => null)
      const current = snapshot?.val()
      if (shouldStartPublicRoom(current, Date.now() + serverOffset.value)) {
        const statusRef = databaseRef(rtdb, roomPath(roomCode.value) + '/meta/status')
        const transition = await runTransaction(statusRef, value => value === 'lobby' ? 'playing' : undefined, { applyLocally: false }).catch(() => null)
        if (!transition?.committed) return
        await update(databaseRef(rtdb, roomPath(roomCode.value) + '/meta'), {
          startedAt: serverTimestamp(),
          startsAt: null
        }).catch(() => {})
        await remove(databaseRef(rtdb, openPath(roomCode.value))).catch(() => {})
      }
    }, Math.max(0, startsAt - Date.now() - serverOffset.value))
  }

  const observeRoom = () => {
    stopOffset = onValue(databaseRef(rtdb, '.info/serverTimeOffset'), snapshot => {
      serverOffset.value = Number(snapshot.val()) || 0
    })
    const target = databaseRef(rtdb, roomPath(roomCode.value))
    stopRoom = onValue(target, snapshot => {
      const nextRoom = snapshot.val()
      if (!nextRoom) {
        room.value = null
        connectionState.value = 'ended'
        roomError.value = 'This room has returned to stillness.'
        void forgetRoom()
        return
      }
      room.value = nextRoom

      if (nextRoom.meta?.status === 'playing' && localSeat.value && nextRoom.meta?.forfeits?.[localSeat.value] && nextRoom.players?.[localSeat.value]?.connected) {
        void update(databaseRef(rtdb, roomPath(roomCode.value) + '/players/' + localSeat.value), {
          connected: false,
          disconnectedAt: serverTimestamp()
        }).catch(error => { roomError.value = friendlyError(error) })
        void forgetRoom()
      }

      if (isRoomExpired(nextRoom.meta)) {
        connectionState.value = 'expired'
        roomError.value = 'The invitation has faded after thirty quiet seconds.'
        void remove(target).catch(() => {})
        void remove(databaseRef(rtdb, openPath(roomCode.value))).catch(() => {})
        void forgetRoom()
        return
      }

      const connected = getConnectedPlayers(nextRoom.players)
      connectionState.value = nextRoom.meta.status

      if (nextRoom.meta.status === 'playing') void reconcileMatch()
      coordinatePublicStart()
    }, error => {
      roomError.value = friendlyError(error)
      connectionState.value = 'error'
    })

    const connectedRef = databaseRef(rtdb, '.info/connected')
    stopConnection = onValue(connectedRef, snapshot => {
      isOnline.value = snapshot.val() === true
      if (!isOnline.value) connectionState.value = 'reconnecting'
      else if (roomCode.value && localSeat.value) void attachPresence().catch(error => {
        roomError.value = friendlyError(error)
      })
    })
    matchWatchdog = setInterval(() => { if (isPlaying.value) void reconcileMatch() }, 1000)
  }

  const resetLocalRoom = () => {
    clearListeners()
    roomCode.value = ''
    room.value = null
    localSeat.value = null
    connectionState.value = 'idle'
  }

  const joinRoom = async rawCode => {
    const code = normalizeRoomCode(rawCode)
    roomError.value = ''
    if (!auth.currentUser) return { ok: false, reason: 'auth' }
    if (code.length !== ROOM_CODE_LENGTH) return { ok: false, reason: 'invalid' }

    clearListeners()
    isBusy.value = true
    try {
      const target = databaseRef(rtdb, roomPath(code))
      let snapshot = await get(target)
      let current = snapshot.val()
      if (!current?.meta) return { ok: false, reason: 'missing' }
      if (isRoomExpired(current.meta)) {
        await remove(target).catch(() => {})
        return { ok: false, reason: 'expired' }
      }

      let seat = findPlayerSeat(current.players, auth.currentUser.uid)
      if (seat && current.meta.forfeits?.[seat]) return { ok: false, reason: 'forfeited' }
      if (seat && current.meta.status === 'ended') return { ok: false, reason: 'ended' }
      if (!seat) {
        if (!canJoinRoom(current, auth.currentUser.uid)) return {
          ok: false,
          reason: current.meta.status === 'lobby' ? 'full' : 'started'
        }
        const candidates = [...ROOM_SLOTS]
        const playerName = await resolvePlayerNames()
        let claimed = false
        for (const candidate of candidates) {
          const seatRef = databaseRef(rtdb, roomPath(code) + '/players/' + candidate)
          const result = await runTransaction(seatRef, value => {
            const stale = value?.uid && value.connected === false &&
              Date.now() - Number(value.disconnectedAt || value.lastSeen || 0) > ROOM_GRACE_MS
            if (value?.uid && !stale) return
            return playerPayload(candidate, playerName(candidate))
          }, { applyLocally: false })
          if (result.committed) {
            seat = candidate
            claimed = true
            break
          }
        }
        if (!claimed) return { ok: false, reason: 'full' }
      }

      roomCode.value = code
      localSeat.value = seat
      snapshot = await get(target)
      room.value = snapshot.val()
      const playerName = await resolvePlayerNames()
      const currentName = playerName(seat)
      if (room.value?.players?.[seat]?.name !== currentName) {
        await update(databaseRef(rtdb, roomPath(code) + '/players/' + seat), { name: currentName })
      }
      await rememberRoom(code)
      await attachPresence()
      const offsetSnapshot = await get(databaseRef(rtdb, '.info/serverTimeOffset')).catch(() => null)
      serverOffset.value = Number(offsetSnapshot?.val()) || 0
      observeRoom()
      return {
        ok: true,
        code,
        passageIndex: Number(room.value?.meta?.passageIndex) || 0,
        resumed: Boolean(findPlayerSeat(current.players, auth.currentUser.uid))
      }
    } catch (error) {
      roomError.value = friendlyError(error)
      resetLocalRoom()
      return { ok: false, reason: 'error', message: roomError.value }
    } finally {
      isBusy.value = false
    }
  }

  const createRoom = async (passageIndex, type = 'private', options = {}) => {
    roomError.value = ''
    if (!auth.currentUser) return { ok: false, reason: 'auth' }
    isBusy.value = true
    try {
      const playerName = await resolvePlayerNames()
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = createRoomCode()
        const target = databaseRef(rtdb, roomPath(code))
        const now = Date.now()
        const initial = {
          meta: {
            hostUid: auth.currentUser.uid,
            type,
            status: 'lobby',
            passageIndex: Math.max(0, Number(passageIndex) || 0),
            wordCount: Number(options.wordCount) || 50,
            passageText: String(options.passageText || ''),
            passageAuthor: String(options.passageAuthor || 'A Shared Breath'),
            minPlayers: MIN_PLAYERS,
            maxPlayers: MAX_PLAYERS,
            createdAt: now,
            expiresAt: now + ROOM_LIFETIME_MS,
            startsAt: null,
            hostDisconnectedAt: null,
            endedReason: null,
            schemaVersion: 2
          },
          players: {
            one: playerPayload('one', playerName('one'))
          }
        }
        const result = await runTransaction(target, current => current ? undefined : initial, { applyLocally: false })
        if (!result.committed) continue
        if (type === 'public') {
          await set(databaseRef(rtdb, openPath(code)), { createdAt: now, wordCount: Number(options.wordCount) || 50 })
        }
        return await joinRoom(code)
      }
      return { ok: false, reason: 'collision' }
    } catch (error) {
      roomError.value = friendlyError(error)
      return { ok: false, reason: 'error', message: roomError.value }
    } finally {
      isBusy.value = false
    }
  }

  const joinPublicRoom = async (passageIndex, options = {}) => {
    if (!auth.currentUser) return { ok: false, reason: 'auth' }
    isBusy.value = true
    try {
      const openSnapshot = await get(databaseRef(rtdb, 'publicMultiplayerRooms'))
      const entries = Object.entries(openSnapshot.val() || {})
        .filter(([, entry]) => Number(entry?.wordCount) === Number(options.wordCount))
        .sort((a, b) => Number(a[1]?.createdAt || 0) - Number(b[1]?.createdAt || 0))

      for (const [code] of entries) {
        const result = await joinRoom(code)
        if (result.ok) return result
        if (['missing', 'expired', 'full', 'started'].includes(result.reason)) {
          await remove(databaseRef(rtdb, openPath(code))).catch(() => {})
        }
      }
      return await createRoom(passageIndex, 'public', options)
    } finally {
      isBusy.value = false
    }
  }

  const resumeRoom = async () => {
    if (!auth.currentUser) return { ok: false, reason: 'auth' }
    let code = localStorage.getItem(ACTIVE_ROOM_KEY)
    if (!code) {
      const snapshot = await get(databaseRef(rtdb, activePath(auth.currentUser.uid))).catch(() => null)
      code = snapshot?.val()?.code
    }
    if (!code) return { ok: false, reason: 'none' }
    const result = await joinRoom(code)
    if (!result.ok) await forgetRoom()
    return result
  }

  const publishProgress = ({ progress = 0, complete = false } = {}) => {
    if (!roomCode.value || !localSeat.value) return
    clearTimeout(progressTimer)
    progressTimer = setTimeout(() => {
      update(databaseRef(rtdb, roomPath(roomCode.value) + '/players/' + localSeat.value), {
        progress: Math.max(0, Math.min(100, Number(progress) || 0)),
        complete: Boolean(complete),
        finishedAt: complete ? serverTimestamp() : null,
        lastActiveAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      }).catch(error => { roomError.value = friendlyError(error) })
    }, PROGRESS_THROTTLE_MS)
  }

  const suspendRoom = async () => {
    if (!roomCode.value || !localSeat.value) return
    intentionallyLeaving = true
    clearListeners()
    await disconnectPlayer?.cancel().catch(() => {})
    await disconnectHost?.cancel().catch(() => {})
    const now = Date.now()
    await update(databaseRef(rtdb, roomPath(roomCode.value) + '/players/' + localSeat.value), {
      connected: false,
      disconnectedAt: now,
      lastSeen: now
    }).catch(() => {})
    if (isHost.value) {
      await set(databaseRef(rtdb, roomPath(roomCode.value) + '/meta/hostDisconnectedAt'), now).catch(() => {})
      scheduleExpiredCleanup(roomCode.value, now + ROOM_GRACE_MS)
    }
    resetLocalRoom()
  }

  const leaveRoom = async () => {
    if (!roomCode.value || !localSeat.value) {
      await forgetRoom()
      resetLocalRoom()
      return
    }
    intentionallyLeaving = true
    clearListeners()
    await disconnectPlayer?.cancel().catch(() => {})
    await disconnectHost?.cancel().catch(() => {})
    const code = roomCode.value
    const wasHost = isHost.value
    const wasPlaying = isPlaying.value
    if (wasPlaying) {
      await update(databaseRef(rtdb, roomPath(code) + '/players/' + localSeat.value), {
        connected: false,
        disconnectedAt: serverTimestamp()
      }).catch(() => {})
    } else {
      await remove(databaseRef(rtdb, roomPath(code) + '/players/' + localSeat.value)).catch(() => {})
    }
    if (wasPlaying) {
      // Keep the departing traveler on the final page so the other clients can
      // record a DNF and preserve an honest finishing order.
    } else if (wasHost) {
      await remove(databaseRef(rtdb, roomPath(code))).catch(() => {})
      await remove(databaseRef(rtdb, openPath(code))).catch(() => {})
    }
    await forgetRoom()
    resetLocalRoom()
  }

  onBeforeUnmount(() => {
    if (!intentionallyLeaving && roomCode.value) void suspendRoom()
    else clearListeners()
  })

  return {
    roomCode,
    room,
    players,
    matchPlayers,
    connectedPlayers,
    localPlayer,
    localSeat,
    isHost,
    isLobby,
    isPlaying,
    hasEnded,
    canStart,
    roomError,
    isBusy,
    connectionState,
    isOnline,
    serverOffset,
    createRoom,
    joinRoom,
    joinPublicRoom,
    resumeRoom,
    startMatch,
    leaveRoom,
    suspendRoom,
    publishProgress
  }
}
