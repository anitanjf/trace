import { limitToLast, onValue, orderByChild, query, ref as databaseRef, runTransaction } from 'firebase/database'
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

  let profile
  try { profile = (await getDoc(doc(db, 'users', uid))).data()?.profile } catch { /* Prefer a safe alias if privacy cannot be read. */ }
  const identity = publicIdentity(uid, profile, auth.currentUser.displayName)
  // An unavailable profile is not permission to disclose the account name.
  if (!profile) identity.displayName = leaderboardDisplayName(uid, { isAnonymous: true }, '')

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
      return {
        ...previous,
        ...identity
      }
    }, { applyLocally: false })
  ))
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
