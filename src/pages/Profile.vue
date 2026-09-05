<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { settings, currentUser, stats } from '../store'
import { logOut, db } from '../services/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import AuthModal from '../components/AuthModal.vue'
import Heatmap from '../components/Heatmap.vue'
import { seasons } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'

const router = useRouter()
const showAuthModal = ref(false)
const activeTab = ref(getRealWorldSeason())
const expandedPassageId = ref(null)
const searchQuery = ref('') 

// Hover state for the Radar Chart Tooltip
const hoveredMetric = ref(null)

const metricDefinitions = {
  Speed: "The flowing current: Your average pace (WPM) across all passages.",
  Clarity: "The still water: Your overall accuracy and absence of missteps.",
  Consistency: "The steady breath: Frequency of reflections ending above 90% clarity.",
  Focus: "The unwavering mind: Ratio of completed passages to total retry attempts.",
  Resilience: "The rising tide: Frequency of your final attempt surpassing your first.",
  Stamina: "The endless journey: Your endurance, measured by total reflections made."
}

const isEditing = ref(false)
const customProfile = ref({
  bio: '', github: '', twitter: '', website: '', alias: 'A Wandering Soul', isAnonymous: false
})

const fetchProfile = async () => {
  if (!currentUser.value) return
  try {
    const docRef = doc(db, 'users', currentUser.value.uid)
    const snap = await getDoc(docRef)
    if (snap.exists() && snap.data().profile) {
      customProfile.value = { ...customProfile.value, ...snap.data().profile }
    }
  } catch (err) {
    console.error('Failed to fetch profile', err)
  }
}

const saveProfile = async () => {
  if (!currentUser.value) return
  try {
    const docRef = doc(db, 'users', currentUser.value.uid)
    await setDoc(docRef, { profile: customProfile.value }, { merge: true })
    isEditing.value = false
  } catch (err) {
    console.error('Failed to save profile', err)
  }
}

onMounted(() => {
  if (!currentUser.value) showAuthModal.value = true
  else fetchProfile()
})

watch(currentUser, (newUser) => {
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

const getSeasonAccuracy = (sIdx) => {
  const s = stats.value.seasonal[sIdx]
  if (!s || s.keystrokes === 0) return 100
  const correct = s.keystrokes - s.mistakes
  return Math.max(0, Math.round((correct / s.keystrokes) * 100))
}

const seasonalPassageHistory = computed(() => {
  if (!stats.value.passageHistory) return []
  const prefix = `season_${activeTab.value}_`
  
  return Object.entries(stats.value.passageHistory)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, attempts]) => {
      const num = key.split('_passage_')[1]
      return { id: key, number: num, attempts }
    })
    .sort((a, b) => parseInt(b.number) - parseInt(a.number)) 
})

const filteredPassages = computed(() => {
  if (!searchQuery.value.trim()) return [] 
  const query = searchQuery.value.trim().toLowerCase()
  return seasonalPassageHistory.value.filter(p => p.number.toString().includes(query))
})

const getSeasonAverages = computed(() => {
  let totalWPM = 0
  let totalReflections = 0
  let passagesCount = seasonalPassageHistory.value.length

  if (passagesCount === 0) return { wpm: 0, reflections: 0 }

  seasonalPassageHistory.value.forEach(p => {
    totalReflections += p.attempts.length
    const finalAttempt = p.attempts[p.attempts.length - 1]
    if (finalAttempt && finalAttempt.wpm) totalWPM += finalAttempt.wpm
  })

  return {
    wpm: Math.round(totalWPM / passagesCount),
    reflections: totalReflections
  }
})

// DYNAMIC MATH: Translates typing stats into 6 axes for the Radar Chart
const radarData = computed(() => {
  const history = seasonalPassageHistory.value
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
    
    <h2 class="text-2xl sm:text-3xl tracking-[0.3em] uppercase font-light mb-8 md:mb-12 flex-shrink-0 font-ui-serif w-full text-center md:text-left" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
      Traces of the Mind
    </h2>

    <template v-if="currentUser">
      <div class="flex flex-col md:grid md:grid-cols-[16rem_1fr] gap-y-12 md:gap-y-8 gap-x-12 md:gap-x-16 w-full items-center md:items-start">
        
        <!-- LEFT SIDEBAR: PROFILE INFO -->
        <div class="order-1 flex flex-col items-center flex-shrink-0 animate-fade-in text-center w-full md:col-start-1 md:row-start-1">
          <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-6 shadow-sm p-1" :class="settings.darkMode ? 'bg-stone-800/50' : 'bg-stone-300/30'">
             <img :src="customProfile.isAnonymous ? 'https://api.dicebear.com/7.x/shapes/svg?seed=zen' : (currentUser.photoURL || '/default-avatar.png')" alt="Profile" class="w-full h-full object-cover grayscale rounded-full hover:grayscale-0 transition-all duration-700" />
             <div class="absolute inset-0 rounded-full opacity-30 pointer-events-none" style="filter: url(#ink-blot);" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-400'"></div>
          </div>
          
          <div class="flex flex-col gap-1 w-full items-center px-2 md:px-0">
            <h1 class="text-xl tracking-widest font-ui-serif px-4 md:px-0" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">
              {{ customProfile.isAnonymous ? (customProfile.alias || 'A Wandering Soul') : (currentUser.displayName || 'Jhonnel Fernandez Anitan') }}
            </h1>
            
            <h2 v-if="!customProfile.isAnonymous" class="text-[9px] uppercase tracking-[0.2em] opacity-70 mb-6 font-semibold truncate w-full px-4" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">
              {{ currentUser.email || 'anitanjhonnel@gmail.com' }}
            </h2>
            <div v-else class="text-[9px] uppercase tracking-[0.2em] opacity-50 mb-6 italic" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-400'">
              Hidden Identity
            </div>
            
            <template v-if="!isEditing">
              <p class="text-xs leading-loose mb-6 opacity-90 font-light w-full max-w-[280px] md:max-w-[220px]" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
                {{ customProfile.bio || 'Silence is the root of all sound.' }}
              </p>
              
              <button @click="isEditing = true" class="relative px-6 py-2.5 w-full max-w-[260px] md:max-w-[200px] group transition-transform hover:scale-105 mb-10">
                <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-10 group-hover:opacity-20' : 'bg-stone-800 opacity-15 group-hover:opacity-25'" style="filter: url(#ink-blot);"></div>
                <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] font-semibold" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">Edit profile</span>
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
                    <span class="text-[8px] uppercase tracking-widest opacity-50">Reflection / Bio</span>
                    <textarea v-model="customProfile.bio" rows="3" placeholder="Share a reflection..." class="w-full bg-transparent border-b p-1 text-xs focus:outline-none resize-none" :class="settings.darkMode ? 'border-stone-700 text-stone-200 focus:border-stone-500' : 'border-stone-300 text-stone-800 focus:border-stone-500'"></textarea>
                  </div>
               </div>
               <div class="flex gap-4 w-full max-w-[260px] md:max-w-[200px] mb-8 mt-2 px-4 md:px-0">
                  <button @click="saveProfile" class="relative flex-1 py-3 md:py-2 group transition-transform hover:scale-105">
                    <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-10 group-hover:opacity-20' : 'bg-stone-800 opacity-15 group-hover:opacity-25'" style="filter: url(#ink-blot);"></div>
                    <span class="relative z-10 tracking-widest uppercase text-[9px] font-semibold" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">Save</span>
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
            
            <div class="w-full flex flex-wrap justify-center md:justify-start gap-2 sm:gap-4 mb-6 md:mb-12 border-b pb-4" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
              <button v-for="(season, index) in seasons" :key="index" @click="activeTab = index; searchQuery = ''" class="relative px-4 sm:px-5 py-2.5 text-[8px] sm:text-[9px] tracking-[0.25em] uppercase transition-all duration-300 group" :class="activeTab === index ? (settings.darkMode ? 'text-stone-100 font-semibold' : 'text-stone-900 font-semibold') : (settings.darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-700 hover:text-stone-900')">
                <div v-if="activeTab === index" class="absolute inset-0 rounded-sm pointer-events-none z-[-1] transition-opacity duration-300" :class="settings.darkMode ? 'bg-white opacity-[0.15]' : 'bg-stone-800 opacity-[0.12]'" style="filter: url(#ink-blot);"></div>
                <div v-if="activeTab !== index" class="absolute inset-0 rounded-sm pointer-events-none z-[-1] opacity-0 group-hover:opacity-[0.05] transition-opacity duration-300" :class="settings.darkMode ? 'bg-white' : 'bg-stone-800'" style="filter: url(#ink-blot);"></div>
                {{ season.name }}
              </button>
            </div>

            <!-- LAYOUT: 1/3 Chart, 2/3 Search & Stats -->
            <div class="flex flex-col lg:flex-row w-full gap-16 lg:gap-12 items-start mt-2">
              
              <!-- LEFT (1/3): RADAR CHART WITH HOVER LABELS -->
              <div class="w-full lg:w-1/3 flex flex-col items-center pt-2 relative">
                 <span class="text-[8px] sm:text-[9px] uppercase tracking-[0.4em] opacity-40 font-semibold mb-8 text-center">Path to Mastery</span>
                 
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
                       
                       <polygon :points="radarData.polygon" :fill="settings.darkMode ? 'rgba(223, 190, 115, 0.2)' : 'rgba(150, 150, 150, 0.2)'" :stroke="settings.darkMode ? '#DFBE73' : 'currentColor'" stroke-width="1.5" class="opacity-70 transition-all duration-1000 ease-out"/>
                       
                       <circle v-for="(p, i) in radarData.points" :key="i" :cx="p.x" :cy="p.y" r="2.5" :fill="settings.darkMode ? '#DFBE73' : 'currentColor'" class="transition-all duration-1000 ease-out"/>
                    </svg>

                    <!-- Interactive Labels -->
                    <span @mouseenter="hoveredMetric = 'Speed'" @mouseleave="hoveredMetric = null" 
                          class="absolute -top-4 left-1/2 -translate-x-1/2 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1"
                          :class="hoveredMetric === 'Speed' ? 'opacity-100 text-[#DFBE73]' : 'opacity-60'">Speed</span>
                    
                    <span @mouseenter="hoveredMetric = 'Clarity'" @mouseleave="hoveredMetric = null" 
                          class="absolute top-[18%] -right-8 sm:-right-10 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1"
                          :class="hoveredMetric === 'Clarity' ? 'opacity-100 text-[#DFBE73]' : 'opacity-60'">Clarity</span>
                    
                    <span @mouseenter="hoveredMetric = 'Consistency'" @mouseleave="hoveredMetric = null" 
                          class="absolute bottom-[18%] -right-10 sm:-right-12 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1"
                          :class="hoveredMetric === 'Consistency' ? 'opacity-100 text-[#DFBE73]' : 'opacity-60'">Consistency</span>
                    
                    <span @mouseenter="hoveredMetric = 'Focus'" @mouseleave="hoveredMetric = null" 
                          class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1"
                          :class="hoveredMetric === 'Focus' ? 'opacity-100 text-[#DFBE73]' : 'opacity-60'">Focus</span>
                    
                    <span @mouseenter="hoveredMetric = 'Resilience'" @mouseleave="hoveredMetric = null" 
                          class="absolute bottom-[18%] -left-10 sm:-left-12 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1"
                          :class="hoveredMetric === 'Resilience' ? 'opacity-100 text-[#DFBE73]' : 'opacity-60'">Resilience</span>
                    
                    <span @mouseenter="hoveredMetric = 'Stamina'" @mouseleave="hoveredMetric = null" 
                          class="absolute top-[18%] -left-8 sm:-left-10 text-[5px] sm:text-[6px] uppercase tracking-widest transition-opacity cursor-help p-1"
                          :class="hoveredMetric === 'Stamina' ? 'opacity-100 text-[#DFBE73]' : 'opacity-60'">Stamina</span>
                 </div>

                 <!-- Dynamic Tooltip Display -->
                 <div class="h-10 mt-6 flex items-start justify-center text-center px-4 w-full max-w-[200px] transition-all duration-500" 
                      :class="hoveredMetric ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'">
                   <p class="text-[7px] sm:text-[8px] leading-relaxed tracking-widest font-ui-sans" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-600'">
                     <span class="text-[#DFBE73] font-semibold mr-1">{{ hoveredMetric }}:</span> 
                     {{ hoveredMetric ? metricDefinitions[hoveredMetric] : '' }}
                   </p>
                 </div>
                 
              </div>

              <!-- RIGHT (2/3): SEARCH & EXPANDABLE STATS -->
              <div class="w-full lg:w-2/3 flex flex-col">
                 
                 <!-- SEARCH BAR -->
                 <div class="w-full border-b pb-3 mb-4 flex items-center gap-3 transition-colors duration-300" :class="settings.darkMode ? 'border-stone-800 focus-within:border-stone-500' : 'border-stone-300 focus-within:border-stone-500'">
                    <svg class="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input v-model="searchQuery" type="text" placeholder="Search a passage number..." class="w-full bg-transparent text-xs tracking-widest uppercase focus:outline-none placeholder:opacity-30 font-ui-sans" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
                 </div>

                 <!-- OVERALL STATS CONTAINER -->
                 <div class="w-full relative py-6 px-4 transition-all duration-700 ease-in-out min-h-[120px]">
                   <div class="absolute inset-0 pointer-events-none opacity-[0.04] rounded-sm transition-all duration-700" :class="settings.darkMode ? 'bg-white' : 'bg-black'" style="filter: url(#ink-blot);"></div>
                   
                   <div class="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 relative z-10 text-center">
                     <div class="flex flex-col gap-1.5">
                       <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] opacity-50 font-ui-sans font-semibold">Passages</span>
                       <span class="text-lg sm:text-xl font-light font-ui-serif">{{ stats.seasonal[activeTab].passages }}</span>
                     </div>
                     <div class="flex flex-col gap-1.5">
                       <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] opacity-50 font-ui-sans font-semibold">Avg Clarity</span>
                       <span class="text-lg sm:text-xl font-light font-ui-serif">{{ getSeasonAccuracy(activeTab) }}%</span>
                     </div>
                     <div class="flex flex-col gap-1.5">
                       <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] opacity-50 font-ui-sans font-semibold">Avg Speed</span>
                       <span class="text-lg sm:text-xl font-light font-ui-serif">{{ getSeasonAverages.wpm }} <span class="text-[7px] opacity-40 font-ui-sans">WPM</span></span>
                     </div>
                     <div class="flex flex-col gap-1.5">
                       <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] opacity-50 font-ui-sans font-semibold">Reflections</span>
                       <span class="text-lg sm:text-xl font-light font-ui-serif">{{ getSeasonAverages.reflections }}</span>
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
                               Passage {{ passage.number }}
                             </span>
                             <span class="text-[6px] sm:text-[7px] uppercase tracking-[0.3em] transition-opacity duration-500 font-semibold"
                                   :class="settings.darkMode ? 'opacity-30 group-hover:opacity-60' : 'opacity-40 group-hover:opacity-70'">
                               {{ passage.attempts.length }} {{ passage.attempts.length === 1 ? 'Reflection' : 'Reflections' }}
                             </span>
                           </div>
                           
                           <div class="flex items-center gap-6 text-[8px] sm:text-[9px] uppercase tracking-widest font-ui-sans">
                             <div class="flex items-center gap-4 transition-opacity duration-500"
                                  :class="settings.darkMode ? 'opacity-50 group-hover:opacity-90' : 'opacity-60 group-hover:opacity-100'">
                               <span :class="passage.attempts[passage.attempts.length-1].accuracy === 100 ? 'text-[#DFBE73]' : ''">
                                 {{ passage.attempts[passage.attempts.length-1].accuracy }}%
                               </span>
                               <span class="w-10 text-right">{{ passage.attempts[passage.attempts.length-1].wpm }} <span class="text-[6px] opacity-60">WPM</span></span>
                             </div>
                           </div>
                         </button>
                         
                         <!-- Expanded Retries View (Clean, borderless, smaller text) -->
                         <div v-if="expandedPassageId === passage.id" class="w-full pb-6 pt-2 px-4 sm:px-6 animate-fade-in">
                           <div class="pl-2 sm:pl-4 flex flex-col gap-3">
                             
                             <div v-for="(attempt, index) in passage.attempts" :key="index" 
                                  class="flex justify-between items-center text-[7px] sm:text-[8px] uppercase tracking-[0.3em] font-ui-sans">
                               
                               <span :class="index === passage.attempts.length - 1 ? (settings.darkMode ? 'text-stone-300 font-semibold' : 'text-stone-700 font-semibold') : 'opacity-40'">
                                 Attempt {{ index + 1 }}
                               </span>
                               
                               <div class="flex gap-4 sm:gap-6 justify-end" :class="index === passage.attempts.length - 1 ? (settings.darkMode ? 'text-stone-300 font-semibold' : 'text-stone-800 font-semibold') : 'opacity-40'">
                                 <span :class="attempt.accuracy === 100 ? 'text-[#DFBE73]' : ''">{{ attempt.accuracy }}%</span>
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

        <!-- ACTIONS & ACHIEVEMENTS -->
        <template v-if="!isEditing">
          <div class="order-3 flex flex-col items-center w-full animate-fade-in md:col-start-1 md:row-start-2 pt-8 border-t md:border-t-0" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
            <div class="flex flex-col items-center mb-10 w-full max-w-[260px] md:max-w-[200px] border-b pb-10" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
              <h3 class="text-[9px] uppercase tracking-[0.3em] mb-6 opacity-70 font-semibold" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Achievements</h3>
              <div class="flex gap-4">
                 <div class="w-10 h-10 rounded-full opacity-50 border border-dashed flex items-center justify-center text-[8px] uppercase tracking-widest" :class="settings.darkMode ? 'border-stone-400 text-stone-300' : 'border-stone-500 text-stone-700'">?</div>
                 <div class="w-10 h-10 rounded-full opacity-50 border border-dashed flex items-center justify-center text-[8px] uppercase tracking-widest" :class="settings.darkMode ? 'border-stone-400 text-stone-300' : 'border-stone-500 text-stone-700'">?</div>
              </div>
            </div>

            <div class="flex flex-col gap-4 w-full items-center max-w-[260px] md:max-w-[200px]">
              <button @click="handleLogout" class="relative px-6 py-3 md:py-2.5 w-full group transition-transform hover:scale-105">
                <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-red-500 opacity-5 group-hover:opacity-15' : 'bg-red-500 opacity-5 group-hover:opacity-10'" style="filter: url(#ink-blot);"></div>
                <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] font-semibold transition-colors" :class="settings.darkMode ? 'text-red-400 group-hover:text-red-300' : 'text-red-700 group-hover:text-red-600'">Sign out</span>
              </button>
              
              <button v-if="!showAuthModal" @click="router.push('/')" class="relative px-6 py-3 md:py-2.5 w-full group transition-transform hover:scale-105">
                <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-15' : 'bg-stone-800 opacity-5 group-hover:opacity-10'" style="filter: url(#ink-blot);"></div>
                <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] font-semibold transition-colors" :class="settings.darkMode ? 'text-stone-400 group-hover:text-stone-200' : 'text-stone-600 group-hover:text-stone-900'">Return to Menu</span>
              </button>
            </div>
          </div>
        </template>

      </div>
    </template>

    <AuthModal v-if="showAuthModal" @close="handleModalClose" />
  </div>
</template>