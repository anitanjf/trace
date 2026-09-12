const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const ROOM_CODE_LENGTH = 8
export const ROOM_LIFETIME_MS = 4 * 60 * 60 * 1000
const secureRandom = () => {
  if (!globalThis.crypto?.getRandomValues) return Math.random()
  const value = new Uint32Array(1)
  globalThis.crypto.getRandomValues(value)
  return value[0] / 2 ** 32
}

export const normalizeRoomCode = value =>
  String(value || '')
    .toUpperCase()
    .replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '')
    .slice(0, ROOM_CODE_LENGTH)

export const createRoomCode = (random = secureRandom) =>
  Array.from({ length: ROOM_CODE_LENGTH }, () =>
    ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)]
  ).join('')

export const calculatePassageProgress = (typedText, passageText) => {
  const passage = String(passageText || '')
  if (!passage.length) return 0

  const typed = String(typedText || '').slice(0, passage.length)
  let matched = 0
  for (let index = 0; index < typed.length; index += 1) {
    if (typed[index] === passage[index]) matched += 1
  }
  return Math.round((matched / passage.length) * 100)
}

export const isPassageComplete = (typedText, passageText) =>
  String(typedText || '') === String(passageText || '')

export const getLatencyTone = latencyMs => {
  if (!Number.isFinite(latencyMs)) return 'Listening'
  if (latencyMs < 120) return 'Near'
  if (latencyMs < 300) return 'Gentle delay'
  return 'Distant'
}

export const createProgressMessage = ({ clientId, roomCode, progress, complete }) => ({
  clientId,
  roomCode: normalizeRoomCode(roomCode),
  progress: Math.max(0, Math.min(100, Number(progress) || 0)),
  complete: Boolean(complete),
  sentAt: Date.now()
})

export const getActiveMembers = (members, now = Date.now(), timeoutMs = 20_000) =>
  Object.entries(members || {})
    .filter(([, member]) => member && now - Number(member.lastSeen || 0) < timeoutMs)
    .map(([id, member]) => ({
      id,
      progress: Math.max(0, Math.min(100, Number(member.progress) || 0)),
      complete: Boolean(member.complete),
      lastSeen: Number(member.lastSeen) || 0
    }))
