<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { settings, currentUser } from '../store'
import { fontOptions, seasons } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'

const router = useRouter()
const activeSection = ref('reading')
const sections = [
  { id: 'reading', label: 'Reading', note: 'Type and text' },
  { id: 'visuals', label: 'Visuals', note: 'Theme and motion' },
  { id: 'sound', label: 'Sound', note: 'Ambient and touch' }
]
const appearanceOptions = ['system', 'light', 'dark']
const motionOptions = ['system', 'reduced', 'full']
const lofiOptions = [
  { id: 'off', label: 'Off', note: 'Silence' },
  { id: 'tea-house', label: 'Tea House', note: 'Warm and unhurried' },
  { id: 'moonlit-cafe', label: 'Moonlit Café', note: 'Low, dusky chords' },
  { id: 'temple-garden', label: 'Temple Garden', note: 'Soft open space' }
]

const activeSeasonIndex = computed(() =>
  settings.value.themeMode === 'locked'
    ? Number(settings.value.lockedSeason || 0)
    : getRealWorldSeason()
)
const activeSeasonName = computed(() => seasons[activeSeasonIndex.value]?.name || seasons[0].name)
const availableLockedSeasons = computed(() => seasons.map((season, index) => ({ name: season.name, index })))

const fontClass = computed(() => {
  switch (settings.value.fontFamily) {
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

const chooseAppearance = mode => {
  settings.value.appearanceMode = mode
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  settings.value.darkMode = mode === 'dark' || (mode === 'system' && prefersDark)
}
const chooseAutomaticAtmosphere = () => { settings.value.themeMode = 'realtime' }
const chooseSeason = index => {
  settings.value.themeMode = 'locked'
  settings.value.lockedSeason = index
}
</script>

<template>
  <main class="z-10 flex flex-col w-full max-w-5xl h-[90vh] py-6 sm:py-8 px-4 sm:px-6 font-ui-sans" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
    <header class="flex items-end justify-between gap-4 mb-5 sm:mb-7">
      <div>
        <p class="text-[9px] uppercase tracking-[0.35em] opacity-55 mb-2" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Shape your quiet</p>
        <h1 class="text-3xl sm:text-4xl tracking-[0.28em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">Preferences</h1>
      </div>
      <button @click="router.push('/')" aria-label="Return to menu" class="relative isolate min-h-11 px-5 group">
        <span class="absolute inset-0 -z-10 rounded-full opacity-40 group-hover:opacity-60 transition-opacity" :class="settings.darkMode ? 'bg-stone-700' : 'bg-stone-300'" style="filter: url(#ink-blot); transform: rotate(-1deg);"></span>
        <span class="text-[10px] uppercase tracking-[0.2em]" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">Return</span>
      </button>
    </header>

    <div class="flex flex-col sm:flex-row gap-5 sm:gap-7 min-h-0 flex-1">
      <nav aria-label="Preference groups" class="grid grid-cols-3 sm:flex sm:flex-col gap-2 sm:w-44 flex-shrink-0">
        <button v-for="section in sections" :key="section.id" @click="activeSection = section.id" :aria-pressed="activeSection === section.id" class="relative isolate min-h-14 sm:min-h-16 px-3 sm:px-5 text-left group">
          <span class="absolute inset-0 -z-10 rounded-xl transition-opacity" :class="activeSection === section.id ? (settings.darkMode ? 'bg-stone-600 opacity-45' : 'bg-stone-300 opacity-75') : (settings.darkMode ? 'bg-white opacity-[0.025] group-hover:opacity-[0.06]' : 'bg-stone-200 opacity-30 group-hover:opacity-55')" style="filter: url(#ink-blot);"></span>
          <span class="block text-[10px] sm:text-xs uppercase tracking-[0.16em]" :class="activeSection === section.id ? (settings.darkMode ? 'text-stone-100' : 'text-stone-900') : (settings.darkMode ? 'text-stone-400' : 'text-stone-700')">{{ section.label }}</span>
          <span class="hidden sm:block text-[9px] mt-1 opacity-50" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">{{ section.note }}</span>
        </button>
      </nav>

      <section class="relative isolate flex-1 min-w-0 min-h-0">
        <div class="absolute inset-0 -z-10 rounded-3xl opacity-40" :class="settings.darkMode ? 'bg-stone-900' : 'bg-[#F7F1E8]'" style="filter: url(#ink-blot); transform: rotate(0.08deg);"></div>
        <div class="h-full overflow-y-auto no-scrollbar px-5 py-6 sm:px-8 sm:py-8 mask-fade-edges">
          <div v-if="activeSection === 'reading'" class="flex flex-col gap-8">
            <header>
              <h2 class="text-xl tracking-[0.22em] uppercase font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">Reading</h2>
              <p class="text-[10px] uppercase tracking-wider mt-2 opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">How the passage feels beneath your hands</p>
            </header>

            <fieldset class="flex flex-col gap-3">
              <legend class="text-xs uppercase tracking-widest mb-2" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Typography style</legend>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button v-for="font in fontOptions" :key="font.id" @click="settings.fontFamily = font.id" :aria-pressed="settings.fontFamily === font.id" class="relative isolate min-h-11 px-2 group">
                  <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings.fontFamily === font.id ? (settings.darkMode ? 'bg-stone-600 opacity-55' : 'bg-stone-300 opacity-80') : 'opacity-0 group-hover:opacity-30 bg-stone-400'" style="filter: url(#ink-blot);"></span>
                  <span class="text-[10px] uppercase tracking-wide" :class="settings.fontFamily === font.id ? (settings.darkMode ? 'text-stone-100' : 'text-stone-900') : (settings.darkMode ? 'text-stone-400' : 'text-stone-700')">{{ font.label }}</span>
                </button>
              </div>
              <div class="relative isolate mt-2 p-5 min-h-28 flex flex-col items-center justify-center">
                <span class="absolute inset-0 -z-10 rounded-xl opacity-30" :class="settings.darkMode ? 'bg-white' : 'bg-stone-300'" style="filter: url(#ink-blot); transform: rotate(-0.2deg);"></span>
                <span class="text-[9px] uppercase tracking-widest opacity-50 mb-3">Live preview</span>
                <span :class="[fontClass, previewReadabilityClass, settings.darkMode ? 'text-stone-200' : 'text-stone-800']">“Empty your mind. Be formless, shapeless — like water.”</span>
              </div>
            </fieldset>

            <fieldset class="flex flex-col gap-4">
              <legend class="text-xs uppercase tracking-widest mb-1" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Reading comfort</legend>
              <div>
                <span class="text-[10px] uppercase tracking-wider opacity-60">Text size</span>
                <div class="grid grid-cols-3 gap-2 mt-2">
                  <button v-for="size in ['small', 'medium', 'large']" :key="size" @click="settings.textSize = size" :aria-pressed="settings.textSize === size" class="relative isolate min-h-11 uppercase text-[10px] tracking-wide group">
                    <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings.textSize === size ? (settings.darkMode ? 'bg-stone-600 opacity-55' : 'bg-stone-300 opacity-80') : 'opacity-0 group-hover:opacity-30 bg-stone-400'" style="filter: url(#ink-blot);"></span>{{ size }}
                  </button>
                </div>
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-wider opacity-60">Line spacing</span>
                <div class="grid grid-cols-3 gap-2 mt-2">
                  <button v-for="spacing in ['compact', 'comfortable', 'spacious']" :key="spacing" @click="settings.lineSpacing = spacing" :aria-pressed="settings.lineSpacing === spacing" class="relative isolate min-h-11 uppercase text-[9px] sm:text-[10px] group">
                    <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings.lineSpacing === spacing ? (settings.darkMode ? 'bg-stone-600 opacity-55' : 'bg-stone-300 opacity-80') : 'opacity-0 group-hover:opacity-30 bg-stone-400'" style="filter: url(#ink-blot);"></span>{{ spacing }}
                  </button>
                </div>
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-wider opacity-60">Alignment</span>
                <div class="grid grid-cols-2 gap-2 mt-2">
                  <button v-for="alignment in ['left', 'center']" :key="alignment" @click="settings.textAlignment = alignment" :aria-pressed="settings.textAlignment === alignment" class="relative isolate min-h-11 uppercase text-[10px] group">
                    <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings.textAlignment === alignment ? (settings.darkMode ? 'bg-stone-600 opacity-55' : 'bg-stone-300 opacity-80') : 'opacity-0 group-hover:opacity-30 bg-stone-400'" style="filter: url(#ink-blot);"></span>{{ alignment }}
                  </button>
                </div>
              </div>
            </fieldset>

            <div class="grid sm:grid-cols-2 gap-4">
              <div v-for="toggle in [{ key: 'pureZen', title: 'Pure Zen', note: 'No punctuation' }, { key: 'showLiveWPM', title: 'Live Speed', note: 'Show WPM while typing' }]" :key="toggle.key" class="relative isolate p-4">
                <span class="absolute inset-0 -z-10 rounded-xl opacity-20" :class="settings.darkMode ? 'bg-white' : 'bg-stone-300'" style="filter: url(#ink-blot);"></span>
                <span class="block text-xs uppercase tracking-wider">{{ toggle.title }}</span>
                <span class="block text-[9px] uppercase tracking-wide opacity-50 mt-1 mb-3">{{ toggle.note }}</span>
                <div class="grid grid-cols-2 gap-2">
                  <button v-for="option in [false, true]" :key="String(option)" @click="settings[toggle.key] = option" :aria-pressed="settings[toggle.key] === option" class="relative isolate min-h-10 text-[10px] uppercase group">
                    <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings[toggle.key] === option ? (settings.darkMode ? 'bg-stone-600 opacity-60' : 'bg-stone-400 opacity-55') : 'opacity-0 group-hover:opacity-25 bg-stone-400'" style="filter: url(#ink-blot);"></span>{{ option ? 'On' : 'Off' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeSection === 'visuals'" class="flex flex-col gap-8">
            <header>
              <h2 class="text-xl tracking-[0.22em] uppercase font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">Visuals</h2>
              <p class="text-[10px] uppercase tracking-wider mt-2 opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Light, movement, and the season around you</p>
            </header>

            <fieldset>
              <legend class="text-xs uppercase tracking-widest mb-3">Appearance</legend>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="mode in appearanceOptions" :key="mode" @click="chooseAppearance(mode)" :aria-pressed="settings.appearanceMode === mode" class="relative isolate min-h-11 uppercase text-[10px] group">
                  <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings.appearanceMode === mode ? (settings.darkMode ? 'bg-stone-600 opacity-60' : 'bg-stone-300 opacity-80') : 'opacity-0 group-hover:opacity-25 bg-stone-400'" style="filter: url(#ink-blot);"></span>{{ mode }}
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend class="text-xs uppercase tracking-widest mb-3">Motion</legend>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="mode in motionOptions" :key="mode" @click="settings.motionMode = mode" :aria-pressed="settings.motionMode === mode" class="relative isolate min-h-11 uppercase text-[10px] group">
                  <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings.motionMode === mode ? (settings.darkMode ? 'bg-stone-600 opacity-60' : 'bg-stone-300 opacity-80') : 'opacity-0 group-hover:opacity-25 bg-stone-400'" style="filter: url(#ink-blot);"></span>{{ mode }}
                </button>
              </div>
              <p class="text-[9px] uppercase tracking-wide opacity-50 mt-3">System follows your device. Reduced calms movement. Full keeps every effect.</p>
            </fieldset>

            <fieldset>
              <legend class="text-xs uppercase tracking-widest mb-1">Season</legend>
              <p class="text-[9px] uppercase tracking-wide opacity-50 mb-3">Automatic follows the current season</p>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button @click="chooseAutomaticAtmosphere" :aria-pressed="settings.themeMode === 'realtime'" class="relative isolate min-h-11 uppercase text-[10px] group">
                  <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings.themeMode === 'realtime' ? (settings.darkMode ? 'bg-stone-600 opacity-60' : 'bg-stone-300 opacity-80') : 'opacity-0 group-hover:opacity-25 bg-stone-400'" style="filter: url(#ink-blot);"></span>Automatic
                </button>
                <button v-for="season in availableLockedSeasons" :key="season.index" @click="chooseSeason(season.index)" :aria-pressed="settings.themeMode === 'locked' && settings.lockedSeason === season.index" class="relative isolate min-h-11 uppercase text-[10px] group">
                  <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings.themeMode === 'locked' && settings.lockedSeason === season.index ? (settings.darkMode ? 'bg-stone-600 opacity-60' : 'bg-stone-300 opacity-80') : 'opacity-0 group-hover:opacity-25 bg-stone-400'" style="filter: url(#ink-blot);"></span>{{ season.name }}
                </button>
              </div>
            </fieldset>
          </div>

          <div v-else class="flex flex-col gap-8">
            <header>
              <h2 class="text-xl tracking-[0.22em] uppercase font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">Sound</h2>
              <p class="text-[10px] uppercase tracking-wider mt-2 opacity-60" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Optional layers—silence is always available</p>
            </header>

            <div class="relative isolate p-5">
              <span class="absolute inset-0 -z-10 rounded-2xl opacity-20" :class="settings.darkMode ? 'bg-white' : 'bg-stone-300'" style="filter: url(#ink-blot); transform: rotate(-0.15deg);"></span>
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="text-xs uppercase tracking-widest">Seasonal ambience</h3>
                  <p class="text-[9px] uppercase tracking-wide opacity-55 mt-1">Now following {{ activeSeasonName }}</p>
                </div>
                <div class="grid grid-cols-2 gap-1 w-28">
                  <button v-for="option in [false, true]" :key="String(option)" @click="settings.seasonalAmbience = option" :aria-pressed="settings.seasonalAmbience === option" class="relative isolate min-h-10 text-[10px] uppercase group">
                    <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings.seasonalAmbience === option ? (settings.darkMode ? 'bg-stone-600 opacity-65' : 'bg-stone-400 opacity-55') : 'opacity-0 group-hover:opacity-25 bg-stone-400'" style="filter: url(#ink-blot);"></span>{{ option ? 'On' : 'Off' }}
                  </button>
                </div>
              </div>
              <label class="flex justify-between text-[9px] uppercase tracking-wide opacity-60 mt-5"><span>Volume</span><output>{{ Math.round(settings.ambientVolume * 100) }}%</output></label>
              <input v-model.number.lazy="settings.ambientVolume" type="range" min="0" max="1" step="0.05" :disabled="!settings.seasonalAmbience" aria-label="Seasonal ambience volume" class="w-full mt-2 accent-[#b7791f] disabled:opacity-25" />
            </div>

            <fieldset class="relative isolate p-5">
              <legend class="text-xs uppercase tracking-widest px-1">Lo-fi background</legend>
              <span class="absolute inset-0 -z-10 rounded-2xl opacity-20" :class="settings.darkMode ? 'bg-white' : 'bg-stone-300'" style="filter: url(#ink-blot); transform: rotate(0.12deg);"></span>
              <p class="text-[9px] uppercase tracking-wide opacity-55 mt-1 mb-4">Three gentle stations composed inside Trace</p>
              <div class="grid sm:grid-cols-2 gap-2">
                <button v-for="track in lofiOptions" :key="track.id" @click="settings.lofiTrack = track.id" :aria-pressed="settings.lofiTrack === track.id" class="relative isolate min-h-14 px-3 text-left group">
                  <span class="absolute inset-0 -z-10 rounded-xl transition-opacity" :class="settings.lofiTrack === track.id ? (settings.darkMode ? 'bg-stone-600 opacity-60' : 'bg-stone-400 opacity-45') : 'opacity-0 group-hover:opacity-25 bg-stone-400'" style="filter: url(#ink-blot);"></span>
                  <span class="block text-[10px] uppercase tracking-wider">{{ track.label }}</span>
                  <span class="block text-[8px] uppercase tracking-wide opacity-45 mt-1">{{ track.note }}</span>
                </button>
              </div>
              <label class="flex justify-between text-[9px] uppercase tracking-wide opacity-60 mt-5"><span>Music volume</span><output>{{ Math.round(settings.lofiVolume * 100) }}%</output></label>
              <input v-model.number.lazy="settings.lofiVolume" type="range" min="0" max="1" step="0.05" :disabled="settings.lofiTrack === 'off'" aria-label="Lo-fi music volume" class="w-full mt-2 accent-[#b7791f] disabled:opacity-25" />
            </fieldset>

            <div class="grid md:grid-cols-2 gap-4">
              <div v-for="sound in [{ key: 'keystrokeSound', volume: 'keystrokeVolume', title: 'Keystrokes', note: 'Warm ink taps while typing' }, { key: 'interfaceSound', volume: 'interfaceVolume', title: 'Interface clicks', note: 'Soft response on buttons' }]" :key="sound.key" class="relative isolate p-5">
                <span class="absolute inset-0 -z-10 rounded-2xl opacity-20" :class="settings.darkMode ? 'bg-white' : 'bg-stone-300'" style="filter: url(#ink-blot);"></span>
                <h3 class="text-xs uppercase tracking-widest">{{ sound.title }}</h3>
                <p class="text-[9px] uppercase tracking-wide opacity-50 mt-1 mb-4">{{ sound.note }}</p>
                <div class="grid grid-cols-2 gap-2">
                  <button v-for="option in [false, true]" :key="String(option)" @click="settings[sound.key] = option" :aria-pressed="settings[sound.key] === option" class="relative isolate min-h-10 text-[10px] uppercase group">
                    <span class="absolute inset-0 -z-10 rounded-lg transition-opacity" :class="settings[sound.key] === option ? (settings.darkMode ? 'bg-stone-600 opacity-65' : 'bg-stone-400 opacity-55') : 'opacity-0 group-hover:opacity-25 bg-stone-400'" style="filter: url(#ink-blot);"></span>{{ option ? 'On' : 'Off' }}
                  </button>
                </div>
                <label class="flex justify-between text-[9px] uppercase tracking-wide opacity-60 mt-4"><span>Volume</span><output>{{ Math.round(settings[sound.volume] * 100) }}%</output></label>
                <input v-model.number.lazy="settings[sound.volume]" type="range" min="0" max="1" step="0.05" :disabled="!settings[sound.key]" :aria-label="`${sound.title} volume`" class="w-full mt-2 accent-[#b7791f] disabled:opacity-25" />
              </div>
            </div>

            <p class="text-[9px] uppercase tracking-wide opacity-50 leading-relaxed">Audio starts after your first interaction, pauses with practice or a hidden tab, and remains off unless you choose it.</p>
          </div>
        </div>
      </section>
    </div>

    <p class="text-center text-[9px] uppercase tracking-widest opacity-50 mt-4" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">{{ currentUser ? 'Preferences sync with your account.' : 'Saved on this device. Sign in to sync across devices.' }}</p>
  </main>
</template>