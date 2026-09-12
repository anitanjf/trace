import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  calculatePassageProgress,
  createProgressMessage,
  createRoomCode,
  getActiveMembers,
  getLatencyTone,
  isPassageComplete,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
  ROOM_LIFETIME_MS
} from '../src/utils/quietRoomProtocol.js'

assert.equal(normalizeRoomCode(' ab-c23-de! '), 'ABC23DE')
assert.equal(createRoomCode(() => 0), '2'.repeat(ROOM_CODE_LENGTH))
assert.equal(ROOM_CODE_LENGTH, 8)
assert.equal(ROOM_LIFETIME_MS, 14_400_000)
assert.equal(calculatePassageProgress('quiet', 'quiet water'), 45)
assert.equal(calculatePassageProgress('quxet', 'quiet water'), 36)
assert.equal(isPassageComplete('quiet', 'quiet'), true)
assert.equal(isPassageComplete('quiet ', 'quiet'), false)
assert.equal(getLatencyTone(Number.NaN), 'Listening')
assert.equal(getLatencyTone(80), 'Near')
assert.equal(getLatencyTone(180), 'Gentle delay')
assert.equal(getLatencyTone(420), 'Distant')

const message = createProgressMessage({
  clientId: 'private-client',
  roomCode: 'abc23456',
  progress: 130,
  complete: true
})
assert.deepEqual(
  Object.keys(message).sort(),
  ['clientId', 'complete', 'progress', 'roomCode', 'sentAt'].sort()
)
assert.equal(message.progress, 100)
assert.equal(message.roomCode, 'ABC23456')
assert.equal('typedText' in message, false)
assert.equal('keystrokes' in message, false)
assert.equal('uid' in message, false)

const active = getActiveMembers({
  first: { progress: 32, complete: false, lastSeen: 99_000 },
  second: { progress: 140, complete: true, lastSeen: 98_000 },
  stale: { progress: 70, complete: false, lastSeen: 70_000 }
}, 100_000, 20_000)
assert.deepEqual(active, [
  { id: 'first', progress: 32, complete: false, lastSeen: 99_000 },
  { id: 'second', progress: 100, complete: true, lastSeen: 98_000 }
])

const databaseRulesSource = readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')
const databaseRules = JSON.parse(databaseRulesSource)
assert.equal(databaseRulesSource.includes('numChildren'), false)
assert.ok(databaseRules.rules.quietRooms.$roomId.members.$slot)
assert.ok(databaseRules.rules.quietRooms.$roomId.claims.$slot)
assert.ok(databaseRules.rules.quietRooms.$roomId.claims.$slot['.write'].includes('now - 24000'))

console.log('Trace online quiet-room protocol checks passed.')
