import { ref, watch } from 'vue'
import { getRealWorldSeason, calculateTimeOfDay } from '../utils/helpers'
import { auth, db } from '../services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const getDefaultStats = () => ({
  lifetimePassages: 0,
  lifetimeDaily: 0,
  lifetimeKeystrokes: 0,
  lifetimeMistakes: 0,
  activityGrid: {}, 
  passageHistory: {}, 
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
  fontFamily: 'calligraphy', 
  pureZen: false, 
  showLiveWPM: false,
  timeAtmosphere: true,       
  themeMode: 'realtime',      
  lockedSeason: getRealWorldSeason()             
})

export const stats = ref(getDefaultStats())
export const settings = ref(getDefaultSettings())
export const timeOfDay = ref('day')
export const currentUser = ref(null)

export const isAppReady = ref(false) 

const syncToCloud = async (uid, currentStats, currentSettings) => {
  try {
    const userRef = doc(db, 'users', uid)
    await setDoc(userRef, {
      stats: currentStats,
      settings: currentSettings,
      lastSynced: Date.now()
    }, { merge: true })
  } catch (error) {
    console.error("Failed to sync to cloud:", error)
  }
}

export const recordSession = () => {
  const today = new Date()
  const localDateString = today.getFullYear() + '-' + 
                          String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(today.getDate()).padStart(2, '0')
  
  if (!stats.value.activityGrid) stats.value.activityGrid = {}
  if (!stats.value.activityGrid[localDateString]) stats.value.activityGrid[localDateString] = 0
  
  stats.value.activityGrid[localDateString] += 1
}

export const savePassageHistory = (passageId, attemptsArray) => {
  if (!stats.value.passageHistory) stats.value.passageHistory = {}
  stats.value.passageHistory[passageId] = attemptsArray
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
}

export const initStore = () => {
  const appStartTime = Date.now() 

  timeOfDay.value = calculateTimeOfDay()

  const savedStats = localStorage.getItem('zen_stats')
  const savedSettings = localStorage.getItem('zen_settings')
  
  if (savedStats) {
    const parsed = JSON.parse(savedStats)
    if (parsed.lifetimeDaily === undefined) parsed.lifetimeDaily = 0
    if (parsed.activityGrid === undefined) parsed.activityGrid = {} 
    if (parsed.passageHistory === undefined) parsed.passageHistory = {} 
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
    if (!parsedSettings.themeMode || parsedSettings.themeMode === 'journey') parsedSettings.themeMode = 'realtime'
    if (parsedSettings.lockedSeason === undefined) parsedSettings.lockedSeason = getRealWorldSeason()
    if (parsedSettings.fontFamily === 'serif' || parsedSettings.fontFamily === 'mincho') parsedSettings.fontFamily = 'calligraphy'
    if (parsedSettings.fontFamily === 'sans' || parsedSettings.fontFamily === 'gothic') parsedSettings.fontFamily = 'minimalist'
    settings.value = { ...settings.value, ...parsedSettings }
    
    if (settings.value.themeMode === 'realtime') {
      settings.value.darkMode = false;
      settings.value.timeAtmosphere = true;
    } else if (settings.value.darkMode) {
      settings.value.timeAtmosphere = false;
    }
  }

  watch(stats, (newStats) => {
    localStorage.setItem('zen_stats', JSON.stringify(newStats))
    if (currentUser.value) syncToCloud(currentUser.value.uid, newStats, settings.value)
  }, { deep: true })

  watch(settings, (newSettings) => {
    localStorage.setItem('zen_settings', JSON.stringify(newSettings))
    if (currentUser.value) syncToCloud(currentUser.value.uid, stats.value, newSettings)
  }, { deep: true })

  onAuthStateChanged(auth, async (user) => {
    const previousUser = currentUser.value
    currentUser.value = user
    
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(userRef)
        
        if (docSnap.exists()) {
          const cloudData = docSnap.data()
          if (cloudData.stats) {
            if (!cloudData.stats.activityGrid) cloudData.stats.activityGrid = {}
            if (!cloudData.stats.passageHistory) cloudData.stats.passageHistory = {}
            if (!cloudData.stats.achievements) cloudData.stats.achievements = getDefaultStats().achievements
            stats.value = cloudData.stats
          }
          if (cloudData.settings) {
            settings.value = cloudData.settings
            if (settings.value.themeMode === 'realtime') {
              settings.value.darkMode = false;
              settings.value.timeAtmosphere = true;
            } else if (settings.value.darkMode) {
              settings.value.timeAtmosphere = false;
            }
          }
        } else {
          await syncToCloud(user.uid, stats.value, settings.value)
        }
      } catch (error) {
        console.error("Error loading profile from cloud:", error)
      }
    } else if (previousUser) {
      stats.value = getDefaultStats()
      settings.value = getDefaultSettings()
      localStorage.removeItem('zen_stats')
      localStorage.removeItem('zen_settings')
    }

    const elapsed = Date.now() - appStartTime
    const remainingDelay = Math.max(3000 - elapsed, 0)
    setTimeout(() => { isAppReady.value = true }, remainingDelay)
  })
}