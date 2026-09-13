import { get, limitToLast, onValue, orderByChild, query, ref as databaseRef, set } from 'firebase/database'
import { auth, rtdb } from './firebase'
import { isEligibleLeaderboardResult, LEADERBOARD_WORD_COUNTS } from '../utils/leaderboard'

const boardPath = (count, uid) => `multiplayerLeaderboard/${count}/${uid}`

export const publishPersonalBest = async (room, roomCode, player) => {
  const count = Number(room?.meta?.wordCount)
  const uid = auth.currentUser?.uid
  if (!uid || uid !== player?.uid || room?.meta?.status !== 'ended' ||
      !LEADERBOARD_WORD_COUNTS.includes(count) || !isEligibleLeaderboardResult(player, room?.meta?.forfeits) ||
      !Number.isFinite(Number(room?.meta?.endedAt))) return false

  const target = databaseRef(rtdb, boardPath(count, uid))
  const previous = (await get(target)).val()
  const wpm = Number(player.wpm)
  const accuracy = Number(player.accuracy)
  if (previous && (Number(previous.wpm) > wpm ||
      (Number(previous.wpm) === wpm && Number(previous.accuracy) >= accuracy))) return false

  await set(target, {
    roomCode,
    seat: player.seat,
    wpm,
    accuracy,
    elapsedMs: Number(player.elapsedMs) || 0,
    recordedAt: Number(room.meta.endedAt)
  })
  return true
}

export const subscribeLeaderboard = (wordCount, onRecords, onError) => {
  if (!LEADERBOARD_WORD_COUNTS.includes(Number(wordCount))) throw new Error('Unknown passage length')
  const topRecords = query(databaseRef(rtdb, `multiplayerLeaderboard/${wordCount}`), orderByChild('wpm'), limitToLast(100))
  return onValue(topRecords, snapshot => {
    onRecords(Object.entries(snapshot.val() || {}).map(([uid, result]) => ({ uid, ...result })))
  }, onError)
}
