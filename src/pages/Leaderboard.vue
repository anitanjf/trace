<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, settings } from '../store'
import { subscribeLeaderboard } from '../services/leaderboard'
import { leaderboardAlias, LEADERBOARD_WORD_COUNTS, rankLeaderboard } from '../utils/leaderboard'
import AuthModal from '../components/AuthModal.vue'
import InkButton from '../components/ui/InkButton.vue'

const router = useRouter()
const selectedLength = ref(50)
const entries = ref([])
const loading = ref(false)
const error = ref('')
const showAuth = ref(false)
const ranked = computed(() => rankLeaderboard(entries.value))
const yourRank = computed(() => ranked.value.findIndex(entry => entry.uid === currentUser.value?.uid) + 1)
let unsubscribe = null

watch([currentUser, selectedLength], ([user, count]) => {
  unsubscribe?.()
  unsubscribe = null
  entries.value = []
  error.value = ''
  loading.value = Boolean(user)
  if (!user) return
  unsubscribe = subscribeLeaderboard(count, records => {
    entries.value = records
    loading.value = false
  }, () => {
    loading.value = false
    error.value = 'The board could not be loaded. Check your connection and publish the Realtime Database leaderboard rules.'
  })
}, { immediate: true })

onBeforeUnmount(() => unsubscribe?.())
</script>

<template>
  <main class="relative z-10 min-h-[100dvh] w-full px-5 py-8 sm:px-10 sm:py-14 font-ui-sans" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
    <div class="mx-auto max-w-4xl">
      <header class="flex flex-wrap items-start justify-between gap-5 mb-10 sm:mb-14">
        <div>
          <p class="text-[9px] uppercase tracking-[0.3em] opacity-55 mb-3">A place for every pace</p>
          <h1 class="font-ui-serif text-3xl sm:text-4xl uppercase tracking-[0.2em]">Leaderboards</h1>
          <p class="mt-4 text-xs leading-relaxed opacity-65 max-w-lg">Follow the quickest lights across each shared passage. The practice is still yours.</p>
        </div>
        <InkButton variant="soft" compact class="text-[10px] uppercase tracking-widest" @click="router.push('/')">Return to menu</InkButton>
      </header>

      <section aria-labelledby="board-heading">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-7">
          <div>
            <h2 id="board-heading" class="font-ui-serif text-xl sm:text-2xl mb-2">The gathering lights</h2>
            <p class="text-[10px] leading-relaxed opacity-60">Personal-best WPM from completed matches with at least 90% clarity. One place per traveler and length.</p>
          </div>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Passage length">
            <button v-for="count in LEADERBOARD_WORD_COUNTS" :key="count" type="button" class="relative isolate min-w-20 min-h-11 px-3 text-[10px] uppercase tracking-widest transition-opacity" :class="selectedLength === count ? 'font-semibold' : 'opacity-55 hover:opacity-90'" :aria-pressed="selectedLength === count" @click="selectedLength = count">
              <span v-if="selectedLength === count" aria-hidden="true" class="absolute inset-0 -z-10 opacity-[0.32]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
              {{ count }} words
            </button>
          </div>
        </div>

        <div v-if="!currentUser" class="relative isolate px-7 py-12 text-center">
          <span aria-hidden="true" class="absolute inset-0 -z-10 opacity-[0.16]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
          <h3 class="font-ui-serif text-xl mb-3">Every light begins somewhere.</h3>
          <p class="text-xs leading-relaxed opacity-65 mb-6">Sign in to see the shared board and find your place on it.</p>
          <InkButton variant="primary" @click="showAuth = true">Sign in to view</InkButton>
        </div>
        <p v-else-if="loading" role="status" class="py-14 text-center text-xs opacity-60">Gathering the lights…</p>
        <p v-else-if="error" role="alert" class="py-10 text-center text-xs leading-relaxed">{{ error }}</p>
        <div v-else-if="!ranked.length" class="relative isolate px-7 py-12 text-center">
          <span aria-hidden="true" class="absolute inset-0 -z-10 opacity-[0.13]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
          <h3 class="font-ui-serif text-xl mb-3">The page is waiting for its first light.</h3>
          <p class="text-xs leading-relaxed opacity-65 mb-6">Finish a {{ selectedLength }}-word match with at least 90% clarity to appear here.</p>
          <InkButton variant="soft" @click="router.push('/multiplayer')">Enter multiplayer</InkButton>
        </div>
        <template v-else>
          <p v-if="yourRank" class="text-xs mb-5 opacity-70" role="status">Your light is #{{ yourRank }} of {{ ranked.length }} at {{ selectedLength }} words.</p>
          <p v-else class="text-xs mb-5 opacity-65">Finish a {{ selectedLength }}-word match with 90% clarity to reach the top 100.</p>

          <ol class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-8" aria-label="Leading travelers">
            <li v-for="(entry, index) in ranked.slice(0, 3)" :key="entry.uid" class="relative isolate flex flex-col items-center justify-center text-center gap-3 min-h-44 p-6" :class="index === 0 ? 'sm:min-h-56' : ''">
              <span aria-hidden="true" class="absolute inset-0 -z-10" :style="{ backgroundColor: 'var(--trace-season-ink)', opacity: index === 0 ? 0.3 : 0.16, filter: 'url(#ink-blot)' }"></span>
              <span class="text-[9px] tracking-[0.25em] uppercase opacity-65">{{ index === 0 ? 'First light' : index === 1 ? 'Second light' : 'Third light' }}</span>
              <span class="font-ui-serif text-xl leading-tight">{{ leaderboardAlias(entry.uid) }} <small v-if="entry.uid === currentUser.uid" class="block text-[10px] font-ui-sans opacity-60 mt-1">you</small></span>
              <span class="font-ui-serif text-2xl tabular-nums">{{ entry.wpm }} <small class="text-[9px] font-ui-sans uppercase tracking-widest opacity-65">WPM</small></span>
              <span class="text-[10px] opacity-65">{{ entry.accuracy }}% clarity</span>
            </li>
          </ol>

          <ol v-if="ranked.length > 3" class="space-y-2" start="4" aria-label="More travelers">
            <li v-for="(entry, index) in ranked.slice(3)" :key="entry.uid" class="relative isolate flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 min-h-16">
              <span aria-hidden="true" class="absolute inset-0 -z-10 opacity-[0.1]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
              <span class="font-ui-serif text-base opacity-65 w-8">{{ index + 4 }}</span>
              <span class="font-ui-serif text-sm flex-1 min-w-0 truncate">{{ leaderboardAlias(entry.uid) }} <small v-if="entry.uid === currentUser.uid" class="font-ui-sans opacity-60">(you)</small></span>
              <span class="text-right text-xs tabular-nums whitespace-nowrap">{{ entry.wpm }} WPM <small class="block opacity-55">{{ entry.accuracy }}% clarity</small></span>
            </li>
          </ol>
          <p class="mt-8 text-[10px] leading-relaxed text-center opacity-55">Your name and profile stay private here. Only your fastest qualifying passage is shown.</p>
        </template>
      </section>
    </div>
    <AuthModal v-if="showAuth" @close="showAuth = false" />
  </main>
</template>
