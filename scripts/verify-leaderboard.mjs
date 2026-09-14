import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import {
  isEligibleLeaderboardResult,
  leaderboardAlias,
  leaderboardDisplayName,
  LEADERBOARD_LIMIT,
  LEADERBOARD_WORD_COUNTS,
  MIN_LEADERBOARD_ACCURACY,
  nextLeaderboardRecord,
  rankLeaderboard
} from '../src/utils/leaderboard.js'
import { countryFlag, countryName, countryOptions, isCountryCode } from '../src/utils/countries.js'

assert.deepEqual(LEADERBOARD_WORD_COUNTS, [50, 100, 200])
assert.equal(LEADERBOARD_LIMIT, 100)
assert.equal(MIN_LEADERBOARD_ACCURACY, 80)
assert.equal(leaderboardAlias('one'), leaderboardAlias('one'))
assert.notEqual(leaderboardAlias('one'), leaderboardAlias('two'))
assert.equal(leaderboardDisplayName('one', { isAnonymous: false }, 'June'), 'June')
assert.equal(leaderboardDisplayName('one', { isAnonymous: true, alias: 'River' }, 'June'), 'River')
assert.equal(leaderboardDisplayName('one', { isAnonymous: true }, 'June'), leaderboardAlias('one'))
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: true, wpm: 60, accuracy: 80 }), true)
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: true, wpm: 60, accuracy: 79 }), false)
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: true, wpm: 60, accuracy: 101 }), false)
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: true, wpm: 60, accuracy: 95 }, { one: { reason: 'idle' } }), false)
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: false, wpm: 60, accuracy: 95 }), false)
assert.equal(isEligibleLeaderboardResult({ uid: 'one', seat: 'one', complete: true, wpm: 301, accuracy: 95 }), false)
const player = { uid: 'one', seat: 'one', complete: true, wpm: 80, accuracy: 81, elapsedMs: 2000 }
const first = nextLeaderboardRecord(null, 'ABCDEFG', 100, player, { displayName: 'River', countryCode: '' })
assert.equal(first.wpm, 80)
assert.equal(first.accuracy, 81)
assert.equal('matches' in first, false)
assert.equal(nextLeaderboardRecord(first, 'ABCDEFG', 101, player, {}), undefined)
assert.equal(nextLeaderboardRecord(first, 'BCDEFGH', 102, { ...player, wpm: 60, accuracy: 99 }, {}), undefined)
assert.equal(nextLeaderboardRecord(first, 'BCDEFGH', 102, { ...player, wpm: 90, accuracy: 79 }, {}), undefined)
const faster = nextLeaderboardRecord(first, 'BCDEFGH', 102, { ...player, wpm: 90, accuracy: 80 }, { displayName: 'River', countryCode: 'PH' })
assert.deepEqual([faster.wpm, faster.accuracy, faster.countryCode], [90, 80, 'PH'])
assert.equal(nextLeaderboardRecord(first, 'BCDEFGH', 102, { ...player, accuracy: 90 }, {}).accuracy, 90)
assert.equal(nextLeaderboardRecord(first, 'BCDEFGH', 102, { ...player, elapsedMs: 1900 }, {}).elapsedMs, 1900)
assert.equal(nextLeaderboardRecord(first, 'BCDEFGH', 102, player, {}), undefined)
assert.deepEqual(rankLeaderboard([
  { uid: 'slow', wpm: 50, accuracy: 99, elapsedMs: 40_000 },
  { uid: 'fast', wpm: 70, accuracy: 90, elapsedMs: 50_000 },
  { uid: 'clear', wpm: 70, accuracy: 95, elapsedMs: 50_000 },
  { uid: 'dnf', wpm: 110, accuracy: 20 },
  { uid: 'eligible', wpm: 40, accuracy: 80 }
]).map(record => record.uid), ['clear', 'fast', 'slow', 'eligible'])
assert.deepEqual(rankLeaderboard([
  { uid: 'fast', wpm: 90, accuracy: 83 },
  { uid: 'clear', wpm: 55, accuracy: 99 }
], 'clarity').map(record => record.uid), ['clear', 'fast'])
assert.equal(rankLeaderboard(Array.from({ length: 105 }, (_, i) => ({ uid: `person-${i}`, wpm: i + 1, accuracy: 85 }))).length, 100)
assert.equal(isCountryCode(''), true)
assert.equal(isCountryCode('PH'), true)
assert.equal(isCountryCode('ZZ'), false)
assert.equal(countryFlag('PH'), '🇵🇭')
assert.equal(countryFlag(''), '')
assert.equal(countryName('PH'), 'Philippines')
assert.equal(countryOptions.length, 249)

const rules = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')).rules
assert.deepEqual(rules.multiplayerLeaderboard.$length['.indexOn'], ['wpm', 'accuracy'])
assert.match(rules.multiplayerLeaderboard.$length.$uid['.validate'], /multiplayerRooms/)
assert.match(rules.multiplayerLeaderboard.$length.$uid['.validate'], /accuracy'\)\.val\(\) >= 80/)
assert.doesNotMatch(rules.multiplayerLeaderboard.$length.$uid['.validate'], /totalWpm/)
assert.match(rules.multiplayerLeaderboard.$length.$uid['.validate'], /countryCode/)
assert.match(rules.multiplayerLeaderboard.$length.$uid['.write'], /auth\.uid === \$uid/)

// Check the proposed database payload against the same expressions we publish.
// This is a local rules check, not a substitute for the Firebase emulator.
const leaderboardRule = rules.multiplayerLeaderboard.$length.$uid
const snapshot = value => ({
  val: () => value,
  exists: () => value !== undefined && value !== null,
  isString: () => typeof value === 'string',
  isNumber: () => typeof value === 'number',
  hasChildren: keys => keys.every(key => Object.hasOwn(value, key)),
  child: path => snapshot(String(path).split('/').reduce((child, key) => child?.[key], value))
})
const canWrite = (entry, room, previous = null) => {
  const context = {
    root: snapshot({ multiplayerRooms: { ABCDEFG: room } }),
    newData: snapshot(entry), data: snapshot(previous),
    auth: { uid: 'player-one' }, $uid: 'player-one', $length: '50'
  }
  runInNewContext('String.prototype.matches = function (pattern) { return pattern.test(this) }', context)
  return Boolean(runInNewContext(leaderboardRule['.write'], context) &&
    runInNewContext(leaderboardRule['.validate'], context))
}
const testRoom = { meta: { status: 'ended', wordCount: 50 }, players: {
  one: { uid: 'player-one', complete: true, wpm: 46, accuracy: 85, elapsedMs: 66000 }
} }
const testEntry = { roomCode: 'ABCDEFG', seat: 'one', wpm: 46, accuracy: 85,
  elapsedMs: 66000, recordedAt: 123456, displayName: 'Quiet River', countryCode: '' }
assert.equal(canWrite(testEntry, testRoom), true)
assert.equal(canWrite({ ...testEntry, accuracy: 79 }, testRoom), false)
assert.equal(canWrite({ ...testEntry, wpm: 47 }, testRoom), false)
assert.equal(canWrite(testEntry, { ...testRoom, players: { one: { ...testRoom.players.one, uid: 'someone-else' } } }), false)
console.log('Multiplayer leaderboard checks passed.')
