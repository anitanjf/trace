export const LEADERBOARD_WORD_COUNTS = [50, 100, 200]
export const MIN_LEADERBOARD_ACCURACY = 90

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

export const isEligibleLeaderboardResult = (player, forfeits = {}) => Boolean(
  player?.uid && player?.seat && player.complete && !forfeits[player.seat] &&
  Number(player.wpm) > 0 && Number(player.wpm) <= 300 && Number(player.accuracy) >= MIN_LEADERBOARD_ACCURACY
)

export const rankLeaderboard = (records = []) => [...records]
  .filter(record => record?.uid && Number.isFinite(Number(record.wpm)) && Number(record.wpm) > 0 &&
    Number(record.accuracy) >= MIN_LEADERBOARD_ACCURACY)
  .sort((a, b) => Number(b.wpm) - Number(a.wpm) || Number(b.accuracy) - Number(a.accuracy) ||
    Number(a.elapsedMs) - Number(b.elapsedMs) || String(a.uid).localeCompare(String(b.uid)))
