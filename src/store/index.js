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

// Global loading state to hide the app until Firebase is done
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

export const initStore = () => {
  // 1. Record the exact millisecond the app begins loading
  const appStartTime = Date.now() 

  timeOfDay.value = calculateTimeOfDay()

  const savedStats = localStorage.getItem('zen_stats')
  const savedSettings = localStorage.getItem('zen_settings')
  
  if (savedStats) {
    const parsed = JSON.parse(savedStats)
    if (parsed.lifetimeDaily === undefined) parsed.lifetimeDaily = 0
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
    if (currentUser.value) {
      syncToCloud(currentUser.value.uid, newStats, settings.value)
    }
  }, { deep: true })

  watch(settings, (newSettings) => {
    localStorage.setItem('zen_settings', JSON.stringify(newSettings))
    if (currentUser.value) {
      syncToCloud(currentUser.value.uid, stats.value, newSettings)
    }
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
          if (cloudData.stats) stats.value = cloudData.stats
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

    // 2. Calculate how long Firebase took to load
    const elapsed = Date.now() - appStartTime
    
    // 3. Subtract elapsed time from 3000ms (3 seconds) to find the remaining delay needed
    const remainingDelay = Math.max(3000 - elapsed, 0)

    // 4. Reveal the app only after the minimum 3 seconds has passed
    setTimeout(() => {
      isAppReady.value = true
    }, remainingDelay)
  })
}