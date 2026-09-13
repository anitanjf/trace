import assert from 'node:assert/strict'
import {
  buildSharedPassage,
  canJoinRoom,
  findOpenSeat,
  forfeitReason,
  getConnectedPlayers,
  getMatchPlayers,
  getRoomPlayers,
  isRoomExpired,
  MAX_PLAYERS,
  MATCH_IDLE_MS,
  MIN_PLAYERS,
  PUBLIC_START_DELAY_MS,
  ROOM_GRACE_MS,
  ROOM_SLOTS,
  WORD_COUNTS,
  shouldStartPublicRoom
} from '../src/utils/quietRoomProtocol.js'

assert.equal(MIN_PLAYERS, 2)
assert.equal(MAX_PLAYERS, 5)
assert.equal(MATCH_IDLE_MS, 30_000)
assert.equal(PUBLIC_START_DELAY_MS, 30_000)
assert.deepEqual(ROOM_SLOTS, ['one', 'two', 'three', 'four', 'five'])
assert.deepEqual(WORD_COUNTS, [50, 100, 200])

const quotes = [{ text: 'one two three four five', author: 'Test' }]
for (const count of WORD_COUNTS) {
  assert.equal(buildSharedPassage(quotes, count, 0).text.split(' ').length, count)
}

const now = 100_000
const room = {
  meta: { status: 'lobby', expiresAt: now + 60_000, hostDisconnectedAt: null },
  players: {
    one: { uid: 'host', connected: true, lastSeen: now },
    two: { uid: 'guest', connected: false, disconnectedAt: now - 10_000 }
  }
}
assert.equal(getRoomPlayers(room.players, now).length, 2)
assert.equal(getConnectedPlayers(room.players).length, 1)
assert.equal(findOpenSeat(room.players, now), 'three')
assert.equal(canJoinRoom(room, 'new-user', now), true)
room.meta.hostDisconnectedAt = now - ROOM_GRACE_MS - 1
assert.equal(isRoomExpired(room.meta, now), true)
assert.equal(canJoinRoom(room, 'new-user', now), false)
const publicRoom = {
  meta: { type: 'public', status: 'lobby', startsAt: now + PUBLIC_START_DELAY_MS },
  players: { one: { uid: 'host', connected: true }, two: { uid: 'guest', connected: true } }
}
assert.equal(shouldStartPublicRoom(publicRoom, now + PUBLIC_START_DELAY_MS - 1), false)
assert.equal(shouldStartPublicRoom(publicRoom, now + PUBLIC_START_DELAY_MS), true)
assert.equal(canJoinRoom({ ...publicRoom, meta: { ...publicRoom.meta, expiresAt: now + 60_000 } }, 'third', now + 20_000), true)
publicRoom.players.three = { uid: 'third', connected: true }
publicRoom.players.four = { uid: 'fourth', connected: true }
publicRoom.players.five = { uid: 'fifth', connected: true }
assert.equal(shouldStartPublicRoom(publicRoom, now + PUBLIC_START_DELAY_MS - 1), false)
assert.equal(shouldStartPublicRoom(publicRoom, now + PUBLIC_START_DELAY_MS), true)
publicRoom.players.two.connected = false
delete publicRoom.players.three
delete publicRoom.players.four
delete publicRoom.players.five
assert.equal(shouldStartPublicRoom(publicRoom, now + PUBLIC_START_DELAY_MS), false)

const started = now - MATCH_IDLE_MS
const contestants = {
  one: { uid: 'host', connected: true, lastActiveAt: started },
  two: { uid: 'guest', connected: true, lastActiveAt: now - 1000 },
  three: { uid: 'third', connected: false, disconnectedAt: now - 1000 },
  four: { uid: 'finished', connected: false, complete: true }
}
assert.equal(forfeitReason(contestants.one, started, now - 1), null)
assert.equal(forfeitReason(contestants.one, started, now), 'idle')
assert.equal(forfeitReason(contestants.two, started, now), null)
assert.equal(forfeitReason(contestants.three, started, now), 'disconnected')
assert.equal(forfeitReason(contestants.four, started, now), null)
assert.equal(getMatchPlayers(contestants, { one: { reason: 'idle' }, three: { reason: 'disconnected' } }).length, 2)
assert.equal(isRoomExpired({ status: 'playing', expiresAt: now + 1000, hostDisconnectedAt: started }, now), false)
console.log('Shared Current protocol checks passed.')
