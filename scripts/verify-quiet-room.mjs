import assert from 'node:assert/strict'
import {
  canJoinRoom,
  findOpenSeat,
  getConnectedPlayers,
  getRoomPlayers,
  isRoomExpired,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROOM_GRACE_MS,
  ROOM_SLOTS
} from '../src/utils/quietRoomProtocol.js'

assert.equal(MIN_PLAYERS, 2)
assert.equal(MAX_PLAYERS, 5)
assert.deepEqual(ROOM_SLOTS, ['one', 'two', 'three', 'four', 'five'])

const now = 100_000
const room = {
  meta: { status: 'lobby', expiresAt: now + 60_000, hostDisconnectedAt: null },
  players: {
    one: { uid: 'host', connected: true, lastSeen: now },
    two: { uid: 'guest', connected: false, disconnectedAt: now - 10_000 }
  }
}

assert.equal(getRoomPlayers(room.players, now).length, 2, 'grace-period seat remains reserved')
assert.equal(getConnectedPlayers(room.players).length, 1)
assert.equal(findOpenSeat(room.players, now), 'three')
assert.equal(canJoinRoom(room, 'new-user', now), true)

room.meta.hostDisconnectedAt = now - ROOM_GRACE_MS - 1
assert.equal(isRoomExpired(room.meta, now), true)
assert.equal(canJoinRoom(room, 'new-user', now), false)

room.meta.hostDisconnectedAt = null
room.players.two.disconnectedAt = now - ROOM_GRACE_MS - 1
assert.equal(findOpenSeat(room.players, now), 'two', 'stale seat can be reclaimed')

console.log('Shared Current protocol checks passed.')
