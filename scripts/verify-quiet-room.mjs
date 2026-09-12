import assert from 'node:assert/strict'
import {
  buildSharedPassage,
  canJoinRoom,
  findOpenSeat,
  getConnectedPlayers,
  getRoomPlayers,
  isRoomExpired,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROOM_GRACE_MS,
  ROOM_SLOTS,
  WORD_COUNTS
} from '../src/utils/quietRoomProtocol.js'

assert.equal(MIN_PLAYERS, 2)
assert.equal(MAX_PLAYERS, 5)
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
console.log('Shared Current protocol checks passed.')
