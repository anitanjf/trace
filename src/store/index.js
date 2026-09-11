import { ref, watch } from 'vue'
import { getRealWorldSeason, calculateTimeOfDay } from '../utils/helpers'
import { auth, db } from '../services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore'

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
  try {
    await setDoc(doc(db, 'users', uid), {
      settings: currentSettings,
      lastSynced: Date.now()
    }, { merge: true })
  } catch (error) {
    console.error('Failed to sync settings:', error)
  }
}

const applySessionDelta = (target, session) => {
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
  const userRef = doc(db, 'users', uid)
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(userRef)
    const remoteStats = snapshot.exists() ? snapshot.data().stats : getDefaultStats()
    const mergedStats = mergeProgress(remoteStats, localStats)
    transaction.set(userRef, { stats: mergedStats, lastSynced: Date.now() }, { merge: true })
    return mergedStats
  })
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

  const savedStats = localStorage.getItem('zen_stats')
  const savedSettings = localStorage.getItem('zen_settings')
  let localPreferences = {}
  
  if (savedStats) {
    const parsed = JSON.parse(savedStats)
    if (parsed.lifetimeDaily === undefined) parsed.lifetimeDaily = 0
    if (parsed.activityGrid === undefined) parsed.activityGrid = {} 
    if (parsed.passageHistory === undefined) parsed.passageHistory = {}
    if (parsed.sessionLedger === undefined) parsed.sessionLedger = {} 
    if (parsed.achievements === undefined) parsed.achievements = getDefaultStats().achievements // Backwards compatibility hook
    if (!parsed.seasonal[4]) {
      parsed.seasonal[4] = { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
      parsed.seasonal[5] = { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
    }
    stats.value = { ...stats.value, ...parsed }
  }
  
  if (savedSettings) {
    const parsedSettings = JSON.parse(savedSettings)
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
    localStorage.setItem('zen_stats', JSON.stringify(newStats))
  }, { deep: true })

  watch(settings, (newSettings) => {
    applyAppearancePreference()
    localPreferences = { ...newSettings }
    localStorage.setItem('zen_settings', JSON.stringify(newSettings))
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
        console.error("Error loading profile from cloud:", error)
      }
    } else if (previousUser) {
      stats.value = getDefaultStats()
      localStorage.removeItem('zen_stats')
    }

    isAppReady.value = true
  })
}