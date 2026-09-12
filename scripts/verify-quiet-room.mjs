import assert from 'node:assert/strict'
import {
  calculatePassageProgress,
  createProgressMessage,
  createRoomCode,
  getLatencyTone,
  isPassageComplete,
  normalizeRoomCode
} from '../src/utils/quietRoomProtocol.js'

assert.equal(normalizeRoomCode(' ab-c12! '), 'ABC12')
assert.equal(createRoomCode(() => 0), '222222')
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
  roomCode: 'abc123',
  progress: 130,
  complete: true
})
assert.deepEqual(
  Object.keys(message).sort(),
  ['clientId', 'complete', 'progress', 'roomCode', 'sentAt', 'type'].sort()
)
assert.equal(message.progress, 100)
assert.equal(message.roomCode, 'ABC123')
assert.equal('typedText' in message, false)
assert.equal('keystrokes' in message, false)

const channelName = `trace-quiet-room-test-${Date.now()}`
const firstTab = new BroadcastChannel(channelName)
const secondTab = new BroadcastChannel(channelName)
const received = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Two-tab message timed out')), 1_000)
  secondTab.onmessage = event => {
    clearTimeout(timeout)
    resolve(event.data)
  }
})
firstTab.postMessage(message)
assert.deepEqual(await received, message)
firstTab.close()
secondTab.close()

console.log('Trace quiet-room protocol checks passed.')
