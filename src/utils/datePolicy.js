/**
 * Trace daily-date policy
 *
 * A Daily Reflection belongs to the calendar date in the user's current device
 * timezone. It becomes available at local midnight. The date key is YYYY-MM-DD,
 * daily credit is claimed once per key, and activity uses the same key.
 */
const DAY_MS = 86_400_000
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const pad = value => String(value).padStart(2, '0')

export const getLocalTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export const getDateKey = (value = new Date(), timeZone = getLocalTimeZone()) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new TypeError('A valid date is required')

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
  } catch {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
}

export const getLocalDateKey = (value = new Date()) => getDateKey(value, getLocalTimeZone())

export const parseLocalDateKey = dateKey => {
  if (!DATE_KEY_PATTERN.test(String(dateKey))) return new Date(Number.NaN)
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const getNextLocalMidnight = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0)
}

export const formatNextDailyReset = (value = new Date()) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(getNextLocalMidnight(value))

export const createDailyClaimId = dateKey => {
  if (!DATE_KEY_PATTERN.test(String(dateKey))) throw new TypeError('A YYYY-MM-DD date key is required')
  return `daily:${dateKey}`
}

const stableHash = value => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export const createPassageContentId = passage =>
  `passage:${stableHash(`${String(passage?.text || '').trim()}|${String(passage?.author || 'Unknown').trim()}`)}`

export const selectDailyPassage = (dateKey, passages = [], fallbackPassages = []) => {
  const primary = Array.isArray(passages) ? passages.filter(passage => String(passage?.text || '').trim()) : []
  const fallback = Array.isArray(fallbackPassages) ? fallbackPassages.filter(passage => String(passage?.text || '').trim()) : []
  const source = primary.length ? 'collection' : 'fallback'
  const candidates = (primary.length ? primary : fallback)
    .map(passage => ({
      text: String(passage.text).trim(),
      author: String(passage.author || 'Unknown').trim() || 'Unknown'
    }))
    .sort((left, right) => createPassageContentId(left).localeCompare(createPassageContentId(right)))

  if (!candidates.length) throw new Error('No daily passages are available')

  const selectionIndex = Number.parseInt(stableHash(`trace-daily|${dateKey}`), 36) % candidates.length
  const selected = candidates[selectionIndex]
  const contentId = createPassageContentId(selected)

  return {
    ...selected,
    passageId: `${createDailyClaimId(dateKey)}:${contentId}`,
    dateKey,
    source
  }
}

export const migrateLegacyDailyDate = (legacyValue, now = new Date(), timeZone = getLocalTimeZone()) => {
  if (DATE_KEY_PATTERN.test(String(legacyValue || ''))) return String(legacyValue)
  const ordinal = Number(legacyValue)
  if (!Number.isFinite(ordinal)) return null

  const currentUtcOrdinal = Math.floor(now.getTime() / DAY_MS)
  if (ordinal === currentUtcOrdinal) return getDateKey(now, timeZone)

  const utcDate = new Date(ordinal * DAY_MS)
  return `${utcDate.getUTCFullYear()}-${pad(utcDate.getUTCMonth() + 1)}-${pad(utcDate.getUTCDate())}`
}
