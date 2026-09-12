<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { settings } from '../store'
import { seasonInkPalette } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'
import ComingSoonModal from '../components/ComingSoonModal.vue'

const router = useRouter()
const showSupportModal = ref(false)

const activeSeasonIndex = computed(() =>
  settings.value.themeMode === 'locked'
    ? Number(settings.value.lockedSeason || 0)
    : getRealWorldSeason()
)
const activeSeasonInk = computed(() => {
  const palette = seasonInkPalette[activeSeasonIndex.value] || seasonInkPalette[0]
  return {
    backgroundColor: settings.value.darkMode ? palette.dark : palette.light,
    color: settings.value.darkMode ? palette.darkText : palette.lightText,
    accentColor: settings.value.darkMode ? palette.light : palette.dark
  }
})

const principles = [
  {
    title: 'No pressure',
    text: 'No countdowns, rankings, or failure states—only room to begin again.'
  },
  {
    title: 'A gentler rhythm',
    text: 'Seasonal passages, quiet sound, and considered motion help attention settle.'
  },
  {
    title: 'Progress with meaning',
    text: 'Your traces preserve growth without turning reflection into a competition.'
  }
]

const creatorLinks = [
  { label: 'GitHub', detail: '@anitanjf', href: 'https://github.com/anitanjf' },
  { label: 'Trace source', detail: 'View the repository', href: 'https://github.com/anitanjf/trace' }
]

const supportMessage = {
  title: 'A Cup Still Steeping',
  description: 'The support corner is still being prepared. Soon, if Trace brings a little quiet to your day, you will be able to leave a cup for the hands tending it.'
}
</script>

<template>
  <main
    class="z-10 w-full min-h-[100dvh] overflow-y-auto no-scrollbar font-ui-sans"
    :class="[
      settings.darkMode ? 'text-stone-300' : 'text-stone-800',
      { 'blur-sm opacity-40 scale-[0.99] pointer-events-none': showSupportModal }
    ]"
  >
    <div class="w-full max-w-4xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-20">
      <header class="flex items-end justify-between gap-5 mb-8 sm:mb-10">
        <div>
          <p class="text-[9px] uppercase tracking-[0.35em] opacity-55 mb-2">Behind the quiet</p>
          <h1 class="text-3xl sm:text-4xl tracking-[0.28em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">About Trace</h1>
        </div>
        <button @click="router.push('/')" aria-label="Return to menu" class="relative isolate min-h-11 px-5 group">
          <span
            class="absolute inset-0 -z-10 rounded-full transition-[background-color,opacity] duration-700"
            :class="settings.darkMode ? 'opacity-[0.72] group-hover:opacity-[0.82]' : 'opacity-[0.62] group-hover:opacity-[0.72]'"
            :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)', transform: 'rotate(-1deg)' }"
          ></span>
          <span class="text-[10px] uppercase tracking-[0.2em] transition-colors duration-700" :style="{ color: activeSeasonInk.color }">Return</span>
        </button>
      </header>

      <section class="relative isolate p-7 sm:p-10 mb-5" aria-labelledby="about-story-title">
        <span
          aria-hidden="true"
          class="absolute inset-0 -z-10 rounded-3xl transition-[background-color,opacity] duration-700"
          :class="settings.darkMode ? 'opacity-[0.72]' : 'opacity-[0.62]'"
          :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)', transform: 'rotate(-0.08deg) scale(0.995)' }"
        ></span>
        <p class="text-[9px] uppercase tracking-[0.3em] font-semibold mb-3" :style="{ color: activeSeasonInk.color }">Leave your mark gently</p>
        <h2 id="about-story-title" class="text-2xl sm:text-3xl leading-snug tracking-[0.12em] uppercase font-ui-serif mb-5" :style="{ color: activeSeasonInk.color }">Typing can be a quiet ritual.</h2>
        <div class="max-w-2xl space-y-4 text-sm leading-7" :style="{ color: activeSeasonInk.color }">
          <p>Trace is a mindful typing space for slowing down, finding rhythm, and returning to words with intention. Each practice invites you to meet a seasonal passage at your own pace.</p>
          <p class="opacity-75">There is no failing here. No leaderboard asks you to outrun anyone. Breathe, type, listen, and let each attempt become a small record of attention.</p>
        </div>
      </section>

      <section class="grid sm:grid-cols-3 gap-4 mb-10" aria-labelledby="principles-title">
        <h2 id="principles-title" class="sr-only">What guides Trace</h2>
        <article v-for="(principle, index) in principles" :key="principle.title" class="relative isolate min-h-40 p-5 sm:p-6">
          <span
            aria-hidden="true"
            class="absolute inset-0 -z-10 rounded-2xl transition-[background-color,opacity] duration-700"
            :class="settings.darkMode ? 'opacity-[0.36]' : 'opacity-[0.28]'"
            :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)', transform: `rotate(${(index - 1) * 0.15}deg)` }"
          ></span>
          <span class="block text-[9px] uppercase tracking-[0.25em] opacity-55 mb-5">0{{ index + 1 }}</span>
          <h3 class="text-sm uppercase tracking-[0.18em] font-ui-serif mb-3" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">{{ principle.title }}</h3>
          <p class="text-xs leading-relaxed opacity-70">{{ principle.text }}</p>
        </article>
      </section>

      <section class="grid md:grid-cols-[1.2fr_0.8fr] gap-5 mb-10">
        <article class="relative isolate p-6 sm:p-8">
          <span
            aria-hidden="true"
            class="absolute inset-0 -z-10 rounded-2xl transition-[background-color,opacity] duration-700"
            :class="settings.darkMode ? 'opacity-[0.26]' : 'opacity-[0.20]'"
            :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)', transform: 'rotate(0.08deg)' }"
          ></span>
          <p class="text-[9px] uppercase tracking-[0.3em] opacity-55 mb-3">The maker</p>
          <h2 class="text-xl uppercase tracking-[0.16em] font-ui-serif mb-3" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">Jhonnel Anitan</h2>
          <p class="text-xs sm:text-sm leading-relaxed opacity-70 max-w-lg mb-6">A software engineer shaping Trace as a calm digital space—built carefully, one thoughtful detail at a time.</p>

          <nav aria-label="Creator accounts" class="grid sm:grid-cols-2 gap-3">
            <a
              v-for="link in creatorLinks"
              :key="link.label"
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
              class="relative isolate min-h-14 px-4 flex items-center justify-between gap-4 group"
            >
              <span class="absolute inset-0 -z-10 rounded-xl opacity-0 group-hover:opacity-[0.16] transition-[background-color,opacity] duration-700" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></span>
              <span>
                <span class="block text-[9px] uppercase tracking-[0.2em] font-semibold">{{ link.label }}</span>
                <span class="block text-[9px] mt-1 opacity-55">{{ link.detail }}</span>
              </span>
              <span aria-hidden="true" class="text-base opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" :style="{ color: activeSeasonInk.accentColor }">↗</span>
            </a>
          </nav>
        </article>

        <article class="relative isolate p-6 sm:p-8 flex flex-col justify-between">
          <span
            aria-hidden="true"
            class="absolute inset-0 -z-10 rounded-2xl transition-[background-color,opacity] duration-700"
            :class="settings.darkMode ? 'opacity-[0.26]' : 'opacity-[0.20]'"
            :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)', transform: 'rotate(-0.1deg)' }"
          ></span>
          <div>
            <p class="text-[9px] uppercase tracking-[0.3em] opacity-55 mb-3">Help Trace grow</p>
            <h2 class="text-xl uppercase tracking-[0.16em] font-ui-serif mb-3" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">Leave a cup</h2>
            <p class="text-xs leading-relaxed opacity-70 mb-7">A future way to support new passages, soundscapes, and the quiet work behind Trace.</p>
          </div>
          <button @click="showSupportModal = true" class="relative isolate min-h-12 px-5 w-full group">
            <span
              class="absolute inset-0 -z-10 rounded-full transition-[background-color,opacity] duration-700"
              :class="settings.darkMode ? 'opacity-[0.72] group-hover:opacity-[0.82]' : 'opacity-[0.62] group-hover:opacity-[0.72]'"
              :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"
            ></span>
            <span class="text-[10px] uppercase tracking-[0.2em] font-semibold" :style="{ color: activeSeasonInk.color }">Buy me a coffee</span>
          </button>
        </article>
      </section>

      <footer class="pt-6 border-t text-center" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
        <p class="text-[9px] uppercase tracking-[0.28em] opacity-45">Designed and tended with care · Trace</p>
      </footer>
    </div>
  </main>

  <ComingSoonModal
    v-if="showSupportModal"
    :title="supportMessage.title"
    :description="supportMessage.description"
    @close="showSupportModal = false"
  />
</template>
