<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { settings } from '../store'
import ComingSoonModal from '../components/ComingSoonModal.vue'
import InkButton from '../components/ui/InkButton.vue'
import InkInfoButton from '../components/ui/InkInfoButton.vue'

const router = useRouter()
const activeModeInfo = ref(null)

const modeDetails = {
  daily: {
    title: 'Daily Reflection',
    description: 'Complete one shared passage each day and return tomorrow for another.'
  },
  flow: {
    title: 'Flow State',
    description: 'Choose 50, 100, or 200 words for a continuous punctuation-free session.'
  },
  multiplayer: {
    title: 'Quiet Multiplayer',
    description: 'Gather two to five travelers in a private or public room. Type one shared passage and follow each light at your own pace.',
    actionLabel: 'Open multiplayer',
    routeName: 'QuietMultiplayer'
  }
}

const openModeInfo = mode => { activeModeInfo.value = modeDetails[mode] }
const handleModeAction = async () => {
  const routeName = activeModeInfo.value?.routeName
  activeModeInfo.value = null
  if (routeName) await router.push({ name: routeName })
}

</script>

<template>
  <main class="z-10 flex shrink-0 flex-col items-center w-full max-w-2xl mx-auto my-0 sm:my-auto gap-6 pt-10 pb-20 sm:pt-12 sm:pb-16 px-4 sm:px-6 transition-all duration-700" :class="[
      { 'blur-sm opacity-40 scale-95 pointer-events-none': activeModeInfo },
      settings?.darkMode ? 'text-stone-300' : 'text-stone-800'
    ]">
    <header class="text-center">
      <h1 class="text-5xl sm:text-7xl tracking-[0.35em] uppercase leading-none font-bold" :class="settings?.darkMode ? 'text-stone-100' : 'text-stone-900'">TRACE</h1>
      <p class="mt-3 text-[10px] sm:text-xs uppercase tracking-[0.3em] opacity-70 font-ui-sans">A little stillness in every word</p>
    </header>

    <section class="w-full space-y-4" aria-labelledby="practice-heading">
      <h2 id="practice-heading" class="sr-only">Choose a practice</h2>
      <button aria-describedby="meditation-description" @click="router.push('/meditation')" class="relative isolate w-full min-h-32 p-6 sm:p-8 text-left group hover:scale-[1.01] transition-transform">
        <div
          class="absolute inset-0 -z-10 rounded-2xl transition-[background-color,opacity] duration-700"
          :class="settings?.darkMode ? 'opacity-[0.72] group-hover:opacity-[0.82]' : 'opacity-[0.62] group-hover:opacity-[0.72]'"
          :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)', transform: 'scale(1.01) rotate(-0.25deg)' }"
        ></div>
        <div class="relative z-10 flex justify-between gap-5">
          <span class="flex flex-col gap-2">
            <span class="text-[9px] uppercase tracking-[0.3em] font-ui-sans font-semibold" :style="{ color: 'var(--trace-season-accent)' }">Start here</span>
            <span class="text-xl sm:text-2xl tracking-[0.16em] uppercase font-ui-serif" :class="settings?.darkMode ? 'text-stone-100' : 'text-stone-900'">Begin Meditation</span>
            <span id="meditation-description" class="text-xs sm:text-sm leading-relaxed font-ui-sans normal-case tracking-normal" :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-700'">Settle into a seasonal passage. Let each word find its place.</span>
          </span>
          <span aria-hidden="true" class="text-xl group-hover:translate-x-1 transition-transform" :style="{ color: 'var(--trace-season-accent)' }">→</span>
        </div>
      </button>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="relative isolate min-h-24 p-4 sm:p-5 group">
          <div class="absolute inset-0 -z-10 rounded-xl transition-[background-color,opacity] duration-700" :class="settings?.darkMode ? 'opacity-[0.36] group-hover:opacity-[0.46]' : 'opacity-[0.28] group-hover:opacity-[0.38]'" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)', transform: 'rotate(0.2deg)' }"></div>
          <div class="relative z-10 flex items-center gap-1">
            <button @click="router.push('/daily')" class="min-h-11 text-left text-xs sm:text-sm tracking-[0.12em] sm:tracking-[0.2em] uppercase font-ui-serif" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-900'">Daily Reflection</button>
            <InkInfoButton label="About Daily Reflection" @click="openModeInfo('daily')" />
          </div>
          <p class="relative z-10 text-[10px] leading-relaxed opacity-65 font-ui-sans">Return to a moment of stillness.</p>
        </div>

        <div class="relative isolate min-h-24 p-4 sm:p-5 group">
          <div class="absolute inset-0 -z-10 rounded-xl transition-[background-color,opacity] duration-700" :class="settings?.darkMode ? 'opacity-[0.36] group-hover:opacity-[0.46]' : 'opacity-[0.28] group-hover:opacity-[0.38]'" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)', transform: 'rotate(-0.2deg)' }"></div>
          <div class="relative z-10 flex items-center gap-1">
            <button @click="router.push('/flow')" class="min-h-11 text-left text-xs sm:text-sm tracking-[0.12em] sm:tracking-[0.2em] uppercase font-ui-serif" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-900'">Flow State</button>
            <InkInfoButton label="About Flow State" @click="openModeInfo('flow')" />
          </div>
          <p class="relative z-10 text-[10px] leading-relaxed opacity-65 font-ui-sans">Let the words carry you.</p>
        </div>

        <div class="relative isolate min-h-20 p-4 sm:p-5 sm:col-span-2 group">
          <div class="absolute inset-0 -z-10 rounded-xl transition-[background-color,opacity] duration-700" :class="settings?.darkMode ? 'opacity-[0.26] group-hover:opacity-[0.36]' : 'opacity-[0.20] group-hover:opacity-[0.30]'" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)', transform: 'rotate(0.1deg) scaleX(1.002)' }"></div>
          <div class="relative z-10 flex items-center gap-1">
            <button @click="openModeInfo('multiplayer')" class="min-h-11 text-left text-xs sm:text-sm tracking-[0.2em] uppercase font-ui-serif" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-900'">Multiplayer</button>
            <InkInfoButton label="About Multiplayer" @click="openModeInfo('multiplayer')" />
          </div>
          <p class="relative z-10 text-[10px] leading-relaxed opacity-65 font-ui-sans">Follow your light beside others.</p>
        </div>
      </div>
    </section>

    <section class="w-full pt-5 border-t" :class="settings?.darkMode ? 'border-stone-800' : 'border-stone-300'">
      <nav aria-label="Profile, leaderboards, and information" class="grid grid-cols-2 sm:grid-cols-5 gap-2 font-ui-sans">
        <InkButton variant="ghost" block compact @click="router.push('/profile')" class="text-[10px] uppercase tracking-[0.16em]">Profile</InkButton>
        <InkButton variant="ghost" block compact @click="router.push('/archive')" class="text-[10px] uppercase tracking-[0.16em]">Archive</InkButton>
        <InkButton variant="soft" block compact @click="router.push('/leaderboards')" class="col-span-2 sm:col-span-1 text-[10px] uppercase tracking-[0.16em]">Leaderboards</InkButton>
        <InkButton variant="ghost" block compact @click="router.push('/settings')" class="text-[10px] uppercase tracking-[0.16em]">Preferences</InkButton>
        <InkButton variant="ghost" block compact @click="router.push('/about')" class="text-[10px] uppercase tracking-[0.16em]">About</InkButton>
      </nav>
    </section>

  </main>
  <ComingSoonModal
    v-if="activeModeInfo"
    :title="activeModeInfo.title"
    :description="activeModeInfo.description"
    :action-label="activeModeInfo.actionLabel"
    @close="activeModeInfo = null"
    @action="handleModeAction"
  />
</template>
