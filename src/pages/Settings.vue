<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { settings } from '../store'
import { fontOptions, seasons } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'
import InkButton from '../components/ui/InkButton.vue'
import SettingsChoice from '../components/ui/SettingsChoice.vue'

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
  { id: 'tea-house', label: 'Tea House', note: 'Warm lo-fi hush' },
  { id: 'moonlit-cafe', label: 'Moonlit Café', note: 'Low, dusky jazz' },
  { id: 'temple-garden', label: 'Temple Garden', note: 'Open meditative tones' },
  { id: 'sunlit-desk', label: 'Sunlit Desk', note: 'Cheerful gentle groove' },
  { id: 'deep-focus', label: 'Deep Focus', note: 'Steady low concentration' },
  { id: 'still-waters', label: 'Still Waters', note: 'Sparse ambient calm' }
]

const activeSeasonIndex = computed(() =>
  settings.value.themeMode === 'locked'
    ? Number(settings.value.lockedSeason || 0)
    : getRealWorldSeason()
)
const activeSeasonName = computed(() => seasons[activeSeasonIndex.value]?.name || seasons[0].name)
const seasonSoundNotes = [
  'Soft breeze · distant birds',
  'Warm air · cicada pulse',
  'Dry leaves · low wind',
  'Open wind · glass tones',
  'Sun-warmed breeze · bamboo taps',
  'Steady rain · water drops'
]
const activeSeasonSound = computed(() => seasonSoundNotes[activeSeasonIndex.value] || seasonSoundNotes[0])
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
  <main class="z-10 flex shrink-0 flex-col w-full max-w-5xl h-[100dvh] sm:h-[90dvh] py-8 sm:py-10 px-5 sm:px-8 font-ui-sans" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
    <header class="flex items-end justify-between gap-5 mb-7 sm:mb-9">
      <div>
        <p class="text-[9px] uppercase tracking-[0.35em] opacity-55 mb-2" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Shape your quiet</p>
        <h1 class="text-3xl sm:text-4xl tracking-[0.28em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">Preferences</h1>
      </div>
      <InkButton variant="primary" compact aria-label="Return to menu" class="uppercase tracking-[0.2em] text-[10px]" @click="router.push('/')">Return</InkButton>
    </header>

    <div class="flex flex-col sm:flex-row gap-6 sm:gap-10 min-h-0 flex-1">
      <nav aria-label="Preference groups" class="grid grid-cols-3 sm:flex sm:flex-col gap-2 sm:w-44 flex-shrink-0">
        <SettingsChoice
          v-for="section in sections"
          :key="section.id"
          v-model="activeSection"
          :value="section.id"
          :label="section.label"
          :note="section.note"
          align="left"
          class="min-h-14 sm:min-h-16"
        />
      </nav>

      <section class="relative isolate flex-1 min-w-0 min-h-0 transition-colors duration-700" :style="{ color: 'var(--trace-season-contrast)' }">
        <span
          aria-hidden="true"
          class="absolute inset-0 -z-10 rounded-3xl transition-[background-color,opacity] duration-700" :class="settings.darkMode ? 'opacity-[0.72]' : 'opacity-[0.62]'"
          :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)', transform: 'rotate(0.08deg) scale(0.995)' }"
        ></span>
        <div class="h-full overflow-y-auto no-scrollbar px-5 py-7 sm:px-8 sm:py-8">
          <div v-if="activeSection === 'reading'" class="flex flex-col gap-8">
            <header>
              <h2 class="text-xl tracking-[0.22em] uppercase font-ui-serif" :style="{ color: 'var(--trace-season-contrast)' }">Reading</h2>
              <p class="text-[10px] uppercase tracking-wider mt-2 opacity-60" :style="{ color: 'var(--trace-season-contrast)' }">How the passage feels beneath your hands</p>
            </header>

            <fieldset class="flex flex-col gap-3">
              <legend class="text-xs uppercase tracking-widest mb-2" :style="{ color: 'var(--trace-season-contrast)' }">Typography style</legend>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <SettingsChoice
                  v-for="font in fontOptions"
                  :key="font.id"
                  v-model="settings.fontFamily"
                  :value="font.id"
                  :label="font.label"
                />
              </div>
              <div class="relative isolate mt-2 p-5 min-h-28 flex flex-col items-center justify-center">
                <span class="text-[9px] uppercase tracking-widest opacity-50 mb-3">Live preview</span>
                <span :class="[fontClass, previewReadabilityClass]">“Empty your mind. Be formless, shapeless — like water.”</span>
              </div>
            </fieldset>

            <fieldset class="flex flex-col gap-4">
              <legend class="text-xs uppercase tracking-widest mb-1" :style="{ color: 'var(--trace-season-contrast)' }">Reading comfort</legend>
              <div>
                <span class="text-[10px] uppercase tracking-wider opacity-60">Text size</span>
                <div class="grid grid-cols-3 gap-2 mt-2">
                  <SettingsChoice
                    v-for="size in ['small', 'medium', 'large']"
                    :key="size"
                    v-model="settings.textSize"
                    :value="size"
                    :label="size"
                  />
                </div>
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-wider opacity-60">Line spacing</span>
                <div class="grid grid-cols-3 gap-2 mt-2">
                  <SettingsChoice
                    v-for="spacing in ['compact', 'comfortable', 'spacious']"
                    :key="spacing"
                    v-model="settings.lineSpacing"
                    :value="spacing"
                    :label="spacing"
                  />
                </div>
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-wider opacity-60">Alignment</span>
                <div class="grid grid-cols-2 gap-2 mt-2">
                  <SettingsChoice
                    v-for="alignment in ['left', 'center']"
                    :key="alignment"
                    v-model="settings.textAlignment"
                    :value="alignment"
                    :label="alignment"
                  />
                </div>
              </div>
            </fieldset>

            <div class="grid sm:grid-cols-2 gap-4">
              <div v-for="toggle in [{ key: 'pureZen', title: 'Pure Zen', note: 'No punctuation' }, { key: 'showLiveWPM', title: 'Live Speed', note: 'Show WPM while typing' }]" :key="toggle.key" class="relative isolate p-4">
                <span class="block text-xs uppercase tracking-wider">{{ toggle.title }}</span>
                <span class="block text-[9px] uppercase tracking-wide opacity-50 mt-1 mb-3">{{ toggle.note }}</span>
                <div class="grid grid-cols-2 gap-2">
                  <SettingsChoice
                      v-for="option in [false, true]"
                      :key="String(option)"
                      v-model="settings[toggle.key]"
                      :value="option"
                      :label="option ? 'On' : 'Off'"
                      compact
                    />
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeSection === 'visuals'" class="flex flex-col gap-8">
            <header>
              <h2 class="text-xl tracking-[0.22em] uppercase font-ui-serif" :style="{ color: 'var(--trace-season-contrast)' }">Visuals</h2>
              <p class="text-[10px] uppercase tracking-wider mt-2 opacity-60" :style="{ color: 'var(--trace-season-contrast)' }">Light, movement, and the season around you</p>
            </header>

            <fieldset>
              <legend class="text-xs uppercase tracking-widest mb-3">Appearance</legend>
              <div class="grid grid-cols-3 gap-2">
                <SettingsChoice
                  v-for="mode in appearanceOptions"
                  :key="mode"
                  :model-value="settings.appearanceMode"
                  :value="mode"
                  :label="mode"
                  @update:model-value="chooseAppearance"
                />
              </div>
            </fieldset>

            <fieldset>
              <legend class="text-xs uppercase tracking-widest mb-3">Motion</legend>
              <div class="grid grid-cols-3 gap-2">
                <SettingsChoice
                  v-for="mode in motionOptions"
                  :key="mode"
                  v-model="settings.motionMode"
                  :value="mode"
                  :label="mode"
                />
              </div>
              <p class="text-[9px] uppercase tracking-wide opacity-50 mt-3">System follows your device. Reduced calms movement. Full keeps every effect.</p>
            </fieldset>

            <fieldset>
              <legend class="text-xs uppercase tracking-widest mb-1">Season</legend>
              <p class="text-[9px] uppercase tracking-wide opacity-50 mb-3">Automatic follows the current season</p>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                <InkButton
                  variant="soft"
                  block
                  :selected="settings.themeMode === 'realtime'"
                  :pressed="settings.themeMode === 'realtime'"
                  class="uppercase text-[10px]"
                  @click="chooseAutomaticAtmosphere"
                >Automatic</InkButton>
                <InkButton
                  v-for="season in availableLockedSeasons"
                  :key="season.index"
                  variant="soft"
                  block
                  :selected="settings.themeMode === 'locked' && settings.lockedSeason === season.index"
                  :pressed="settings.themeMode === 'locked' && settings.lockedSeason === season.index"
                  class="uppercase text-[10px]"
                  @click="chooseSeason(season.index)"
                >{{ season.name }}</InkButton>
              </div>
            </fieldset>
          </div>

          <div v-else class="flex flex-col gap-8">
            <header>
              <h2 class="text-xl tracking-[0.22em] uppercase font-ui-serif" :style="{ color: 'var(--trace-season-contrast)' }">Sound</h2>
              <p class="text-[10px] uppercase tracking-wider mt-2 opacity-60" :style="{ color: 'var(--trace-season-contrast)' }">Optional layers—silence is always available</p>
            </header>

            <div class="px-1 py-2 sm:px-3 sm:py-3">
              <div class="flex items-start justify-between gap-5">
                <div>
                  <h3 class="text-xs uppercase tracking-widest">Seasonal ambience</h3>
                  <p class="text-[9px] uppercase tracking-wide opacity-55 mt-1">Now following {{ activeSeasonName }}</p>
                  <p class="text-[9px] tracking-wide opacity-70 mt-1">{{ activeSeasonSound }}</p>
                </div>
                <div class="grid grid-cols-2 gap-1 w-28">
                  <SettingsChoice
                    v-for="option in [false, true]"
                    :key="String(option)"
                    v-model="settings.seasonalAmbience"
                    :value="option"
                    :label="option ? 'On' : 'Off'"
                    compact
                  />
                </div>
              </div>
              <label class="flex justify-between text-[9px] uppercase tracking-wide opacity-60 mt-5"><span>Volume</span><output>{{ Math.round(settings.ambientVolume * 100) }}%</output></label>
              <div class="relative mt-2 h-7 flex items-center" :class="!settings.seasonalAmbience ? 'opacity-25' : 'opacity-100'">
                <span aria-hidden="true" class="absolute inset-x-0 h-1.5 rounded-full" :class="settings.darkMode ? 'bg-white/10' : 'bg-stone-950/10'" style="filter: url(#ink-blot);"></span>
                <span aria-hidden="true" class="absolute left-0 h-1.5 rounded-full" :class="settings.darkMode ? 'bg-stone-300/75' : 'bg-stone-900/55'" :style="{ width: `${settings.ambientVolume * 100}%`, filter: 'url(#ink-blot)' }"></span>
                <span aria-hidden="true" class="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full" :class="settings.darkMode ? 'bg-stone-100 shadow-[0_0_0_3px_rgba(28,25,23,0.45)]' : 'bg-stone-900 shadow-[0_0_0_3px_rgba(250,250,249,0.45)]'" :style="{ left: `${settings.ambientVolume * 100}%`, filter: 'url(#ink-blot)' }"></span>
                <input v-model.number.lazy="settings.ambientVolume" type="range" min="0" max="1" step="0.05" :disabled="!settings.seasonalAmbience" aria-label="Seasonal ambience volume" class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
              </div>
            </div>

            <fieldset class="px-1 py-2 sm:px-3 sm:py-3">
              <legend class="text-xs uppercase tracking-widest">Lo-fi background</legend>
              <p class="text-[9px] uppercase tracking-wide opacity-55 mt-1 mb-4">Six distinct stations composed inside Trace</p>
              <div class="grid sm:grid-cols-2 gap-2">
                <SettingsChoice
                  v-for="track in lofiOptions"
                  :key="track.id"
                  v-model="settings.lofiTrack"
                  :value="track.id"
                  :label="track.label"
                  :note="track.note"
                  align="left"
                  class="min-h-14"
                />
              </div>
              <label class="flex justify-between text-[9px] uppercase tracking-wide opacity-60 mt-5"><span>Music volume</span><output>{{ Math.round(settings.lofiVolume * 100) }}%</output></label>
              <div class="relative mt-2 h-7 flex items-center" :class="settings.lofiTrack === 'off' ? 'opacity-25' : 'opacity-100'">
                <span aria-hidden="true" class="absolute inset-x-0 h-1.5 rounded-full" :class="settings.darkMode ? 'bg-white/10' : 'bg-stone-950/10'" style="filter: url(#ink-blot);"></span>
                <span aria-hidden="true" class="absolute left-0 h-1.5 rounded-full" :class="settings.darkMode ? 'bg-stone-300/75' : 'bg-stone-900/55'" :style="{ width: `${settings.lofiVolume * 100}%`, filter: 'url(#ink-blot)' }"></span>
                <span aria-hidden="true" class="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full" :class="settings.darkMode ? 'bg-stone-100 shadow-[0_0_0_3px_rgba(28,25,23,0.45)]' : 'bg-stone-900 shadow-[0_0_0_3px_rgba(250,250,249,0.45)]'" :style="{ left: `${settings.lofiVolume * 100}%`, filter: 'url(#ink-blot)' }"></span>
                <input v-model.number.lazy="settings.lofiVolume" type="range" min="0" max="1" step="0.05" :disabled="settings.lofiTrack === 'off'" aria-label="Lo-fi music volume" class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
              </div>
            </fieldset>

            <div class="grid md:grid-cols-2 gap-4">
              <div v-for="sound in [{ key: 'keystrokeSound', volume: 'keystrokeVolume', title: 'Keystrokes', note: 'Warm ink taps while typing' }, { key: 'interfaceSound', volume: 'interfaceVolume', title: 'Interface clicks', note: 'Soft response on buttons' }]" :key="sound.key" class="px-1 py-2 sm:px-3 sm:py-3">
                <h3 class="text-xs uppercase tracking-widest">{{ sound.title }}</h3>
                <p class="text-[9px] uppercase tracking-wide opacity-50 mt-1 mb-4">{{ sound.note }}</p>
                <div class="grid grid-cols-2 gap-2">
                  <SettingsChoice
                    v-for="option in [false, true]"
                    :key="String(option)"
                    v-model="settings[sound.key]"
                    :value="option"
                    :label="option ? 'On' : 'Off'"
                    compact
                  />
                </div>
                <label class="flex justify-between text-[9px] uppercase tracking-wide opacity-60 mt-4"><span>Volume</span><output>{{ Math.round(settings[sound.volume] * 100) }}%</output></label>
                <div class="relative mt-2 h-7 flex items-center" :class="!settings[sound.key] ? 'opacity-25' : 'opacity-100'">
                  <span aria-hidden="true" class="absolute inset-x-0 h-1.5 rounded-full" :class="settings.darkMode ? 'bg-white/10' : 'bg-stone-950/10'" style="filter: url(#ink-blot);"></span>
                  <span aria-hidden="true" class="absolute left-0 h-1.5 rounded-full" :class="settings.darkMode ? 'bg-stone-300/75' : 'bg-stone-900/55'" :style="{ width: `${settings[sound.volume] * 100}%`, filter: 'url(#ink-blot)' }"></span>
                  <span aria-hidden="true" class="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full" :class="settings.darkMode ? 'bg-stone-100 shadow-[0_0_0_3px_rgba(28,25,23,0.45)]' : 'bg-stone-900 shadow-[0_0_0_3px_rgba(250,250,249,0.45)]'" :style="{ left: `${settings[sound.volume] * 100}%`, filter: 'url(#ink-blot)' }"></span>
                  <input v-model.number.lazy="settings[sound.volume]" type="range" min="0" max="1" step="0.05" :disabled="!settings[sound.key]" :aria-label="`${sound.title} volume`" class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                </div>
              </div>
            </div>

            <p class="text-[9px] uppercase tracking-wide opacity-50 leading-relaxed">Audio starts after your first interaction, pauses with practice or a hidden tab, and remains off unless you choose it.</p>
          </div>
        </div>
      </section>
    </div>

  </main>
</template>