<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { settings, currentUser } from '../store'
import { fontOptions, seasons } from '../utils/constants'

const router = useRouter()
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

const previewReadabilityClass = computed(() => [
  settings.value.textSize === 'small' ? 'text-base' : settings.value.textSize === 'large' ? 'text-xl' : 'text-lg',
  settings.value.lineSpacing === 'compact' ? 'leading-relaxed' : settings.value.lineSpacing === 'spacious' ? 'leading-[2.2]' : 'leading-loose',
  settings.value.textAlignment === 'left' ? 'text-left w-full' : 'text-center'
])

const appearanceOptions = ['system', 'light', 'dark']

const chooseAppearance = (mode) => {
  settings.value.appearanceMode = mode
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  settings.value.darkMode = mode === 'dark' || (mode === 'system' && prefersDark)
}

const chooseAutomaticAtmosphere = () => {
  settings.value.themeMode = 'realtime'
}

const chooseSeason = (index) => {
  settings.value.themeMode = 'locked'
  settings.value.lockedSeason = index
}
</script>

<template>
  <div class="z-10 flex flex-col items-center justify-center w-full max-w-md h-[85vh] py-8 font-ui-sans relative">
    <h2 class="text-3xl tracking-[0.3em] uppercase font-light mb-6 flex-shrink-0 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">Preferences</h2>
    
    <div class="w-full flex-1 overflow-y-auto no-scrollbar flex flex-col gap-8 px-4 pb-8 mask-fade-edges pt-4">
      
        
        <div class="flex flex-col gap-3">
          <span class="text-xs tracking-widest uppercase opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-800'">Typography Style</span>
          <div class="flex flex-wrap justify-center gap-2">
             <button v-for="font in fontOptions" :key="font.id" @click="settings.fontFamily = font.id" :aria-pressed="settings.fontFamily === font.id" class="px-2 w-[30%] relative py-2.5 text-xs uppercase tracking-wider transition-all group">
               <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.fontFamily === font.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                 <div class="absolute inset-0 rounded-xl" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.15) rotate(1deg);"></div>
               </div>
               <span class="relative z-10 transition-colors" :class="settings.fontFamily === font.id ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : (settings.darkMode ? 'text-stone-500' : 'text-stone-600')">{{ font.label }}</span>
             </button>
          </div>
          <div class="mt-4 p-5 rounded-lg flex flex-col items-center justify-center transition-colors relative overflow-hidden" :class="settings.darkMode ? 'bg-stone-900/30' : 'bg-white/40'">
            <div class="absolute inset-0 opacity-20 pointer-events-none" style="filter: url(#ink-blot); background: linear-gradient(135deg, rgba(223,190,115,0.4), transparent);"></div>
            <span class="text-[11px] uppercase tracking-widest opacity-60 mb-3 font-ui-sans relative z-10" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">Live Preview</span>
            <span class="text-lg text-center transition-all duration-500 relative z-10" :class="[fontClass, previewReadabilityClass, settings.darkMode ? 'text-stone-200' : 'text-stone-800']">
              "Empty your mind. Be formless, shapeless — like water."
            </span>
          </div>
        </div>

        <!-- Reading comfort -->
        <div class="flex flex-col gap-4">
          <div class="flex flex-col">
            <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Reading Comfort</span>
            <span class="text-xs uppercase tracking-wide mt-1 opacity-75" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Adjust the passage without changing its words</span>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-xs uppercase tracking-wider" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Text size</span>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="size in ['small', 'medium', 'large']" :key="size" @click="settings.textSize = size" class="min-h-11 rounded-lg px-2 text-xs uppercase tracking-wide" :class="settings.textSize === size ? (settings.darkMode ? 'bg-stone-600 text-white' : 'bg-stone-300 text-stone-900') : (settings.darkMode ? 'text-stone-300' : 'text-stone-700')" :aria-pressed="settings.textSize === size">{{ size }}</button>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-xs uppercase tracking-wider" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Line spacing</span>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="spacing in ['compact', 'comfortable', 'spacious']" :key="spacing" @click="settings.lineSpacing = spacing" class="min-h-11 rounded-lg px-1 text-[11px] uppercase tracking-normal" :class="settings.lineSpacing === spacing ? (settings.darkMode ? 'bg-stone-600 text-white' : 'bg-stone-300 text-stone-900') : (settings.darkMode ? 'text-stone-300' : 'text-stone-700')" :aria-pressed="settings.lineSpacing === spacing">{{ spacing }}</button>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-xs uppercase tracking-wider" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Alignment</span>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="alignment in ['left', 'center']" :key="alignment" @click="settings.textAlignment = alignment" class="min-h-11 rounded-lg px-2 text-xs uppercase tracking-wide" :class="settings.textAlignment === alignment ? (settings.darkMode ? 'bg-stone-600 text-white' : 'bg-stone-300 text-stone-900') : (settings.darkMode ? 'text-stone-300' : 'text-stone-700')" :aria-pressed="settings.textAlignment === alignment">{{ alignment }}</button>
            </div>
          </div>
        </div>

        <!-- Appearance -->
        <div class="flex flex-col gap-3">
          <div class="flex flex-col">
            <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Appearance</span>
            <span class="text-xs uppercase tracking-widest mt-1 opacity-70" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Choose how light and dark colors behave</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="mode in appearanceOptions" :key="mode" @click="chooseAppearance(mode)" class="relative min-h-11 px-3 py-2 text-xs uppercase tracking-wider rounded-lg transition-colors" :class="settings.appearanceMode === mode ? (settings.darkMode ? 'bg-stone-600 text-white' : 'bg-stone-300 text-stone-900') : (settings.darkMode ? 'text-stone-400 hover:bg-stone-800/50' : 'text-stone-600 hover:bg-white/50')" :aria-pressed="settings.appearanceMode === mode">{{ mode }}</button>
          </div>
        </div>

        <!-- Custom Pure Zen Toggle -->
        <div class="flex justify-between items-center transition-opacity duration-300">
          <div class="flex flex-col">
            <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-700'">Pure Zen</span>
            <span class="text-[11px] uppercase tracking-widest mt-1 opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-800'">No Punctuation</span>
          </div>
          <div class="flex gap-1">
            <button @click="settings.pureZen = false" :aria-pressed="!settings.pureZen" aria-label="Turn Pure Zen off" class="relative w-14 py-1.5 text-[11px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="!settings.pureZen ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(-1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="!settings.pureZen ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">Off</span>
            </button>
            <button @click="settings.pureZen = true" :aria-pressed="settings.pureZen" aria-label="Turn Pure Zen on" class="relative w-14 py-1.5 text-[11px] uppercase tracking-wider transition-all group">
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
            <button @click="settings.showLiveWPM = false" :aria-pressed="!settings.showLiveWPM" aria-label="Hide live typing speed" class="relative w-14 py-1.5 text-[11px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="!settings.showLiveWPM ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(-1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="!settings.showLiveWPM ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">Off</span>
            </button>
            <button @click="settings.showLiveWPM = true" :aria-pressed="settings.showLiveWPM" aria-label="Show live typing speed" class="relative w-14 py-1.5 text-[11px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.showLiveWPM ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1) rotate(1deg);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="settings.showLiveWPM ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">On</span>
            </button>
          </div>
        </div>
        
        <!-- Custom Motion Toggle -->
        <div class="flex justify-between items-center transition-opacity duration-300">
          <div class="flex flex-col">
            <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-700'">Motion</span>
            <span class="text-[11px] uppercase tracking-widest mt-1 opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-800'">System, Reduced, or Full</span>
          </div>
          <div class="flex gap-1">
            <button v-for="mode in ['system', 'reduced', 'full']" :key="mode" @click="settings.motionMode = mode" :aria-pressed="settings.motionMode === mode" :aria-label="`Use ${mode} motion`" class="relative w-14 py-1.5 text-[11px] uppercase tracking-wider transition-all group">
              <div class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none" :class="settings.motionMode === mode ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'">
                <div class="absolute inset-0 rounded-lg" :class="settings.darkMode ? 'bg-stone-500/50' : 'bg-stone-300/70'" style="filter: url(#ink-blot); transform: scale(1.1);"></div>
              </div>
              <span class="relative z-10 transition-colors" :class="settings.motionMode === mode ? (settings.darkMode ? 'text-stone-100 font-medium' : 'text-stone-900 font-medium') : 'text-stone-500'">{{ mode }}</span>
            </button>
          </div>
        </div>
        <div class="w-full h-[1px] opacity-20 my-1 flex-shrink-0" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-800'"></div>

        <!-- Optional audio -->
        <div class="flex flex-col gap-5">
          <div class="flex flex-col">
            <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Soundscape</span>
            <span class="text-xs uppercase tracking-wide mt-1 opacity-75" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Optional audio for quiet practice</span>
          </div>

          <fieldset class="flex flex-col gap-3">
            <legend class="text-xs uppercase tracking-wider" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Ambience</legend>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="mode in ['off', 'rain', 'room']" :key="mode" @click="settings.ambienceMode = mode" type="button" class="min-h-11 rounded-lg px-2 text-xs uppercase tracking-wide" :class="settings.ambienceMode === mode ? (settings.darkMode ? 'bg-stone-600 text-white' : 'bg-stone-300 text-stone-900') : (settings.darkMode ? 'text-stone-300' : 'text-stone-700')" :aria-pressed="settings.ambienceMode === mode">{{ mode }}</button>
            </div>
            <label class="flex items-center justify-between text-[11px] uppercase tracking-wider" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-700'">
              <span>Ambience volume</span>
              <output>{{ Math.round(settings.ambientVolume * 100) }}%</output>
            </label>
            <input v-model.number.lazy="settings.ambientVolume" type="range" min="0" max="1" step="0.05" :disabled="settings.ambienceMode === 'off'" aria-label="Ambience volume" class="w-full accent-[#b7791f] disabled:opacity-30" />
          </fieldset>

          <fieldset class="flex flex-col gap-3">
            <legend class="text-xs uppercase tracking-wider" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Keystrokes</legend>
            <div class="grid grid-cols-2 gap-2">
              <button @click="settings.keystrokeSound = false" type="button" class="min-h-11 rounded-lg px-2 text-xs uppercase tracking-wide" :class="!settings.keystrokeSound ? (settings.darkMode ? 'bg-stone-600 text-white' : 'bg-stone-300 text-stone-900') : (settings.darkMode ? 'text-stone-300' : 'text-stone-700')" :aria-pressed="!settings.keystrokeSound">Off</button>
              <button @click="settings.keystrokeSound = true" type="button" class="min-h-11 rounded-lg px-2 text-xs uppercase tracking-wide" :class="settings.keystrokeSound ? (settings.darkMode ? 'bg-stone-600 text-white' : 'bg-stone-300 text-stone-900') : (settings.darkMode ? 'text-stone-300' : 'text-stone-700')" :aria-pressed="settings.keystrokeSound">On</button>
            </div>
            <label class="flex items-center justify-between text-[11px] uppercase tracking-wider" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-700'">
              <span>Keystroke volume</span>
              <output>{{ Math.round(settings.keystrokeVolume * 100) }}%</output>
            </label>
            <input v-model.number.lazy="settings.keystrokeVolume" type="range" min="0" max="1" step="0.05" :disabled="!settings.keystrokeSound" aria-label="Keystroke volume" class="w-full accent-[#b7791f] disabled:opacity-30" />
          </fieldset>

          <p class="text-[10px] leading-relaxed uppercase tracking-wider opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Sound begins only after you interact and pauses when Trace is hidden.</p>
        </div>

        <div class="w-full h-[1px] opacity-20 my-1 flex-shrink-0" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-800'"></div>

        <!-- Atmosphere -->
        <div class="flex flex-col gap-3">
          <div class="flex flex-col">
            <span class="text-sm tracking-widest uppercase transition-colors" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Atmosphere</span>
            <span class="text-xs uppercase tracking-widest mt-1 opacity-70" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Automatic follows the current season</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button @click="chooseAutomaticAtmosphere" class="min-h-11 px-3 py-2 text-xs uppercase tracking-wider rounded-lg transition-colors" :class="settings.themeMode === 'realtime' ? (settings.darkMode ? 'bg-stone-600 text-white' : 'bg-stone-300 text-stone-900') : (settings.darkMode ? 'text-stone-400 hover:bg-stone-800/50' : 'text-stone-600 hover:bg-white/50')" :aria-pressed="settings.themeMode === 'realtime'">Automatic</button>
            <button v-for="seasonObj in availableLockedSeasons" :key="seasonObj.index" @click="chooseSeason(seasonObj.index)" class="min-h-11 px-3 py-2 text-xs uppercase tracking-wider rounded-lg transition-colors" :class="settings.themeMode === 'locked' && settings.lockedSeason === seasonObj.index ? (settings.darkMode ? 'bg-stone-600 text-white' : 'bg-stone-300 text-stone-900') : (settings.darkMode ? 'text-stone-400 hover:bg-stone-800/50' : 'text-stone-600 hover:bg-white/50')" :aria-pressed="settings.themeMode === 'locked' && settings.lockedSeason === seasonObj.index">{{ seasonObj.name }}</button>
          </div>
        </div>

    </div>

    <p class="text-center text-xs uppercase tracking-widest opacity-60 px-6" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">{{ currentUser ? 'Preferences sync with your account.' : 'Saved on this device. Sign in to sync across devices.' }}</p>

    <button @click="router.push('/')" class="relative px-8 py-3 group transition-transform hover:scale-105 mt-12 font-ui-sans">
        <div class="absolute inset-0 rounded-full transition-opacity" 
            :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" 
            style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs"
                :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
            Return to Menu
        </span>
    </button>

  </div>
</template>