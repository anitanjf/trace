import { computed, onBeforeUnmount, ref } from 'vue'
import { createProgressMessage, getLatencyTone, normalizeRoomCode } from '../utils/quietRoomProtocol'

const HEARTBEAT_MS = 2_000
const PEER_TIMEOUT_MS = 7_000

const createClientId = () =>
  globalThis.crypto?.randomUUID?.() || `quiet-${Date.now()}-${Math.random().toString(36).slice(2)}`

export const useQuietRoom = () => {
  const clientId = createClientId()
  const roomCode = ref('')
  const partner = ref(null)
  const localProgress = ref(0)
  const localComplete = ref(false)
  const latencyMs = ref(null)
  const connectionState = ref('idle')
  let channel = null
  let heartbeatTimer = null
  let peerTimer = null
  let pingTimer = null

  const partnerPresent = computed(() =>
    Boolean(partner.value && Date.now() - partner.value.lastSeen < PEER_TIMEOUT_MS)
  )
  const latencyTone = computed(() => getLatencyTone(latencyMs.value))

  const send = message => channel?.postMessage({
    ...message,
    clientId,
    roomCode: roomCode.value,
    sentAt: Date.now()
  })

  const rememberPartner = message => {
    partner.value = {
      id: message.clientId,
      progress: message.progress === undefined
        ? Number(partner.value?.progress) || 0
        : Math.max(0, Math.min(100, Number(message.progress) || 0)),
      complete: message.complete === undefined
        ? Boolean(partner.value?.complete)
        : Boolean(message.complete),
      lastSeen: Date.now()
    }
    connectionState.value = 'together'
  }

  const handleMessage = event => {
    const message = event.data || {}
    if (message.roomCode !== roomCode.value || message.clientId === clientId) return

    if (message.type === 'hello') {
      rememberPartner(message)
      send({ type: 'presence', progress: localProgress.value, complete: localComplete.value })
    } else if (message.type === 'presence' || message.type === 'heartbeat' || message.type === 'progress') {
      rememberPartner(message)
    } else if (message.type === 'leave') {
      partner.value = null
      connectionState.value = 'waiting'
    } else if (message.type === 'ping') {
      send({ type: 'pong', pingId: message.pingId, pingSentAt: message.pingSentAt })
    } else if (message.type === 'pong' && message.pingId) {
      latencyMs.value = Math.max(0, Date.now() - Number(message.pingSentAt || Date.now()))
      rememberPartner(message)
    }
  }

  const leaveRoom = () => {
    send({ type: 'leave' })
    clearInterval(heartbeatTimer)
    clearInterval(peerTimer)
    clearInterval(pingTimer)
    heartbeatTimer = null
    peerTimer = null
    pingTimer = null
    channel?.close()
    channel = null
    partner.value = null
    latencyMs.value = null
    connectionState.value = 'idle'
    roomCode.value = ''
    localProgress.value = 0
    localComplete.value = false
  }

  const joinRoom = rawCode => {
    const code = normalizeRoomCode(rawCode)
    if (code.length !== 6 || typeof BroadcastChannel === 'undefined') return false
    leaveRoom()
    roomCode.value = code
    channel = new BroadcastChannel(`trace-quiet-room:${code}`)
    channel.addEventListener('message', handleMessage)
    connectionState.value = 'waiting'
    send({ type: 'hello', progress: 0, complete: false })

    heartbeatTimer = setInterval(() => send({
      type: 'heartbeat',
      progress: localProgress.value,
      complete: localComplete.value
    }), HEARTBEAT_MS)
    peerTimer = setInterval(() => {
      if (partner.value && Date.now() - partner.value.lastSeen >= PEER_TIMEOUT_MS) {
        partner.value = null
        connectionState.value = 'waiting'
      }
    }, HEARTBEAT_MS)
    pingTimer = setInterval(() => {
      const pingSentAt = Date.now()
      send({ type: 'ping', pingId: `${clientId}:${pingSentAt}`, pingSentAt })
    }, HEARTBEAT_MS)
    return true
  }

  const publishProgress = (progress, complete) => {
    if (!channel) return
    localProgress.value = progress
    localComplete.value = complete
    const message = createProgressMessage({
      clientId,
      roomCode: roomCode.value,
      progress,
      complete
    })
    channel.postMessage(message)
  }

  onBeforeUnmount(leaveRoom)

  return {
    roomCode,
    partner,
    partnerPresent,
    latencyMs,
    latencyTone,
    connectionState,
    joinRoom,
    leaveRoom,
    publishProgress
  }
}
