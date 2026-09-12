const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export const normalizeRoomCode = value =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)

export const createRoomCode = (random = Math.random) =>
  Array.from({ length: 6 }, () =>
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
  type: 'progress',
  clientId,
  roomCode: normalizeRoomCode(roomCode),
  progress: Math.max(0, Math.min(100, Number(progress) || 0)),
  complete: Boolean(complete),
  sentAt: Date.now()
})
