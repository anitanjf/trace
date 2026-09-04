<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { settings, currentUser } from '../store'
import { fontOptions, seasons } from '../utils/constants'
import AuthModal from '../components/AuthModal.vue'

const router = useRouter()
const showAuthModal = ref(false)

onMounted(() => {
  if (!currentUser.value) showAuthModal.value = true
})

watch(currentUser, (newUser) => {
  if (newUser) showAuthModal.value = false
})

const handleModalClose = () => {
  showAuthModal.value = false
  if (!currentUser.value) {
    router.push('/')
  }
}

const availableLockedSeasons = computed(() => {
  return seasons.map((season, index) => ({ name: season.name, index }))
})

const fontClass = computed(() => {
  switch(settings.value.fontFamily) {
    case 'minimalist': return 'poem-text-minimalist'
    case 'antique': return 'poem-text-antique'
    case 'classic': return 'poem-text-classic'
    case 'modern': return 'poem-text-modern'
    case 'mono': return 'poem-text-mono'
    case 'brush': return 'poem-text-brush'
    case 'sumi': return 'poem-text-sumi'
    case 'calligraphy': default: return 'poem-text-calligraphy'
  }
})

// --- THEME LOGIC HANDLERS ---
const setRealtimeMode = () => {
  settings.value.themeMode = 'realtime'
  settings.value.darkMode = false
  settings.value.timeAtmosphere = true
}

const setLockedMode = () => {
  settings.value.themeMode = 'locked'
}

const toggleDarkMode = () => {
  if (settings.value.themeMode === 'realtime') return // Locked in Real-Time
  
  settings.value.darkMode = !settings.value.darkMode
  
  // If Night Mode turns ON, force Time Atmosphere OFF
  if (settings.value.darkMode) {
    settings.value.timeAtmosphere = false
  }
}

const toggleTimeAtmosphere = () => {
  if (settings.value.themeMode === 'realtime') return // Locked in Real-Time
  if (settings.value.darkMode) return // Locked if Night Mode is already ON
  
  settings.value.timeAtmosphere = !settings.value.timeAtmosphere
}
</script>

<template>
  <div class="z-10 flex flex-col items-center justify-center w-full max-w-md h-[85vh] py-8 font-ui-sans relative">
    <h2 class="text-3xl tracking-[0.3em] uppercase font-light mb-6 flex-shrink-0 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">Preferences</h2>
    
    <div class="w-full flex-1 overflow-y-auto no-scrollbar flex flex-col gap-8 px-4 pb-8 mask-fade-edges pt-4">
      
      <template v-if="currentUser">
        
        <div class="flex flex-col gap-3">
          <span class="text-[10px] tracking-widest uppercase opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-800'">Typography Style</span>
          <div class="flex flex-wrap justify-center gap-2">
             <button v-for="font in fontOptions" :key="font.id" @click="settings.fontFamily = font.id" class="px-2 w-[30%] relative py-2.5 text-[10px] uppercase tracking-wider transition-all group">
               <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.fontFamily === font.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                 <div class="absolute inset-0 rounded-xl" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.15) rotate(1deg);"></div>
               </div>
               <span class="relative z-10 transition-colors" :class="settings.fontFamily === font.id ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : (settings.darkMode ? 'text-stone-500' : 'text-stone-600')">{{ font.label }}</span>
             </button>
          </div>
          <div class="mt-4 p-5 rounded-lg flex flex-col items-center justify-center transition-colors relative overflow-hidden" :class="settings.darkMode ? 'bg-stone-900/30' : 'bg-white/40'">
            <div class="absolute inset-0 opacity-20 pointer-events-none" style="filter: url(#ink-blot); background: linear-gradient(135deg, rgba(223,190,115,0.4), transparent);"></div>
            <span class="text-[8px] uppercase tracking-widest opacity-60 mb-3 font-ui-sans relative z-10" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">Live Preview</span>
            <span class="text-lg text-center transition-all duration-500 relative z-10" :class="[fontClass, settings.darkMode ? 'text-stone-200' : 'text-stone-800']">
              "Empty your mind. Be formless, shapeless — like water."
            </span>
          </div>
        </div>

        <!-- Custom Dark Mode Toggle -->
        <div class="flex justify-between items-center transition-opacity duration-300" :class="settings.themeMode === 'realtime' ? 'opacity-40 pointer-events-none' : ''">
          <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-700'">Night Mode</span>
          <div class="flex gap-1">
            <button @click="settings.darkMode && toggleDarkMode()" class="relative w-14 py-1.5 text-[9px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="!settings.darkMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(-1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="!settings.darkMode ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">Off</span>
            </button>
            <button @click="!settings.darkMode && toggleDarkMode()" class="relative w-14 py-1.5 text-[9px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.darkMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="settings.darkMode ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">On</span>
            </button>
          </div>
        </div>

        <!-- Custom Pure Zen Toggle -->
        <div class="flex justify-between items-center transition-opacity duration-300">
          <div class="flex flex-col">
            <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-700'">Pure Zen</span>
            <span class="text-[9px] uppercase tracking-widest mt-1 opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-800'">No Punctuation</span>
          </div>
          <div class="flex gap-1">
            <button @click="settings.pureZen = false" class="relative w-14 py-1.5 text-[9px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="!settings.pureZen ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(-1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="!settings.pureZen ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">Off</span>
            </button>
            <button @click="settings.pureZen = true" class="relative w-14 py-1.5 text-[9px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.pureZen ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="settings.pureZen ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">On</span>
            </button>
          </div>
        </div>

        <!-- Custom Live Speed Toggle -->
        <div class="flex justify-between items-center transition-opacity duration-300">
          <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-700'">Live Speed</span>
          <div class="flex gap-1">
            <button @click="settings.showLiveWPM = false" class="relative w-14 py-1.5 text-[9px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="!settings.showLiveWPM ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(-1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="!settings.showLiveWPM ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">Off</span>
            </button>
            <button @click="settings.showLiveWPM = true" class="relative w-14 py-1.5 text-[9px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.showLiveWPM ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="settings.showLiveWPM ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">On</span>
            </button>
          </div>
        </div>
        
        <div class="w-full h-[1px] opacity-20 my-1 flex-shrink-0" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-800'"></div>

        <!-- Custom Time Atmosphere Toggle -->
        <div class="flex justify-between items-center transition-opacity duration-300" :class="(settings.themeMode === 'realtime' || settings.darkMode) ? 'opacity-40 pointer-events-none' : ''">
          <div class="flex flex-col">
            <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-700'">Time-of-Day Vibe</span>
            <span class="text-[9px] uppercase tracking-widest mt-1 opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-800'">Dynamic Lighting</span>
          </div>
          <div class="flex gap-1">
            <button @click="settings.timeAtmosphere && toggleTimeAtmosphere()" class="relative w-14 py-1.5 text-[9px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="!settings.timeAtmosphere ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(-1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="!settings.timeAtmosphere ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">Off</span>
            </button>
            <button @click="!settings.timeAtmosphere && toggleTimeAtmosphere()" class="relative w-14 py-1.5 text-[9px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.timeAtmosphere ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="settings.timeAtmosphere ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">On</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <span class="text-[10px] tracking-widest uppercase opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-800'">Theme Style</span>
          <div class="grid grid-cols-2 gap-2">
            
            <button @click="setRealtimeMode" class="relative py-2.5 text-[10px] uppercase tracking-wider transition-all group">
               <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.themeMode === 'realtime' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                 <div class="absolute inset-0 rounded-xl" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.15) rotate(-1deg);"></div>
               </div>
               <span class="relative z-10 transition-colors" :class="settings.themeMode === 'realtime' ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : (settings.darkMode ? 'text-stone-500' : 'text-stone-600')">Real-Time</span>
            </button>
            
            <button @click="setLockedMode" class="relative py-2.5 text-[10px] uppercase tracking-wider transition-all group">
               <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.themeMode === 'locked' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                 <div class="absolute inset-0 rounded-xl" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.15) rotate(1deg);"></div>
               </div>
               <span class="relative z-10 transition-colors" :class="settings.themeMode === 'locked' ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : (settings.darkMode ? 'text-stone-500' : 'text-stone-600')">Locked Season</span>
            </button>
            
          </div>
        </div>

        <div v-if="settings.themeMode === 'locked'" class="flex flex-col gap-2 animate-fade-in pt-1 pb-4">
          <span class="text-[9px] tracking-widest uppercase opacity-60 text-center" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-800'">Select Season</span>
          <div class="flex flex-wrap justify-center gap-2">
             <button v-for="seasonObj in availableLockedSeasons" :key="seasonObj.index" @click="settings.lockedSeason = seasonObj.index" class="relative px-4 py-2 text-[9px] uppercase tracking-wider transition-all group">
               <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.lockedSeason === seasonObj.index ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                 <div class="absolute inset-0 rounded-xl" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.2) rotate(-1deg);"></div>
               </div>
               <span class="relative z-10 transition-colors" :class="settings.lockedSeason === seasonObj.index ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : (settings.darkMode ? 'text-stone-500' : 'text-stone-600')">{{ seasonObj.name }}</span>
             </button>
          </div>
        </div>

      </template>

    </div>

    <button v-if="!showAuthModal" @click="router.push('/')" class="relative px-8 py-3 group transition-transform hover:scale-105 mt-12 font-ui-sans">
        <div class="absolute inset-0 rounded-full transition-opacity" 
            :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" 
            style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs"
                :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
            Return to Menu
        </span>
    </button>

    <AuthModal v-if="showAuthModal" @close="handleModalClose" />
  </div>
</template>