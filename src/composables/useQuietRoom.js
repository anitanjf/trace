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
import { auth, rtdb } from '../services/firebase'
import {
  canJoinRoom,
  createRoomCode,
  findOpenSeat,
  findPlayerSeat,
  getConnectedPlayers,
  getRoomPlayers,
  isRoomExpired,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PUBLIC_START_DELAY_MS,
  ROOM_CODE_LENGTH,
  ROOM_GRACE_MS,
  ROOM_LIFETIME_MS,
  ROOM_SLOTS,
  normalizeRoomCode
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

  let stopRoom = null
  let stopConnection = null
  let disconnectPlayer = null
  let disconnectHost = null
  let progressTimer = null
  let publicStartTimer = null
  let cleanupTimer = null
  let intentionallyLeaving = false

  const players = computed(() => getRoomPlayers(room.value?.players))
  const connectedPlayers = computed(() => getConnectedPlayers(room.value?.players))
  const localPlayer = computed(() => room.value?.players?.[localSeat.value] || null)
  const isHost = computed(() => room.value?.meta?.hostUid === auth.currentUser?.uid)
  const isLobby = computed(() => room.value?.meta?.status === 'lobby')
  const isPlaying = computed(() => room.value?.meta?.status === 'playing')
  const hasEnded = computed(() => room.value?.meta?.status === 'ended')
  const canStart = computed(() => isHost.value && isLobby.value && connectedPlayers.value.length >= MIN_PLAYERS)

  const clearListeners = () => {
    stopRoom?.()
    stopConnection?.()
    stopRoom = null
    stopConnection = null
    clearTimeout(progressTimer)
    clearTimeout(publicStartTimer)
    progressTimer = null
    publicStartTimer = null
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

  const playerPayload = seat => ({
    uid: auth.currentUser.uid,
    name: PLAYER_NAMES[seat],
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

    if (count >= MIN_PLAYERS && !startsAt) {
      const deadline = Date.now() + (count >= MAX_PLAYERS ? 1_000 : PUBLIC_START_DELAY_MS)
      set(databaseRef(rtdb, roomPath(roomCode.value) + '/meta/startsAt'), deadline).catch(() => {})
      return
    }
    if (count < MIN_PLAYERS || !startsAt) return

    clearTimeout(publicStartTimer)
    publicStartTimer = setTimeout(async () => {
      const snapshot = await get(databaseRef(rtdb, roomPath(roomCode.value))).catch(() => null)
      const current = snapshot?.val()
      if (current?.meta?.status === 'lobby' && getConnectedPlayers(current.players).length >= MIN_PLAYERS) {
        await update(databaseRef(rtdb, roomPath(roomCode.value) + '/meta'), {
          status: 'playing',
          startedAt: serverTimestamp(),
          startsAt: null
        }).catch(() => {})
        await remove(databaseRef(rtdb, openPath(roomCode.value))).catch(() => {})
      }
    }, Math.max(0, startsAt - Date.now()))
  }

  const observeRoom = () => {
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

      if (nextRoom.meta.status === 'playing') {
        if (connected.length < MIN_PLAYERS) {
          void endMatch('traveler-left')
        } else if (connected.length > 0 && connected.every(player => player.complete)) {
          void endMatch('complete')
        }
      }
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
      if (!seat) {
        if (!canJoinRoom(current, auth.currentUser.uid)) return {
          ok: false,
          reason: current.meta.status === 'lobby' ? 'full' : 'started'
        }
        const candidates = [...ROOM_SLOTS]
        let claimed = false
        for (const candidate of candidates) {
          const seatRef = databaseRef(rtdb, roomPath(code) + '/players/' + candidate)
          const result = await runTransaction(seatRef, value => {
            const stale = value?.uid && value.connected === false &&
              Date.now() - Number(value.disconnectedAt || value.lastSeen || 0) > ROOM_GRACE_MS
            if (value?.uid && !stale) return
            return playerPayload(candidate)
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
      await rememberRoom(code)
      await attachPresence()
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
            one: playerPayload('one')
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
    await remove(databaseRef(rtdb, roomPath(code) + '/players/' + localSeat.value)).catch(() => {})
    if (wasPlaying) {
      const snapshot = await get(databaseRef(rtdb, roomPath(code))).catch(() => null)
      if (snapshot?.exists() && getConnectedPlayers(snapshot.val()?.players).length < MIN_PLAYERS) {
        await update(databaseRef(rtdb, roomPath(code) + '/meta'), {
          status: 'ended',
          endedReason: 'traveler-left',
          endedAt: serverTimestamp()
        }).catch(() => {})
      }
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
