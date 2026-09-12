import { computed, onBeforeUnmount, ref } from 'vue'
import {
  get,
  onDisconnect,
  onValue,
  ref as databaseRef,
  remove,
  runTransaction,
  set,
  update
} from 'firebase/database'
import { auth, rtdb } from '../services/firebase'
import {
  createRoomCode,
  getActiveMembers,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
  ROOM_LIFETIME_MS
} from '../utils/quietRoomProtocol'

const HEARTBEAT_MS = 8_000
const PEER_TIMEOUT_MS = 20_000
const PROGRESS_THROTTLE_MS = 180

const createClientId = () =>
  globalThis.crypto?.randomUUID?.().replaceAll('-', '') || `quiet${Date.now()}${Math.random().toString(36).slice(2)}`

const roomErrorMessage = error => {
  const code = String(error?.code || '')
  if (code.includes('PERMISSION_DENIED') || code.includes('permission-denied')) {
    return 'This quiet room could not be opened. Check the database access rules and try again.'
  }
  if (code.includes('NETWORK') || code.includes('unavailable')) {
    return 'The room is resting while the connection returns.'
  }
  return error?.message || 'The quiet room could not be opened.'
}

export const useQuietRoom = () => {
  const clientId = createClientId()
  const roomCode = ref('')
  const roomMeta = ref(null)
  const partner = ref(null)
  const localProgress = ref(0)
  const localComplete = ref(false)
  const connectionState = ref('idle')
  const roomError = ref('')
  const isBusy = ref(false)
  const isOnline = ref(true)

  let heartbeatTimer = null
  let progressTimer = null
  let stopMembers = null
  let stopConnection = null
  let roomDisconnect = null
  let roomRef = null
  let memberRef = null
  let membersRef = null
  let claimRef = null

  const partnerPresent = computed(() => Boolean(partner.value))
  const latencyTone = computed(() => {
    if (!isOnline.value) return 'Returning'
    return partnerPresent.value ? 'Present' : 'Listening'
  })

  const memberPayload = () => ({
    progress: localProgress.value,
    complete: localComplete.value,
    lastSeen: Date.now(),
    joinedAt: Number(roomMeta.value?.joinedAt) || Date.now(),
    schemaVersion: 1
  })

  const clearRuntime = () => {
    clearInterval(heartbeatTimer)
    clearTimeout(progressTimer)
    heartbeatTimer = null
    progressTimer = null
    stopMembers?.()
    stopConnection?.()
    stopMembers = null
    stopConnection = null
  }

  const addMember = async () => {
    if (!roomRef || !membersRef || !memberRef || !claimRef || !auth.currentUser) return { ok: false, reason: 'auth' }
    roomDisconnect = onDisconnect(roomRef)
    await roomDisconnect.update({
      [`members/${clientId}`]: null,
      [`claims/${clientId}`]: null
    })
    await set(claimRef, auth.currentUser.uid)
    try {
      await set(memberRef, memberPayload())
      return { ok: true }
    } catch (error) {
      await remove(claimRef).catch(() => {})
      const members = (await get(membersRef).catch(() => null))?.val() || {}
      if (!members[clientId] && Object.keys(members).length >= 2) return { ok: false, reason: 'full' }
      throw error
    }
  }

  const observeRoom = () => {
    stopMembers = onValue(membersRef, snapshot => {
      const activeMembers = getActiveMembers(snapshot.val(), Date.now(), PEER_TIMEOUT_MS)
      partner.value = activeMembers.find(member => member.id !== clientId) || null
      connectionState.value = !isOnline.value
        ? 'reconnecting'
        : partner.value
          ? 'together'
          : 'waiting'
    }, error => {
      roomError.value = roomErrorMessage(error)
      connectionState.value = 'error'
    })

    const connectedRef = databaseRef(rtdb, '.info/connected')
    stopConnection = onValue(connectedRef, async snapshot => {
      isOnline.value = snapshot.val() !== false
      if (!isOnline.value) {
        connectionState.value = 'reconnecting'
        return
      }
      if (!roomCode.value) return
      try {
        const result = await addMember()
        if (!result.ok && result.reason === 'full') {
          roomError.value = 'This room already holds two travelers.'
          connectionState.value = 'error'
        }
      } catch (error) {
        roomError.value = roomErrorMessage(error)
      }
    })

    heartbeatTimer = setInterval(() => {
      if (!memberRef || !isOnline.value) return
      update(memberRef, { lastSeen: Date.now() }).catch(error => {
        roomError.value = roomErrorMessage(error)
      })
    }, HEARTBEAT_MS)
  }

  const leaveRoom = async () => {
    clearRuntime()
    try {
      await roomDisconnect?.cancel()
      if (memberRef) await remove(memberRef)
      if (claimRef) await remove(claimRef)
    } catch {
      // onDisconnect still removes the member if the network has already gone away.
    }
    roomDisconnect = null
    roomRef = null
    memberRef = null
    membersRef = null
    claimRef = null
    partner.value = null
    roomMeta.value = null
    roomError.value = ''
    connectionState.value = 'idle'
    roomCode.value = ''
    localProgress.value = 0
    localComplete.value = false
    isBusy.value = false
  }

  const joinRoom = async rawCode => {
    const code = normalizeRoomCode(rawCode)
    roomError.value = ''
    if (!auth.currentUser) return { ok: false, reason: 'auth' }
    if (code.length !== ROOM_CODE_LENGTH) return { ok: false, reason: 'invalid' }

    await leaveRoom()
    isBusy.value = true
    try {
      const metaRef = databaseRef(rtdb, `quietRooms/${code}/meta`)
      const metaSnapshot = await get(metaRef)
      const meta = metaSnapshot.val()
      if (!meta) return { ok: false, reason: 'missing' }
      if (Number(meta.expiresAt) <= Date.now()) return { ok: false, reason: 'expired' }

      roomCode.value = code
      roomMeta.value = { ...meta, joinedAt: Date.now() }
      roomRef = databaseRef(rtdb, `quietRooms/${code}`)
      membersRef = databaseRef(rtdb, `quietRooms/${code}/members`)
      memberRef = databaseRef(rtdb, `quietRooms/${code}/members/${clientId}`)
      claimRef = databaseRef(rtdb, `quietRooms/${code}/claims/${clientId}`)
      const result = await addMember()
      if (!result.ok) {
        await leaveRoom()
        return result
      }

      connectionState.value = 'waiting'
      observeRoom()
      return { ok: true, code, passageIndex: Number(meta.passageIndex) || 0 }
    } catch (error) {
      const message = roomErrorMessage(error)
      await leaveRoom()
      roomError.value = message
      return { ok: false, reason: 'error', message }
    } finally {
      isBusy.value = false
    }
  }

  const createRoom = async passageIndex => {
    roomError.value = ''
    if (!auth.currentUser) return { ok: false, reason: 'auth' }
    isBusy.value = true
    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const code = createRoomCode()
        const now = Date.now()
        const metaRef = databaseRef(rtdb, `quietRooms/${code}/meta`)
        const result = await runTransaction(metaRef, current => {
          if (current) return
          return {
            createdAt: now,
            expiresAt: now + ROOM_LIFETIME_MS,
            passageIndex: Math.max(0, Number(passageIndex) || 0),
            schemaVersion: 1
          }
        }, { applyLocally: false })
        if (result.committed) return await joinRoom(code)
      }
      return { ok: false, reason: 'collision' }
    } catch (error) {
      roomError.value = roomErrorMessage(error)
      return { ok: false, reason: 'error', message: roomError.value }
    } finally {
      isBusy.value = false
    }
  }

  const publishProgress = (progress, complete) => {
    if (!memberRef) return
    localProgress.value = Math.max(0, Math.min(100, Number(progress) || 0))
    localComplete.value = Boolean(complete)
    clearTimeout(progressTimer)
    progressTimer = setTimeout(() => {
      update(memberRef, {
        progress: localProgress.value,
        complete: localComplete.value,
        lastSeen: Date.now()
      }).catch(error => { roomError.value = roomErrorMessage(error) })
    }, PROGRESS_THROTTLE_MS)
  }

  onBeforeUnmount(() => { void leaveRoom() })

  return {
    roomCode,
    roomMeta,
    partner,
    partnerPresent,
    latencyTone,
    connectionState,
    roomError,
    isBusy,
    createRoom,
    joinRoom,
    leaveRoom,
    publishProgress
  }
}
