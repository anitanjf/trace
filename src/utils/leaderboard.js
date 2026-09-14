export const LEADERBOARD_WORD_COUNTS = [50, 100, 200]
export const MIN_LEADERBOARD_ACCURACY = 80
export const LEADERBOARD_LIMIT = 100

const firstWords = ['Still', 'Quiet', 'Soft', 'Warm', 'Gentle', 'Dawn', 'Silver', 'Wandering']
const secondWords = ['Pine', 'River', 'Rain', 'Cedar', 'Mist', 'Lotus', 'Willow', 'Star']

// A stable public name that never discloses the player's account or room alias.
export const leaderboardAlias = uid => {
  let hash = 2166136261
  for (const char of String(uid || '')) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  const value = hash >>> 0
  return `${firstWords[value % firstWords.length]} ${secondWords[Math.floor(value / firstWords.length) % secondWords.length]} · ${String(Math.floor(value / 64) % 100).padStart(2, '0')}`
}

// Never publish an account name when the player opted to hide their identity.
export const leaderboardDisplayName = (uid, profile, accountName) => {
  const preferred = profile?.isAnonymous ? profile.alias : accountName
  return String(preferred || '').trim().replace(/\s+/g, ' ').slice(0, 36) || leaderboardAlias(uid)
}

export const isEligibleLeaderboardResult = (player, forfeits = {}) => Boolean(
  player?.uid && player?.seat && player.complete && !forfeits[player.seat] &&
  Number(player.wpm) > 0 && Number(player.wpm) <= 300 &&
  Number(player.accuracy) >= MIN_LEADERBOARD_ACCURACY && Number(player.accuracy) <= 100
)

// Retain the fastest qualifying match; clarity and elapsed time break ties.
export const nextLeaderboardRecord = (previous, roomCode, endedAt, player, identity) => {
  if (!isEligibleLeaderboardResult(player)) return undefined
  const wpm = Number(player.wpm)
  const accuracy = Number(player.accuracy)
  const elapsedMs = Number(player.elapsedMs) || 0
  if (previous && (previous.roomCode === roomCode ||
    wpm < Number(previous.wpm) ||
    (wpm === Number(previous.wpm) && (accuracy < Number(previous.accuracy) ||
      (accuracy === Number(previous.accuracy) && elapsedMs >= Number(previous.elapsedMs)))))) return undefined
  return { roomCode, seat: player.seat, wpm, accuracy, elapsedMs, recordedAt: endedAt, ...identity }
}

export const rankLeaderboard = (records = [], sortBy = 'wpm') => [...records]
  .filter(record => record?.uid && Number.isFinite(Number(record.wpm)) && Number(record.wpm) > 0 &&
    Number(record.accuracy) >= MIN_LEADERBOARD_ACCURACY && Number(record.accuracy) <= 100)
  .sort((a, b) => (sortBy === 'clarity'
    ? Number(b.accuracy) - Number(a.accuracy) || Number(b.wpm) - Number(a.wpm)
    : Number(b.wpm) - Number(a.wpm) || Number(b.accuracy) - Number(a.accuracy)) ||
    Number(a.elapsedMs || 0) - Number(b.elapsedMs || 0) || String(a.uid).localeCompare(String(b.uid)))
  .slice(0, LEADERBOARD_LIMIT)
