import { get, limitToLast, onValue, orderByChild, query, ref as databaseRef, runTransaction } from 'firebase/database'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, rtdb } from './firebase'
import { isCountryCode } from '../utils/countries'
import { isEligibleLeaderboardResult, leaderboardDisplayName, LEADERBOARD_LIMIT, LEADERBOARD_WORD_COUNTS, nextLeaderboardRecord } from '../utils/leaderboard'

const boardPath = (count, uid) => `multiplayerLeaderboard/${count}/${uid}`

const publicIdentity = (uid, profile, accountName) => ({
  displayName: leaderboardDisplayName(uid, profile, accountName),
  countryCode: isCountryCode(profile?.countryCode) ? profile.countryCode : ''
})

// Each length retains only the fastest qualifying match.
export const publishLeaderboardResult = async (room, roomCode, player) => {
  const count = Number(room?.meta?.wordCount)
  const uid = auth.currentUser?.uid
  if (!uid || uid !== player?.uid || room?.meta?.status !== 'ended' ||
      !LEADERBOARD_WORD_COUNTS.includes(count) || !isEligibleLeaderboardResult(player, room?.meta?.forfeits) ||
      !Number.isFinite(Number(room?.meta?.endedAt))) return false

  // A successfully loaded account with no saved profile uses the public-name
  // default from Profile.vue. A failed read cannot establish that preference.
  let profile = { isAnonymous: true }
  try { profile = (await getDoc(doc(db, 'users', uid))).data()?.profile ?? { isAnonymous: false } } catch { /* Keep the name private until the preference can be read. */ }
  const identity = publicIdentity(uid, profile, auth.currentUser.displayName)

  const endedAt = Number(room.meta.endedAt)
  const result = await runTransaction(databaseRef(rtdb, boardPath(count, uid)), previous =>
    nextLeaderboardRecord(previous, roomCode, endedAt, player, identity), { applyLocally: false })
  return result.committed
}

// Country and visibility changes update existing entries without requiring
// the match room to still exist.
export const syncLeaderboardIdentity = async (profile, user = auth.currentUser) => {
  if (!user?.uid) return
  const identity = publicIdentity(user.uid, profile, user.displayName)
  await Promise.all(LEADERBOARD_WORD_COUNTS.map(count =>
    runTransaction(databaseRef(rtdb, boardPath(count, user.uid)), previous => {
      if (!previous) return
      if (previous.displayName === identity.displayName && previous.countryCode === identity.countryCode) return
      const { roomCode, seat, wpm, accuracy, elapsedMs, recordedAt } = previous
      return { roomCode, seat, wpm, accuracy, elapsedMs, recordedAt, ...identity }
    }, { applyLocally: false })
  ))
}

// Repair entries created while a profile read was unavailable. Only the owner
// may refresh their display name, after their privacy preference loads.
export const refreshLeaderboardIdentity = async (user = auth.currentUser) => {
  if (!user?.uid) return false
  const profile = (await getDoc(doc(db, 'users', user.uid))).data()?.profile ?? { isAnonymous: false }
  if (auth.currentUser?.uid !== user.uid) return false
  await syncLeaderboardIdentity(profile, user)
  return true
}

export const subscribeLeaderboard = (wordCount, sortBy, onRecords, onError) => {
  if (!LEADERBOARD_WORD_COUNTS.includes(Number(wordCount))) throw new Error('Unknown passage length')
  if (sortBy !== 'wpm' && sortBy !== 'clarity') throw new Error('Unknown ranking')
  const topRecords = query(databaseRef(rtdb, `multiplayerLeaderboard/${wordCount}`),
    orderByChild(sortBy === 'clarity' ? 'accuracy' : 'wpm'), limitToLast(LEADERBOARD_LIMIT))
  return onValue(topRecords, snapshot => {
    onRecords(Object.entries(snapshot.val() || {}).map(([uid, result]) => ({ uid, ...result })))
  }, onError)
}

// An ended room remains readable for a while. Recover a qualifying match that
// could not be submitted before Realtime Database rules were updated. Scores
// always come from the room, never from the local profile summary.
export const retryRecentLeaderboardResult = async (matches, wordCount) => {
  const uid = auth.currentUser?.uid
  if (!uid) return false
  const candidates = Object.entries(matches || {})
    .filter(([, match]) => Number(match?.wordCount) === Number(wordCount) && match.finished && !match.dnf && Number(match.accuracy) >= 80)
    .sort(([, a], [, b]) => Number(b.wpm) - Number(a.wpm))
    .slice(0, 12)
  for (const [code] of candidates) {
    const snapshot = await get(databaseRef(rtdb, `multiplayerRooms/${code}`))
    const room = snapshot.val()
    if (room?.meta?.status !== 'ended') continue
    const player = Object.entries(room.players || {}).find(([, record]) => record.uid === uid)
    if (player && await publishLeaderboardResult(room, code, { ...player[1], seat: player[0] })) return true
  }
  return false
}
