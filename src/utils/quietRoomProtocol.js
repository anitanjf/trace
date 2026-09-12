export const ROOM_CODE_LENGTH = 7
export const ROOM_GRACE_MS = 30_000
export const ROOM_LIFETIME_MS = 6 * 60 * 60 * 1000
export const PUBLIC_START_DELAY_MS = 12_000
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 5
export const WORD_COUNTS = [50, 100, 200]
export const ROOM_SLOTS = ['one', 'two', 'three', 'four', 'five']

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const normalizeRoomCode = value =>
  String(value || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, ROOM_CODE_LENGTH)

export const createRoomCode = () => {
  const values = new Uint32Array(ROOM_CODE_LENGTH)
  globalThis.crypto?.getRandomValues?.(values)
  return Array.from(values, (value, index) =>
    ROOM_ALPHABET[(value || Date.now() + index * 17) % ROOM_ALPHABET.length]
  ).join('')
}

export const buildSharedPassage = (quotes, wordCount, seed = 0) => {
  const count = WORD_COUNTS.includes(Number(wordCount)) ? Number(wordCount) : WORD_COUNTS[0]
  const source = (quotes || [])
    .map(quote => String(quote?.text || '').toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean)

  if (!source.length) return { text: 'breathe gently and begin again', author: 'A Shared Breath' }

  const words = []
  let cursor = Math.abs(Number(seed) || 0) % source.length
  while (words.length < count) {
    words.push(...source[cursor].split(' '))
    cursor = (cursor + 1) % source.length
  }

  const author = count === 50
    ? 'A Short Shared Breath'
    : count === 100
      ? 'A Steady Shared Breath'
      : 'A Deep Shared Exhale'

  return { text: words.slice(0, count).join(' '), author }
}

export const isReservedPlayer = (player, now = Date.now()) => Boolean(
  player?.uid &&
  (player.connected !== false || now - Number(player.disconnectedAt || player.lastSeen || 0) <= ROOM_GRACE_MS)
)

export const getRoomPlayers = (players = {}, now = Date.now()) =>
  ROOM_SLOTS
    .map(seat => ({ seat, ...(players?.[seat] || {}) }))
    .filter(player => isReservedPlayer(player, now))

export const getConnectedPlayers = (players = {}) =>
  ROOM_SLOTS
    .map(seat => ({ seat, ...(players?.[seat] || {}) }))
    .filter(player => player.uid && player.connected !== false)

export const findPlayerSeat = (players = {}, uid) =>
  ROOM_SLOTS.find(seat => players?.[seat]?.uid === uid) || null

export const findOpenSeat = (players = {}, now = Date.now()) =>
  ROOM_SLOTS.find(seat => !isReservedPlayer(players?.[seat], now)) || null

export const isRoomExpired = (meta, now = Date.now()) => {
  if (!meta) return true
  if (Number(meta.expiresAt || 0) <= now) return true
  return Boolean(meta.hostDisconnectedAt) &&
    now > Number(meta.hostDisconnectedAt) + ROOM_GRACE_MS
}

export const canJoinRoom = (room, uid, now = Date.now()) => {
  if (!room?.meta || isRoomExpired(room.meta, now)) return false
  if (findPlayerSeat(room.players, uid)) return true
  return room.meta.status === 'lobby' && Boolean(findOpenSeat(room.players, now))
}

export const calculatePassageProgress = (typedText, passageText) => {
  const total = String(passageText || '').length || 1
  return Math.min(100, Math.round((String(typedText || '').length / total) * 100))
}

export const isPassageComplete = (typedText, passageText) =>
  String(typedText || '').length >= String(passageText || '').length

export const getActiveMembers = (members = {}, now = Date.now(), timeout = ROOM_GRACE_MS) =>
  Object.entries(members || {})
    .filter(([, member]) => member?.uid || now - Number(member?.lastSeen || 0) <= timeout)
    .map(([id, member]) => ({ id, ...member }))
