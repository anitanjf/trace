import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  isEligibleLeaderboardResult,
  leaderboardAlias,
  LEADERBOARD_WORD_COUNTS,
  rankLeaderboard
} from '../src/utils/leaderboard.js'

assert.deepEqual(LEADERBOARD_WORD_COUNTS, [50, 100, 200])
assert.equal(leaderboardAlias('one'), leaderboardAlias('one'))
assert.notEqual(leaderboardAlias('one'), leaderboardAlias('two'))
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: true, wpm: 60, accuracy: 90 }), true)
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: true, wpm: 60, accuracy: 89 }), false)
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: true, wpm: 60, accuracy: 95 }, { one: { reason: 'idle' } }), false)
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: false, wpm: 60, accuracy: 95 }), false)
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: true, wpm: 301, accuracy: 95 }), false)
assert.deepEqual(rankLeaderboard([
  { uid: 'slow', wpm: 50, accuracy: 99, elapsedMs: 40_000 },
  { uid: 'fast', wpm: 70, accuracy: 90, elapsedMs: 50_000 },
  { uid: 'clear', wpm: 70, accuracy: 95, elapsedMs: 50_000 },
  { uid: 'dnf', wpm: 110, accuracy: 20 }
]).map(record => record.uid), ['clear', 'fast', 'slow'])

const rules = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')).rules
assert.deepEqual(rules.multiplayerLeaderboard.$length['.indexOn'], ['wpm'])
assert.match(rules.multiplayerLeaderboard.$length.$uid['.validate'], /multiplayerRooms/)
assert.match(rules.multiplayerLeaderboard.$length.$uid['.write'], /auth\.uid === \$uid/)
console.log('Multiplayer leaderboard checks passed.')
