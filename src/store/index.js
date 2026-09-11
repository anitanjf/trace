import { ref, watch } from 'vue'
import { getRealWorldSeason, calculateTimeOfDay } from '../utils/helpers'
import { auth, db } from '../services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore'

const STORAGE_SCHEMA_VERSION = 2

const getDefaultStats = () => ({
  lifetimePassages: 0,
  lifetimeDaily: 0,
  lifetimeKeystrokes: 0,
  lifetimeMistakes: 0,
  activityGrid: {}, 
  passageHistory: {},
  sessionLedger: {}, 
  // NEW: Silent Enlightenment System Tracker
  achievements: {
    firstStep: { unlocked: false, timestamp: null },
    stillWater: { unlocked: false, timestamp: null },
    endlessJourney: { unlocked: false, timestamp: null },
    midnightLotus: { unlocked: false, timestamp: null }
  },
  seasonal: {
    0: { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] },
    1: { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] },
    2: { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] },
    3: { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] },
    4: { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] },
    5: { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
  }
})

const getDefaultSettings = () => ({
  darkMode: false,
  appearanceMode: 'system',
  fontFamily: 'calligraphy', 
  pureZen: false, 
  showLiveWPM: false,
  timeAtmosphere: true,       
  themeMode: 'realtime',      
  lockedSeason: getRealWorldSeason(),
  motionMode: 'system',
  showAtmosphereEffects: true,
  showCursorEffects: true,
  showKeystrokeEffects: true
})

export const stats = ref(getDefaultStats())
export const settings = ref(getDefaultSettings())
export const timeOfDay = ref('day')
export const currentUser = ref(null)
export const syncStatus = ref('local')
export const syncError = ref('')
export const storageRecoveryNotice = ref('')

let activeSyncs = 0
const beginSync = () => {
  activeSyncs += 1
  syncError.value = ''
  syncStatus.value = 'syncing'
}
const completeSync = () => {
  activeSyncs = Math.max(0, activeSyncs - 1)
  if (activeSyncs === 0 && !syncError.value) syncStatus.value = currentUser.value ? 'synced' : 'local'
}
const failSync = (error) => {
  activeSyncs = Math.max(0, activeSyncs - 1)
  syncError.value = error?.message || 'Please check your connection and try again.'
  syncStatus.value = 'error'
}

const encodeStoredValue = data => JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, data })
const readStoredValue = (key) => {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.schemaVersion && parsed?.data ? parsed.data : parsed
  } catch (error) {
    try { localStorage.setItem(`${key}_recovery_backup`, raw) } catch {}
    localStorage.removeItem(key)
    storageRecoveryNotice.value = 'Recovered from damaged local data. A backup was kept on this device.'
    return null
  }
}

export const isAppReady = ref(false)
export const systemPrefersReducedMotion = ref(false)
export const systemPrefersDark = ref(false)
export const shouldReduceMotion = () =>
  settings.value.motionMode === 'reduced' ||
  (settings.value.motionMode !== 'full' && systemPrefersReducedMotion.value)

export const applyAppearancePreference = () => {
  settings.value.darkMode = settings.value.appearanceMode === 'dark' ||
    (settings.value.appearanceMode === 'system' && systemPrefersDark.value)
}

const syncSettingsToCloud = async (uid, currentSettings) => {
  beginSync()
  try {
    await setDoc(doc(db, 'users', uid), {
      settings: currentSettings,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      lastSynced: Date.now()
    }, { merge: true })
    completeSync()
  } catch (error) {
    failSync(error)
    throw error
  }
}

const getInstallationId = () => {
  const existing = localStorage.getItem('zen_installation_id')
  if (existing) return existing
  const created = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`
  localStorage.setItem('zen_installation_id', created)
  return created
}

const applySessionDelta = (target, session) => {
  if (session.legacySeasonal) {
    for (const [season, values] of Object.entries(session.legacySeasonal)) {
      if (!target.seasonal[season]) target.seasonal[season] = { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
      target.seasonal[season].passages += values.passages || 0
      target.seasonal[season].keystrokes += values.keystrokes || 0
      target.seasonal[season].mistakes += values.mistakes || 0
      target.seasonal[season].quotes = [...new Set([...(target.seasonal[season].quotes || []), ...(values.quotes || [])])]
    }
    for (const [date, count] of Object.entries(session.legacyActivity || {})) {
      target.activityGrid[date] = (target.activityGrid[date] || 0) + count
    }
    target.lifetimePassages += session.passageDelta || 0
    target.lifetimeDaily += session.dailyDelta || 0
    target.lifetimeKeystrokes += session.keystrokes || 0
    target.lifetimeMistakes += session.mistakes || 0
    return
  }

  const season = session.season ?? getRealWorldSeason()
  if (!target.seasonal[season]) target.seasonal[season] = { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
  target.lifetimePassages += session.passageDelta || 0
  target.lifetimeDaily += session.dailyDelta || 0
  target.lifetimeKeystrokes += session.keystrokes || 0
  target.lifetimeMistakes += session.mistakes || 0
  target.seasonal[season].passages += session.passageDelta || session.dailyDelta || 0
  target.seasonal[season].keystrokes += session.keystrokes || 0
  target.seasonal[season].mistakes += session.mistakes || 0
  if (session.date) target.activityGrid[session.date] = (target.activityGrid[session.date] || 0) + 1
}

const mergeProgress = (remoteStats = {}, localStats = {}) => {
  const merged = { ...getDefaultStats(), ...remoteStats }
  merged.activityGrid = { ...(remoteStats.activityGrid || {}) }
  merged.passageHistory = { ...(remoteStats.passageHistory || {}), ...(localStats.passageHistory || {}) }
  merged.achievements = { ...getDefaultStats().achievements, ...(remoteStats.achievements || {}) }
  for (const [key, value] of Object.entries(localStats.achievements || {})) {
    if (value?.unlocked && !merged.achievements[key]?.unlocked) merged.achievements[key] = value
  }
  merged.seasonal = JSON.parse(JSON.stringify(remoteStats.seasonal || getDefaultStats().seasonal))
  merged.sessionLedger = { ...(remoteStats.sessionLedger || {}) }

  for (const [sessionId, session] of Object.entries(localStats.sessionLedger || {})) {
    if (merged.sessionLedger[sessionId]) continue
    merged.sessionLedger[sessionId] = session
    applySessionDelta(merged, session)
  }
  return merged
}

const syncProgressToCloud = async (uid, localStats) => {
  beginSync()
  const userRef = doc(db, 'users', uid)
  try {
    const merged = await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(userRef)
      const remoteStats = snapshot.exists() ? snapshot.data().stats : getDefaultStats()
      const mergedStats = mergeProgress(remoteStats, localStats)
      transaction.set(userRef, {
        stats: mergedStats,
        schemaVersion: STORAGE_SCHEMA_VERSION,
        lastSynced: Date.now()
      }, { merge: true })
      return mergedStats
    })
    completeSync()
    return merged
  } catch (error) {
    failSync(error)
    throw error
  }
}

export const retrySync = async () => {
  if (!currentUser.value) {
    syncStatus.value = 'local'
    return
  }
  const uid = currentUser.value.uid
  try {
    const merged = await syncProgressToCloud(uid, JSON.parse(JSON.stringify(stats.value)))
    if (currentUser.value?.uid !== uid) return
    stats.value = merged
    await syncSettingsToCloud(uid, settings.value)
  } catch {
    // Individual sync functions expose the actionable error state.
  }
}

let progressSyncTimer = null
const scheduleProgressSync = () => {
  if (!currentUser.value) return
  const scheduledUserId = currentUser.value.uid
  clearTimeout(progressSyncTimer)
  progressSyncTimer = setTimeout(async () => {
    if (currentUser.value?.uid !== scheduledUserId) return
    try {
      stats.value = await syncProgressToCloud(scheduledUserId, JSON.parse(JSON.stringify(stats.value)))
    } catch (error) {
      console.error('Failed to sync progress:', error)
    }
  }, 250)
}

export const recordSession = (session = {}) => {
  if (!session.id) return false
  if (!stats.value.sessionLedger) stats.value.sessionLedger = {}
  if (stats.value.sessionLedger[session.id]) return false

  const today = new Date()
  const date = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0')

  stats.value.sessionLedger[session.id] = {
    id: session.id,
    mode: session.mode || 'meditation',
    completedAt: session.completedAt || Date.now(),
    date,
    season: session.season ?? getRealWorldSeason(),
    passageDelta: session.passageDelta || 0,
    dailyDelta: session.dailyDelta || 0,
    keystrokes: session.keystrokes || 0,
    mistakes: session.mistakes || 0
  }
  if (!stats.value.activityGrid) stats.value.activityGrid = {}
  stats.value.activityGrid[date] = (stats.value.activityGrid[date] || 0) + 1
  scheduleProgressSync()
  return true
}

export const savePassageHistory = (passageId, attemptsArray) => {
  if (!stats.value.passageHistory) stats.value.passageHistory = {}
  stats.value.passageHistory[passageId] = attemptsArray
  scheduleProgressSync()
}

// NEW: Evaluates achievements silently at the end of a passage
export const checkEnlightenments = (results) => {
  if (!stats.value.achievements) {
    stats.value.achievements = getDefaultStats().achievements
  }

  const ach = stats.value.achievements;
  
  // 1. The First Step (Complete any passage)
  if (!ach.firstStep.unlocked) {
    ach.firstStep = { unlocked: true, timestamp: Date.now() };
  }
  
  // 2. Still Water (100% Accuracy)
  if (!ach.stillWater.unlocked && results.accuracy === 100) {
    ach.stillWater = { unlocked: true, timestamp: Date.now() };
  }
  
  // 3. Endless Journey (50 lifetime passages)
  if (!ach.endlessJourney.unlocked && stats.value.lifetimePassages >= 50) {
    ach.endlessJourney = { unlocked: true, timestamp: Date.now() };
  }
  
  // 4. Midnight Lotus (Meditate between 12:00 AM and 4:00 AM)
  const currentHour = new Date().getHours();
  if (!ach.midnightLotus.unlocked && currentHour >= 0 && currentHour < 4) {
    ach.midnightLotus = { unlocked: true, timestamp: Date.now() };
  }
  scheduleProgressSync()
}

export const initStore = () => {
  timeOfDay.value = calculateTimeOfDay()

  if (typeof window !== 'undefined' && window.matchMedia) {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => { systemPrefersReducedMotion.value = motionQuery.matches }
    updateMotionPreference()
    motionQuery.addEventListener?.('change', updateMotionPreference)

    const appearanceQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateAppearancePreference = () => {
      systemPrefersDark.value = appearanceQuery.matches
      if (settings.value.appearanceMode === 'system') applyAppearancePreference()
    }
    updateAppearancePreference()
    appearanceQuery.addEventListener?.('change', updateAppearancePreference)
  }

  if (typeof window !== 'undefined') window.addEventListener('online', scheduleProgressSync)

  const savedStats = readStoredValue('zen_stats')
  const savedSettings = readStoredValue('zen_settings')
  let localPreferences = {}
  
  if (savedStats) {
    const parsed = savedStats
    if (parsed.lifetimeDaily === undefined) parsed.lifetimeDaily = 0
    if (parsed.activityGrid === undefined) parsed.activityGrid = {} 
    if (parsed.passageHistory === undefined) parsed.passageHistory = {}
    if (parsed.sessionLedger === undefined) {
      parsed.sessionLedger = {}
      const hasLegacyProgress = parsed.lifetimePassages || parsed.lifetimeDaily || parsed.lifetimeKeystrokes || parsed.lifetimeMistakes
      if (hasLegacyProgress) {
        const legacyId = `legacy-${getInstallationId()}`
        parsed.sessionLedger[legacyId] = {
          id: legacyId,
          mode: 'legacy-import',
          completedAt: Date.now(),
          passageDelta: parsed.lifetimePassages || 0,
          dailyDelta: parsed.lifetimeDaily || 0,
          keystrokes: parsed.lifetimeKeystrokes || 0,
          mistakes: parsed.lifetimeMistakes || 0,
          legacySeasonal: parsed.seasonal || {},
          legacyActivity: parsed.activityGrid || {}
        }
      }
    } 
    if (parsed.achievements === undefined) parsed.achievements = getDefaultStats().achievements // Backwards compatibility hook
    if (!parsed.seasonal[4]) {
      parsed.seasonal[4] = { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
      parsed.seasonal[5] = { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
    }
    stats.value = { ...stats.value, ...parsed }
  }
  
  if (savedSettings) {
    const parsedSettings = savedSettings
    if (parsedSettings.timeAtmosphere === undefined) parsedSettings.timeAtmosphere = true
    if (!['system', 'light', 'dark'].includes(parsedSettings.appearanceMode)) parsedSettings.appearanceMode = parsedSettings.darkMode ? 'dark' : 'light'
    if (!parsedSettings.themeMode || parsedSettings.themeMode === 'journey') parsedSettings.themeMode = 'realtime'
    if (parsedSettings.lockedSeason === undefined) parsedSettings.lockedSeason = getRealWorldSeason()
    if (!['system', 'reduced', 'full'].includes(parsedSettings.motionMode)) parsedSettings.motionMode = 'system'
    if (parsedSettings.fontFamily === 'serif' || parsedSettings.fontFamily === 'mincho') parsedSettings.fontFamily = 'calligraphy'
    if (parsedSettings.fontFamily === 'sans' || parsedSettings.fontFamily === 'gothic') parsedSettings.fontFamily = 'minimalist'
    settings.value = { ...settings.value, ...parsedSettings }
    localPreferences = { ...parsedSettings }
    
    applyAppearancePreference()
  }

  watch(stats, (newStats) => {
    localStorage.setItem('zen_stats', encodeStoredValue(newStats))
  }, { deep: true })

  watch(settings, (newSettings) => {
    applyAppearancePreference()
    localPreferences = { ...newSettings }
    localStorage.setItem('zen_settings', encodeStoredValue(newSettings))
    if (currentUser.value) syncSettingsToCloud(currentUser.value.uid, newSettings)
  }, { deep: true })

  onAuthStateChanged(auth, async (user) => {
    const previousUser = currentUser.value
    currentUser.value = user
    
    if (user) {
      if (previousUser && previousUser.uid !== user.uid) {
        stats.value = getDefaultStats()
        localStorage.removeItem('zen_stats')
      }
      try {
        const userRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(userRef)
        
        if (docSnap.exists()) {
          const cloudData = docSnap.data()
          stats.value = await syncProgressToCloud(user.uid, JSON.parse(JSON.stringify(stats.value)))
          if (cloudData.settings) {
            settings.value = { ...getDefaultSettings(), ...cloudData.settings, ...localPreferences }
            applyAppearancePreference()
            await syncSettingsToCloud(user.uid, settings.value)
          }
        } else {
          stats.value = await syncProgressToCloud(user.uid, JSON.parse(JSON.stringify(stats.value)))
          await syncSettingsToCloud(user.uid, settings.value)
        }
      } catch (error) {
        failSync(error)
      }
    } else if (previousUser) {
      syncStatus.value = 'local'
      syncError.value = ''
      stats.value = getDefaultStats()
      localStorage.removeItem('zen_stats')
    }

    isAppReady.value = true
  })
}