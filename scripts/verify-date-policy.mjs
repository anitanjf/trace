import assert from 'node:assert/strict'
import {
  createDailyClaimId,
  getDateKey,
  getNextLocalMidnight,
  migrateLegacyDailyDate,
  selectDailyPassage
} from '../src/utils/datePolicy.js'

const beforeManilaMidnight = new Date('2026-09-12T15:59:59.999Z')
const atManilaMidnight = new Date('2026-09-12T16:00:00.000Z')
assert.equal(getDateKey(beforeManilaMidnight, 'Asia/Manila'), '2026-09-12')
assert.equal(getDateKey(atManilaMidnight, 'Asia/Manila'), '2026-09-13')

const beforeNewYorkMidnight = new Date('2026-09-13T03:59:59.999Z')
const atNewYorkMidnight = new Date('2026-09-13T04:00:00.000Z')
assert.equal(getDateKey(beforeNewYorkMidnight, 'America/New_York'), '2026-09-12')
assert.equal(getDateKey(atNewYorkMidnight, 'America/New_York'), '2026-09-13')

assert.equal(createDailyClaimId('2026-09-13'), 'daily:2026-09-13')

const passages = [
  { text: 'Water remembers the shape of every stone.', author: 'Trace' },
  { text: 'Breathe before the next word arrives.', author: 'Trace' },
  { text: 'Stillness leaves room for attention.', author: 'Trace' }
]
const forward = selectDailyPassage('2026-09-13', passages, [])
const reversed = selectDailyPassage('2026-09-13', [...passages].reverse(), [])
assert.deepEqual(forward, reversed)
assert.equal(forward.dateKey, '2026-09-13')
assert.equal(forward.source, 'collection')
assert.match(forward.passageId, /^daily:2026-09-13:passage:/)

const fallback = selectDailyPassage('2026-09-13', [], passages)
assert.equal(fallback.source, 'fallback')
assert.match(fallback.passageId, /^daily:2026-09-13:passage:/)

const migrationNow = new Date('2026-09-12T16:30:00.000Z')
const currentUtcOrdinal = Math.floor(migrationNow.getTime() / 86_400_000)
assert.equal(migrateLegacyDailyDate(currentUtcOrdinal, migrationNow, 'Asia/Manila'), '2026-09-13')
assert.equal(migrateLegacyDailyDate('2026-09-11', migrationNow, 'Asia/Manila'), '2026-09-11')

const localNow = new Date(2026, 8, 12, 23, 59, 59)
const nextReset = getNextLocalMidnight(localNow)
assert.equal(nextReset.getHours(), 0)
assert.equal(nextReset.getMinutes(), 0)
assert.equal(nextReset.getDate(), 13)

console.log('Trace daily date policy checks passed.')
