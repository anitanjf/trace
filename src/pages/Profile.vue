<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { settings, currentUser, stats } from '../store'
import { logOut, db } from '../services/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { syncLeaderboardIdentity } from '../services/leaderboard'
import { countryFlag, countryName, isCountryCode } from '../utils/countries'
import CountryPicker from '../components/ui/CountryPicker.vue'
import AuthModal from '../components/AuthModal.vue'
import Heatmap from '../components/Heatmap.vue'
import { seasonInkPalette } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'

const router = useRouter()
const showAuthModal = ref(false)
const activeTab = ref('meditation')
const profileTabs = [
  { id: 'meditation', label: 'Meditation' },
  { id: 50, label: '50 words' },
  { id: 100, label: '100 words' },
  { id: 200, label: '200 words' }
]
const themeSeasonIndex = computed(() =>
  settings.value.themeMode === 'locked'
    ? Number(settings.value.lockedSeason || 0)
    : getRealWorldSeason()
)
const activeSeasonInk = computed(() => {
  const palette = seasonInkPalette[themeSeasonIndex.value] || seasonInkPalette[0]
  return {
    backgroundColor: settings.value.darkMode ? palette.dark : palette.light,
    color: settings.value.darkMode ? palette.darkText : palette.lightText
  }
})
const achievementInk = unlocked => unlocked
  ? {
      borderColor: activeSeasonInk.value.backgroundColor,
      color: activeSeasonInk.value.backgroundColor,
      boxShadow: `0 0 15px ${activeSeasonInk.value.backgroundColor}33`
    }
  : undefined
const expandedPassageId = ref(null)
const searchQuery = ref('')
const profileMessage = ref('')
const profileMessageType = ref('') 

// Hover states
const hoveredMetric = ref(null)
const hoveredAchievement = ref(null) // NEW: State for Enlightenment tooltips

const metricDefinitions = {
  Speed: "The flowing current: Your average pace (WPM) across all passages.",
  Clarity: "The still water: Your overall accuracy and absence of missteps.",
  Consistency: "The steady breath: Frequency of reflections ending above 90% clarity.",
  Focus: "The unwavering mind: Ratio of completed passages to total retry attempts.",
  Resilience: "The rising tide: Frequency of your final attempt surpassing your first.",
  Stamina: "The endless journey: Your endurance, measured by total reflections made."
}

// NEW: Enlightenment Definitions
const achievementDefs = {
  firstStep: { name: "The First Step", desc: "You have begun your journey. (Complete 1 passage)" },
  stillWater: { name: "Still Water", desc: "Perfect clarity. (Achieve 100% accuracy)" },
  endlessJourney: { name: "Endless Journey", desc: "A testament to dedication. (Complete 50 passages)" },
  midnightLotus: { name: "Midnight Lotus", desc: "Finding peace in the quiet hours. (Meditate between 12 AM - 4 AM)" }
}

const isEditing = ref(false)
const defaultProfile = () => ({
  bio: '', github: '', twitter: '', website: '', alias: 'A Wandering Soul', isAnonymous: false, countryCode: ''
})
const customProfile = ref(defaultProfile())

const fetchProfile = async () => {
  if (!currentUser.value) return
  const uid = currentUser.value.uid
  profileMessage.value = ''
  try {
    const docRef = doc(db, 'users', uid)
    const snap = await getDoc(docRef)
    if (currentUser.value?.uid === uid && snap.exists() && snap.data().profile) {
      customProfile.value = { ...defaultProfile(), ...snap.data().profile }
      if (!isCountryCode(customProfile.value.countryCode)) customProfile.value.countryCode = ''
    }
  } catch (err) {
    profileMessageType.value = 'error'
    profileMessage.value = err?.message || 'Could not load your profile. Please try again.'
  }
}

const saveProfile = async () => {
  if (!currentUser.value) return
  if (!isCountryCode(customProfile.value.countryCode)) {
    profileMessageType.value = 'error'
    profileMessage.value = 'Choose a country from the list or leave it unset.'
    return
  }
  const user = currentUser.value
  profileMessage.value = ''
  try {
    const docRef = doc(db, 'users', user.uid)
    await setDoc(docRef, { profile: customProfile.value }, { merge: true })
    isEditing.value = false
    profileMessageType.value = 'success'
    profileMessage.value = 'Profile saved.'
    try {
      await syncLeaderboardIdentity(customProfile.value, user)
    } catch {
      profileMessageType.value = 'error'
      profileMessage.value = 'Profile saved, but the leaderboard could not refresh your name or country. Check your connection and Realtime Database rules.'
    }
  } catch (err) {
    profileMessageType.value = 'error'
    profileMessage.value = err?.message || 'Could not save your profile. Your edits are still here.'
  }
}

onMounted(() => {
  if (!currentUser.value) showAuthModal.value = true
  else fetchProfile()
})

watch(currentUser, (newUser) => {
  customProfile.value = defaultProfile()
  if (newUser) { showAuthModal.value = false; fetchProfile() }
})

const handleModalClose = () => {
  showAuthModal.value = false
  if (!currentUser.value) router.push('/')
}

const handleLogout = async () => {
  try { await logOut(); router.push('/') } 
  catch (err) { console.error(err) }
}

const meditationPassageHistory = computed(() => {
  if (!stats.value.passageHistory) return []

  return Object.entries(stats.value.passageHistory)
    .filter(([key]) => key.startsWith('season_'))
    .map(([key, attempts]) => {
      if (!Array.isArray(attempts) || !attempts.length) return null
      const passageNumber = key.split('_passage_')[1]
      const isFlow = key.includes('_flow_')
      const latestAttempt = attempts[attempts.length - 1]
      const wordCount = latestAttempt?.wordCount || 0
      return {
        id: key,
        number: passageNumber || wordCount || 'Flow',
        label: isFlow ? `Flow · ${wordCount} words` : `Passage ${passageNumber || '—'}`,
        mode: isFlow ? 'flow' : (latestAttempt?.mode || 'meditation'),
        attempts,
        completedAt: latestAttempt?.completedAt || 0
      }
    }).filter(Boolean)
    .sort((a, b) =>
      b.completedAt - a.completedAt ||
      (Number.parseInt(b.number, 10) || 0) - (Number.parseInt(a.number, 10) || 0)
    ) 
})

const multiplayerHistory = computed(() => Object.entries(stats.value.multiplayerMatches || {})
  .filter(([, match]) => Number(match?.wordCount) === activeTab.value)
  .map(([id, match]) => ({ id, ...match }))
  .sort((a, b) => b.playedAt - a.playedAt))

const multiplayerSummary = computed(() => {
  const matches = multiplayerHistory.value
  const finished = matches.filter(match => match.finished)
  const withTyping = matches.filter(match => match.wpm > 0)
  return {
    played: matches.length,
    wins: matches.filter(match => match.won).length,
    finishRate: matches.length ? Math.round(finished.length / matches.length * 100) : 0,
    wpm: withTyping.length ? Math.round(withTyping.reduce((sum, match) => sum + match.wpm, 0) / withTyping.length) : 0,
    accuracy: withTyping.length ? Math.round(withTyping.reduce((sum, match) => sum + match.accuracy, 0) / withTyping.length) : 0
  }
})

const meditationSummary = computed(() => {
  const attempts = meditationPassageHistory.value.flatMap(passage => passage.attempts)
  const withTyping = attempts.filter(attempt => Number(attempt.keystrokes) > 0 || Number(attempt.wpm) > 0)
  return {
    passages: Math.max(meditationPassageHistory.value.length, Number(stats.value.lifetimePassages) || 0),
    reflections: attempts.length,
    accuracy: withTyping.length ? Math.round(withTyping.reduce((sum, attempt) => sum + (Number(attempt.accuracy) || 0), 0) / withTyping.length) : 0,
    wpm: withTyping.length ? Math.round(withTyping.reduce((sum, attempt) => sum + (Number(attempt.wpm) || 0), 0) / withTyping.length) : 0
  }
})

const filteredPassages = computed(() => {
  if (!searchQuery.value.trim()) return [] 
  const query = searchQuery.value.trim().toLowerCase()
  return meditationPassageHistory.value.filter(p =>
    p.number.toString().toLowerCase().includes(query) ||
    p.label.toLowerCase().includes(query) ||
    p.mode.includes(query)
  )
})

const radarData = computed(() => {
  const history = meditationPassageHistory.value
  const passagesCount = history.length

  if (passagesCount === 0) return { polygon: "100,90 108,95 108,105 100,110 92,105 92,95", points: [] }

  let totalWPM = 0
  let totalClarity = 0
  let improvedCount = 0
  let totalAttempts = 0
  let consistentAttempts = 0

  history.forEach(p => {
    totalAttempts += p.attempts.length
    const first = p.attempts[0]
    const final = p.attempts[p.attempts.length - 1]

    totalWPM += final.wpm || 0
    totalClarity += final.accuracy || 0

    if (final.accuracy >= first.accuracy || final.wpm >= first.wpm) improvedCount++

    p.attempts.forEach(a => {
      if (a.accuracy >= 90) consistentAttempts++
    })
  })

  const speed = Math.max(0.1, Math.min(1, (totalWPM / passagesCount) / 120)) 
  const clarity = Math.max(0.1, (totalClarity / passagesCount) / 100)
  const consistency = Math.max(0.1, consistentAttempts / totalAttempts)
  const focus = Math.max(0.1, passagesCount / totalAttempts) 
  const resilience = Math.max(0.1, improvedCount / passagesCount)
  const stamina = Math.max(0.1, Math.min(1, totalAttempts / 40)) 

  const statValues = [speed, clarity, consistency, focus, resilience, stamina]

  const maxVertices = [
    {x: 100, y: 10},  
    {x: 180, y: 50},  
    {x: 180, y: 150}, 
    {x: 100, y: 190}, 
    {x: 20, y: 150},  
    {x: 20, y: 50}    
  ]

  const points = statValues.map((val, i) => {
    const mx = maxVertices[i].x
    const my = maxVertices[i].y
    return {
      x: 100 + (mx - 100) * val,
      y: 100 + (my - 100) * val
    }
  })

  return {
    polygon: points.map(p => `${p.x},${p.y}`).join(' '),
    points
  }
})
</script>

<template>
  <div class="z-10 flex flex-col w-full max-w-6xl mx-auto min-h-screen pt-12 md:pt-20 px-4 sm:px-12 pb-16 font-ui-sans relative overflow-x-hidden no-scrollbar">
    
    <div class="mb-8 md:mb-12 w-full text-center md:text-left">
      <p class="text-[9px] uppercase tracking-[0.32em] opacity-55 mb-3">Your practice, in every season</p>
      <h2 class="text-2xl sm:text-3xl tracking-[0.25em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">Traces of the Mind</h2>
    </div>

    <template v-if="currentUser">
      <div class="flex flex-col md:grid md:grid-cols-[16rem_1fr] gap-y-12 md:gap-y-8 gap-x-12 md:gap-x-16 w-full items-center md:items-start">
        
        <!-- LEFT SIDEBAR: PROFILE INFO -->
        <div class="order-1 flex flex-col items-center flex-shrink-0 animate-fade-in text-center w-full md:col-start-1 md:row-start-1">
          <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-6 shadow-sm p-1" :class="settings.darkMode ? 'bg-stone-800/50' : 'bg-stone-300/30'">
             <img :src="customProfile.isAnonymous ? 'https://api.dicebear.com/7.x/shapes/svg?seed=zen' : (currentUser.photoURL || '/default-avatar.png')" alt="Profile" class="w-full h-full object-cover grayscale rounded-full hover:grayscale-0 transition-all duration-700" />
             <div class="absolute inset-0 rounded-full opacity-30 pointer-events-none transition-colors duration-700" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></div>
          </div>
          
          <div class="flex flex-col gap-1 w-full items-center px-2 md:px-0">
            <h1 class="text-xl tracking-widest font-ui-serif px-4 md:px-0" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">
              {{ customProfile.isAnonymous ? (customProfile.alias || 'A Wandering Soul') : (currentUser.displayName || 'A Wandering Soul') }}
            </h1>
            
            <h2 v-if="!customProfile.isAnonymous" class="text-[9px] uppercase tracking-[0.2em] opacity-70 mb-6 font-semibold truncate w-full px-4" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">
              {{ currentUser.email || '' }}
            </h2>
            <div v-else class="text-[9px] uppercase tracking-[0.2em] opacity-50 mb-6 italic" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-400'">
              Hidden Identity
            </div>
            <p v-if="customProfile.countryCode && !isEditing" class="mb-5 text-[10px] tracking-wide opacity-75" :title="countryName(customProfile.countryCode)">
              <span aria-hidden="true" class="mr-1">{{ countryFlag(customProfile.countryCode) }}</span>{{ countryName(customProfile.countryCode) }}
            </p>
            
            <template v-if="!isEditing">
              <p class="text-xs leading-loose mb-6 opacity-90 font-light w-full max-w-[280px] md:max-w-[220px]" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
                {{ customProfile.bio || 'Silence is the root of all sound.' }}
              </p>
              
              <button @click="isEditing = true" class="relative isolate px-6 py-2.5 w-full max-w-[260px] md:max-w-[200px] group transition-transform hover:scale-105 mb-10">
                <div class="absolute inset-0 -z-10 rounded-full transition-[background-color,opacity] duration-700" :class="settings.darkMode ? 'opacity-[0.72] group-hover:opacity-[0.82]' : 'opacity-[0.62] group-hover:opacity-[0.72]'" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></div>
                <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] font-semibold transition-colors duration-700" :style="{ color: activeSeasonInk.color }">Edit profile</span>
              </button>
            </template>
            <template v-else>
               <div class="flex flex-col gap-4 mb-6 w-full max-w-[280px] md:max-w-[240px] text-left px-4 md:px-0">
                  <div @click="customProfile.isAnonymous = !customProfile.isAnonymous" class="flex items-center gap-3 cursor-pointer select-none py-1 group mt-2 mb-2">
                    <div class="relative w-5 h-5 flex items-center justify-center">
                      <div class="absolute inset-0 transition-all duration-300"
                           :class="customProfile.isAnonymous 
                              ? (settings.darkMode ? 'bg-stone-200' : 'bg-stone-800') 
                              : (settings.darkMode ? 'bg-stone-700 opacity-40 group-hover:opacity-70' : 'bg-stone-300 opacity-60 group-hover:opacity-100')"
                           style="filter: url(#ink-blot);"></div>
                      <svg v-if="customProfile.isAnonymous" class="relative z-10 w-3 h-3 animate-fade-in" :class="settings.darkMode ? 'text-stone-900' : 'text-white'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span class="text-[9px] uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Hide Identity</span>
                  </div>
                  <div v-if="customProfile.isAnonymous" class="flex flex-col gap-1 mt-1">
                    <span class="text-[8px] uppercase tracking-widest opacity-50">Wandering Alias</span>
                    <input v-model="customProfile.alias" type="text" placeholder="e.g. A Silent Monk" class="w-full bg-transparent border-b p-1 text-xs focus:outline-none" :class="settings.darkMode ? 'border-stone-700 text-stone-200 focus:border-stone-500' : 'border-stone-300 text-stone-800 focus:border-stone-500'" />
                  </div>
                  <div class="flex flex-col gap-1 mt-1">
                    <CountryPicker v-model="customProfile.countryCode" />
                    <span class="text-[9px] leading-relaxed opacity-60">Shown on the leaderboard only if you choose one. We do not detect your location.</span>
                  </div>
                  <div class="flex flex-col gap-1 mt-1">
                    <span class="text-[8px] uppercase tracking-widest opacity-50">Reflection / Bio</span>
                    <textarea v-model="customProfile.bio" rows="3" placeholder="Share a reflection..." class="w-full bg-transparent border-b p-1 text-xs focus:outline-none resize-none" :class="settings.darkMode ? 'border-stone-700 text-stone-200 focus:border-stone-500' : 'border-stone-300 text-stone-800 focus:border-stone-500'"></textarea>
                  </div>
               </div>
               <div class="flex gap-4 w-full max-w-[260px] md:max-w-[200px] mb-8 mt-2 px-4 md:px-0">
                  <button @click="saveProfile" class="relative isolate flex-1 py-3 md:py-2 group transition-transform hover:scale-105">
                    <div class="absolute inset-0 -z-10 rounded-full transition-[background-color,opacity] duration-700" :class="settings.darkMode ? 'opacity-[0.72] group-hover:opacity-[0.82]' : 'opacity-[0.62] group-hover:opacity-[0.72]'" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></div>
                    <span class="relative z-10 tracking-widest uppercase text-[9px] font-semibold transition-colors duration-700" :style="{ color: activeSeasonInk.color }">Save</span>
                  </button>
                  <button @click="isEditing = false; fetchProfile()" class="relative flex-1 py-3 md:py-2 group transition-transform hover:scale-105">
                    <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-stone-700 opacity-20 group-hover:opacity-30' : 'bg-stone-400 opacity-20 group-hover:opacity-30'" style="filter: url(#ink-blot);"></div>
                    <span class="relative z-10 tracking-widest uppercase text-[9px] font-semibold opacity-70 group-hover:opacity-100" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Cancel</span>
                  </button>
               </div>
            </template>
          </div>
        </div>

        <!-- MAIN CONTENT AREA -->
        <div class="order-2 flex flex-col gap-10 md:gap-14 w-full animate-fade-in pt-4 md:pt-0 min-w-0 md:col-start-2 md:row-start-1 md:row-span-2" style="animation-delay: 100ms;">
          
          <div class="w-full">
            <Heatmap :activityGrid="stats.activityGrid || {}" />
          </div>

          <div class="w-full flex flex-col items-center md:items-start mt-4">
            
            <div class="w-full flex flex-wrap justify-center md:justify-start gap-2 sm:gap-4 mb-6 md:mb-10 border-b pb-5" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'" role="tablist" aria-label="Practice statistics">
              <button v-for="tab in profileTabs" :key="tab.id" type="button" role="tab" :aria-selected="activeTab === tab.id" @click="activeTab = tab.id; searchQuery = ''; expandedPassageId = null" class="relative isolate px-4 sm:px-5 py-3 min-h-11 text-[9px] tracking-[0.18em] uppercase transition-all duration-300 group" :class="activeTab === tab.id ? 'font-semibold' : 'opacity-55 hover:opacity-90'">
                <span v-if="activeTab === tab.id" aria-hidden="true" class="absolute inset-0 -z-10 rounded-sm pointer-events-none transition-[background-color,opacity] duration-700" :class="settings.darkMode ? 'opacity-[0.5]' : 'opacity-[0.35]'" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></span>
                {{ tab.label }}
              </button>
            </div>

            <div v-if="activeTab !== 'meditation'" class="w-full space-y-7" role="tabpanel">
              <div class="max-w-2xl">
                <p class="text-[9px] uppercase tracking-[0.28em] opacity-55 mb-3">Shared passages · {{ activeTab }} words</p>
                <h3 class="font-ui-serif text-xl sm:text-2xl leading-relaxed">Each light finds its own pace.</h3>
                <p class="text-xs leading-relaxed opacity-60 mt-2">Your results from completed multiplayer rooms, wherever the seasons led you.</p>
              </div>
              <div class="relative isolate p-6 sm:p-8">
                <span aria-hidden="true" class="absolute inset-0 -z-10 opacity-[0.13]" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></span>
                <dl class="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-7 text-center">
                  <div v-for="metric in [
                    ['Matches', multiplayerSummary.played], ['Wins', multiplayerSummary.wins], ['Finished', multiplayerSummary.finishRate + '%'],
                    ['Avg pace', multiplayerSummary.wpm + ' WPM'], ['Avg clarity', multiplayerSummary.accuracy + '%']
                  ]" :key="metric[0]" class="space-y-2">
                    <dt class="text-[9px] uppercase tracking-[0.17em] opacity-55">{{ metric[0] }}</dt>
                    <dd class="font-ui-serif text-xl tabular-nums">{{ metric[1] }}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 class="text-[9px] uppercase tracking-[0.25em] opacity-60 mb-4">Recent matches</h3>
                <p v-if="!multiplayerHistory.length" class="py-8 text-sm leading-relaxed opacity-65">No {{ activeTab }}-word matches recorded yet. Your next shared passage will leave a trace here.</p>
                <ol v-else class="space-y-3">
                  <li v-for="match in multiplayerHistory.slice(0, 12)" :key="match.id" class="relative isolate flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs">
                    <span aria-hidden="true" class="absolute inset-0 -z-10 opacity-[0.09]" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></span>
                    <span class="flex flex-col gap-1"><strong class="font-ui-serif font-normal text-base">{{ match.dnf ? 'Did not finish' : match.won ? 'First light' : match.finished ? 'Passage complete' : 'Last light standing' }}</strong><time class="opacity-55 text-[10px]" :datetime="new Date(match.playedAt).toISOString()">{{ new Date(match.playedAt).toLocaleDateString() }}</time></span>
                    <span class="text-right tabular-nums">{{ match.placement }} / {{ match.players }} · {{ match.wpm }} WPM · {{ match.accuracy }}%</span>
                  </li>
                </ol>
              </div>
            </div>

            <!-- LAYOUT: 1/3 Chart, 2/3 Search & Stats -->
            <div v-else class="flex flex-col lg:flex-row w-full gap-12 lg:gap-12 items-start mt-2" role="tabpanel">
              
              <!-- LEFT (1/3): RADAR CHART -->
              <div class="w-full lg:w-1/3 flex flex-col items-center pt-2 relative">
                 <span class="text-[8px] sm:text-[9px] uppercase tracking-[0.4em] opacity-60 font-semibold mb-8 text-center">Meditation · Path to Mastery</span>
                 
                 <div class="relative w-28 h-28 sm:w-36 sm:h-36 mb-2 mt-2">
                    <svg viewBox="0 0 200 200" class="w-full h-full overflow-visible pointer-events-none">
                       <polygon points="100,10 180,50 180,150 100,190 20,150 20,50" fill="none" stroke="currentColor" class="opacity-10" stroke-width="1"/>
                       <polygon points="100,40 153,67 153,133 100,160 47,133 47,67" fill="none" stroke="currentColor" class="opacity-10" stroke-width="1"/>
                       <polygon points="100,70 126,83 126,117 100,130 74,117 74,83" fill="none" stroke="currentColor" class="opacity-10" stroke-width="1"/>
                       
                       <line x1="100" y1="100" x2="100" y2="10" stroke="currentColor" class="opacity-10" stroke-width="1"/>
                       <line x1="100" y1="100" x2="180" y2="50" stroke="currentColor" class="opacity-10" stroke-width="1"/>
                       <line x1="100" y1="100" x2="180" y2="150" stroke="currentColor" class="opacity-10" stroke-width="1"/>
                       <line x1="100" y1="100" x2="100" y2="190" stroke="currentColor" class="opacity-10" stroke-width="1"/>
                       <line x1="100" y1="100" x2="20" y2="150" stroke="currentColor" class="opacity-10" stroke-width="1"/>
                       <line x1="100" y1="100" x2="20" y2="50" stroke="currentColor" class="opacity-10" stroke-width="1"/>
                       
                       <polygon :points="radarData.polygon" :fill="activeSeasonInk.backgroundColor" :stroke="activeSeasonInk.backgroundColor" stroke-width="1.5" class="opacity-45 transition-all duration-1000 ease-out"/>
                       
                       <circle v-for="(p, i) in radarData.points" :key="i" :cx="p.x" :cy="p.y" r="2.5" :fill="activeSeasonInk.backgroundColor" class="transition-all duration-1000 ease-out"/>
                    </svg>

                    <!-- Interactive Labels -->
                    <span @mouseenter="hoveredMetric = 'Speed'" @mouseleave="hoveredMetric = null" class="absolute -top-4 left-1/2 -translate-x-1/2 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1" :class="hoveredMetric === 'Speed' ? 'opacity-100' : 'opacity-60'" :style="hoveredMetric === 'Speed' ? { color: activeSeasonInk.backgroundColor } : undefined">Speed</span>
                    <span @mouseenter="hoveredMetric = 'Clarity'" @mouseleave="hoveredMetric = null" class="absolute top-[18%] -right-8 sm:-right-10 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1" :class="hoveredMetric === 'Clarity' ? 'opacity-100' : 'opacity-60'" :style="hoveredMetric === 'Clarity' ? { color: activeSeasonInk.backgroundColor } : undefined">Clarity</span>
                    <span @mouseenter="hoveredMetric = 'Consistency'" @mouseleave="hoveredMetric = null" class="absolute bottom-[18%] -right-10 sm:-right-12 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1" :class="hoveredMetric === 'Consistency' ? 'opacity-100' : 'opacity-60'" :style="hoveredMetric === 'Consistency' ? { color: activeSeasonInk.backgroundColor } : undefined">Consistency</span>
                    <span @mouseenter="hoveredMetric = 'Focus'" @mouseleave="hoveredMetric = null" class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1" :class="hoveredMetric === 'Focus' ? 'opacity-100' : 'opacity-60'" :style="hoveredMetric === 'Focus' ? { color: activeSeasonInk.backgroundColor } : undefined">Focus</span>
                    <span @mouseenter="hoveredMetric = 'Resilience'" @mouseleave="hoveredMetric = null" class="absolute bottom-[18%] -left-10 sm:-left-12 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1" :class="hoveredMetric === 'Resilience' ? 'opacity-100' : 'opacity-60'" :style="hoveredMetric === 'Resilience' ? { color: activeSeasonInk.backgroundColor } : undefined">Resilience</span>
                    <span @mouseenter="hoveredMetric = 'Stamina'" @mouseleave="hoveredMetric = null" class="absolute top-[18%] -left-8 sm:-left-10 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1" :class="hoveredMetric === 'Stamina' ? 'opacity-100' : 'opacity-60'" :style="hoveredMetric === 'Stamina' ? { color: activeSeasonInk.backgroundColor } : undefined">Stamina</span>
                 </div>

                 <!-- Dynamic Tooltip Display -->
                 <div class="h-10 mt-6 flex items-start justify-center text-center px-4 w-full max-w-[200px] transition-all duration-500" 
                      :class="hoveredMetric ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'">
                   <p class="text-[7px] sm:text-[8px] leading-relaxed tracking-widest font-ui-sans" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-600'">
                     <span class="font-semibold mr-1 transition-colors duration-700" :style="{ color: activeSeasonInk.backgroundColor }">{{ hoveredMetric }}:</span> 
                     {{ hoveredMetric ? metricDefinitions[hoveredMetric] : '' }}
                   </p>
                 </div>
                 
              </div>

              <!-- RIGHT (2/3): SEARCH & EXPANDABLE STATS -->
              <div class="w-full lg:w-2/3 flex flex-col">
                 
                 <!-- SEARCH BAR -->
                 <div class="w-full border-b pb-3 mb-4 flex items-center gap-3 transition-colors duration-300" :class="settings.darkMode ? 'border-stone-800 focus-within:border-stone-500' : 'border-stone-300 focus-within:border-stone-500'">
                    <svg class="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input v-model="searchQuery" type="search" aria-label="Search meditation passages" placeholder="Search meditation passages..." class="w-full bg-transparent text-xs tracking-widest uppercase focus:outline-none placeholder:opacity-50 font-ui-sans" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
                 </div>

                 <!-- OVERALL STATS CONTAINER -->
                 <div class="w-full relative py-6 px-4 transition-all duration-700 ease-in-out min-h-[120px]">
                   <div class="absolute inset-0 pointer-events-none rounded-sm opacity-[0.12] transition-[background-color,opacity] duration-700" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></div>
                   
                   <div class="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 relative z-10 text-center">
                     <div class="flex flex-col gap-1.5">
                       <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] opacity-50 font-ui-sans font-semibold">Passages</span>
                       <span class="text-lg sm:text-xl font-light font-ui-serif">{{ meditationSummary.passages }}</span>
                     </div>
                     <div class="flex flex-col gap-1.5">
                       <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] opacity-50 font-ui-sans font-semibold">Avg Clarity</span>
                       <span class="text-lg sm:text-xl font-light font-ui-serif">{{ meditationSummary.accuracy }}%</span>
                     </div>
                     <div class="flex flex-col gap-1.5">
                       <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] opacity-50 font-ui-sans font-semibold">Avg Speed</span>
                       <span class="text-lg sm:text-xl font-light font-ui-serif">{{ meditationSummary.wpm }} <span class="text-[7px] opacity-40 font-ui-sans">WPM</span></span>
                     </div>
                     <div class="flex flex-col gap-1.5">
                       <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] opacity-50 font-ui-sans font-semibold">Reflections</span>
                       <span class="text-lg sm:text-xl font-light font-ui-serif">{{ meditationSummary.reflections }}</span>
                     </div>
                   </div>

                   <!-- INLINE SEARCH RESULTS -->
                   <div v-if="searchQuery.trim()" class="relative z-10 w-full flex flex-col mt-8 pt-6 border-t animate-fade-in" :class="settings.darkMode ? 'border-stone-700/40' : 'border-stone-400/40'">
                     
                     <div v-if="filteredPassages.length > 0" class="flex flex-col w-full gap-2">
                       <div v-for="passage in filteredPassages" :key="passage.id" class="flex flex-col w-full">
                         
                         <button @click="expandedPassageId = expandedPassageId === passage.id ? null : passage.id" 
                                 class="w-full py-4 px-2 sm:px-4 flex items-center justify-between group cursor-pointer transition-all hover:bg-stone-500/5 rounded-sm">
                           
                           <div class="flex items-baseline gap-4 text-left">
                             <span class="font-ui-serif text-base sm:text-lg tracking-wide transition-opacity duration-500" 
                                   :class="settings.darkMode ? 'text-stone-200 group-hover:text-stone-100' : 'text-stone-700 group-hover:text-stone-900'">
                               {{ passage.label }}
                             </span>
                             <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] transition-opacity duration-500 font-semibold"
                                   :class="settings.darkMode ? 'opacity-30 group-hover:opacity-60' : 'opacity-40 group-hover:opacity-70'">
                               {{ passage.attempts.length }} {{ passage.attempts.length === 1 ? 'Reflection' : 'Reflections' }}
                             </span>
                           </div>
                           
                           <div class="flex items-center gap-6 text-[8px] sm:text-[9px] uppercase tracking-widest font-ui-sans">
                             <div class="flex items-center gap-4 transition-opacity duration-500"
                                  :class="settings.darkMode ? 'opacity-50 group-hover:opacity-90' : 'opacity-60 group-hover:opacity-100'">
                               <span :style="passage.attempts[passage.attempts.length-1].accuracy === 100 ? { color: activeSeasonInk.backgroundColor } : undefined">
                                 {{ passage.attempts[passage.attempts.length-1].accuracy }}%
                               </span>
                               <span class="w-10 text-right">{{ passage.attempts[passage.attempts.length-1].wpm }} <span class="text-[6px] opacity-60">WPM</span></span>
                             </div>
                           </div>
                         </button>
                         
                         <!-- Expanded Retries View -->
                         <div v-if="expandedPassageId === passage.id" class="w-full pb-6 pt-2 px-4 sm:px-6 animate-fade-in">
                           <div class="pl-2 sm:pl-4 flex flex-col gap-3">
                             
                             <div v-for="(attempt, index) in passage.attempts" :key="index" 
                                  class="flex justify-between items-center text-[7px] sm:text-[8px] uppercase tracking-[0.3em] font-ui-sans">
                               
                               <span :class="index === passage.attempts.length - 1 ? (settings.darkMode ? 'text-stone-300 font-semibold' : 'text-stone-700 font-semibold') : 'opacity-40'">
                                 Attempt {{ index + 1 }}
                               </span>
                               
                               <div class="flex gap-4 sm:gap-6 justify-end" :class="index === passage.attempts.length - 1 ? (settings.darkMode ? 'text-stone-300 font-semibold' : 'text-stone-800 font-semibold') : 'opacity-40'">
                                 <span :style="attempt.accuracy === 100 ? { color: activeSeasonInk.backgroundColor } : undefined">{{ attempt.accuracy }}%</span>
                                 <span class="w-10 text-right">{{ attempt.wpm }} <span class="text-[6px] opacity-50">WPM</span></span>
                               </div>
                             </div>
                             
                           </div>
                         </div>

                       </div>
                     </div>
                     
                     <!-- Empty Search State -->
                     <div v-else class="py-6 text-center opacity-40 text-[8px] uppercase tracking-[0.3em]">
                       No passages found matching "{{ searchQuery }}"
                     </div>
                   </div>

                 </div>

              </div>
            </div>

          </div>
        </div>

        <!-- NEW: ACTIONS & ENLIGHTENMENTS -->
        <template v-if="!isEditing">
          <div class="order-3 flex flex-col items-center w-full animate-fade-in md:col-start-1 md:row-start-2 pt-8 border-t md:border-t-0" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
            
            <div class="flex flex-col items-center mb-10 w-full max-w-[260px] md:max-w-[200px] border-b pb-10" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
              <h3 class="text-[9px] uppercase tracking-[0.3em] mb-8 opacity-70 font-semibold" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Enlightenments</h3>
              
              <!-- Achievement Grid -->
              <div class="grid grid-cols-2 gap-4 relative">
                 <!-- 1. The First Step (Enso Circle) -->
                 <div @mouseenter="hoveredAchievement = 'firstStep'" @mouseleave="hoveredAchievement = null" 
                      class="w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 cursor-help"
                      :class="stats.achievements?.firstStep?.unlocked ? '' : (settings.darkMode ? 'border-stone-800 text-stone-700 border-dashed' : 'border-stone-300 text-stone-300 border-dashed')" :style="achievementInk(stats.achievements?.firstStep?.unlocked)">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" stroke-linecap="round"/></svg>
                 </div>

                 <!-- 2. Still Water (Ripples) -->
                 <div @mouseenter="hoveredAchievement = 'stillWater'" @mouseleave="hoveredAchievement = null" 
                      class="w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 cursor-help"
                      :class="stats.achievements?.stillWater?.unlocked ? '' : (settings.darkMode ? 'border-stone-800 text-stone-700 border-dashed' : 'border-stone-300 text-stone-300 border-dashed')" :style="achievementInk(stats.achievements?.stillWater?.unlocked)">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="11"/></svg>
                 </div>

                 <!-- 3. Endless Journey (Infinity Path) -->
                 <div @mouseenter="hoveredAchievement = 'endlessJourney'" @mouseleave="hoveredAchievement = null" 
                      class="w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 cursor-help"
                      :class="stats.achievements?.endlessJourney?.unlocked ? '' : (settings.darkMode ? 'border-stone-800 text-stone-700 border-dashed' : 'border-stone-300 text-stone-300 border-dashed')" :style="achievementInk(stats.achievements?.endlessJourney?.unlocked)">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M8 8C4.686 8 2 10.686 2 14s2.686 6 6 6c2.5 0 4.5-1.5 5.5-3.5L16 10c1-2 3-3.5 5.5-3.5 3.314 0 6 2.686 6 6s-2.686 6-6 6" /></svg>
                 </div>

                 <!-- 4. Midnight Lotus (Moon) -->
                 <div @mouseenter="hoveredAchievement = 'midnightLotus'" @mouseleave="hoveredAchievement = null" 
                      class="w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 cursor-help"
                      :class="stats.achievements?.midnightLotus?.unlocked ? '' : (settings.darkMode ? 'border-stone-800 text-stone-700 border-dashed' : 'border-stone-300 text-stone-300 border-dashed')" :style="achievementInk(stats.achievements?.midnightLotus?.unlocked)">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/><path d="M12 18v4"/><path d="M8 20l4-2 4 2"/></svg>
                 </div>
              </div>
              
              <!-- Dynamic Achievement Tooltip -->
              <div class="h-12 mt-6 flex flex-col items-center justify-center text-center w-full transition-all duration-500" 
                   :class="hoveredAchievement ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'">
                <p class="text-[9px] uppercase tracking-widest font-semibold mb-1 transition-colors duration-700" :style="{ color: activeSeasonInk.backgroundColor }">
                  {{ hoveredAchievement ? achievementDefs[hoveredAchievement].name : '' }}
                </p>
                <p class="text-[7px] tracking-widest opacity-60 font-ui-sans" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-600'">
                  {{ hoveredAchievement ? achievementDefs[hoveredAchievement].desc : '' }}
                </p>
              </div>
            </div>

            <!-- MENU ACTIONS -->
            <div class="flex flex-col gap-4 w-full items-center max-w-[260px] md:max-w-[200px]">
              <button @click="handleLogout" class="relative px-6 py-3 md:py-2.5 w-full group transition-transform hover:scale-105">
                <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-red-500 opacity-5 group-hover:opacity-15' : 'bg-red-500 opacity-5 group-hover:opacity-10'" style="filter: url(#ink-blot);"></div>
                <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] font-semibold transition-colors" :class="settings.darkMode ? 'text-red-400 group-hover:text-red-300' : 'text-red-700 group-hover:text-red-600'">Sign out</span>
              </button>
              
              <button v-if="!showAuthModal" @click="router.push('/')" class="relative isolate px-6 py-3 md:py-2.5 w-full group transition-transform hover:scale-105">
                <div class="absolute inset-0 -z-10 rounded-full transition-[background-color,opacity] duration-700" :class="settings.darkMode ? 'opacity-[0.72] group-hover:opacity-[0.82]' : 'opacity-[0.62] group-hover:opacity-[0.72]'" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></div>
                <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] font-semibold transition-colors duration-700" :style="{ color: activeSeasonInk.color }">Return to Menu</span>
              </button>
            </div>
          </div>
        </template>

      </div>
    </template>

    <AuthModal v-if="showAuthModal" @close="handleModalClose" />
  </div>
</template>
