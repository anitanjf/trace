<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, settings, stats } from '../store'
import { retryRecentLeaderboardResult, subscribeLeaderboard } from '../services/leaderboard'
import { leaderboardAlias, LEADERBOARD_WORD_COUNTS, MIN_LEADERBOARD_ACCURACY, rankLeaderboard } from '../utils/leaderboard'
import { countryFlag, countryName } from '../utils/countries'
import AuthModal from '../components/AuthModal.vue'
import InkButton from '../components/ui/InkButton.vue'

const router = useRouter()
const selectedLength = ref(50)
const selectedSort = ref('wpm')
const entries = ref([])
const loading = ref(false)
const error = ref('')
const showAuth = ref(false)
const retrying = ref(false)
const retryMessage = ref('')
const hasRecentResult = computed(() => Object.values(stats.value.multiplayerMatches || {}).some(
  match => Number(match.wordCount) === selectedLength.value && match.finished && !match.dnf && Number(match.accuracy) >= MIN_LEADERBOARD_ACCURACY
))
const retryResult = async () => {
  retrying.value = true
  retryMessage.value = ''
  try {
    const saved = await retryRecentLeaderboardResult(stats.value.multiplayerMatches, selectedLength.value)
    retryMessage.value = saved ? 'Your result has joined the board.' : 'That result could not be recovered from an ended room. A new qualifying match will count once the leaderboard rules are updated.'
  } catch {
    retryMessage.value = 'The result is still waiting. The Realtime Database leaderboard rules need to be updated.'
  } finally { retrying.value = false }
}
const ranked = computed(() => rankLeaderboard(entries.value, selectedSort.value))
const yourRank = computed(() => ranked.value.findIndex(entry => entry.uid === currentUser.value?.uid) + 1)
const displayName = entry => entry.displayName || leaderboardAlias(entry.uid)
const metric = number => Number(number || 0).toFixed(1).replace(/\.0$/, '')
let unsubscribe = null

watch([currentUser, selectedLength, selectedSort], ([user, count, sort]) => {
  unsubscribe?.()
  unsubscribe = null
  entries.value = []
  error.value = ''
  loading.value = Boolean(user)
  if (!user) return
  unsubscribe = subscribeLeaderboard(count, sort, records => {
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
          <p class="mt-4 text-xs leading-relaxed opacity-65 max-w-lg">Follow steady hands and clear words across the shared passage. The practice is still yours.</p>
        </div>
        <InkButton variant="soft" compact class="text-[10px] uppercase tracking-widest" @click="router.push('/')">Return to menu</InkButton>
      </header>

      <section aria-labelledby="board-heading">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-7">
          <div>
            <h2 id="board-heading" class="font-ui-serif text-xl sm:text-2xl mb-2">The gathering lights</h2>
            <p class="text-[10px] leading-relaxed opacity-65">Your fastest completed match with at least {{ MIN_LEADERBOARD_ACCURACY }}% clarity. One personal best per traveler, per length; top 100 in each view.</p>
            <p class="mt-1 text-[9px] leading-relaxed opacity-50">Both sorting options use the WPM and clarity from that same fastest match.</p>
          </div>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Passage length">
            <button v-for="count in LEADERBOARD_WORD_COUNTS" :key="count" type="button" class="relative isolate min-w-20 min-h-11 px-3 text-[10px] uppercase tracking-widest transition-opacity" :class="selectedLength === count ? 'font-semibold' : 'opacity-55 hover:opacity-90'" :aria-pressed="selectedLength === count" @click="selectedLength = count">
              <span v-if="selectedLength === count" aria-hidden="true" class="absolute inset-0 -z-10 opacity-[0.32]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
              {{ count }} words
            </button>
          </div>
        </div>

        <div class="mb-7 flex flex-wrap items-center gap-2" role="group" aria-label="Rank by">
          <span class="text-[9px] uppercase tracking-[0.2em] opacity-60 mr-2">Rank by</span>
          <button v-for="option in [{ id: 'wpm', label: 'WPM' }, { id: 'clarity', label: 'Clarity' }]" :key="option.id" type="button" class="relative isolate min-h-11 px-4 text-[10px] uppercase tracking-widest transition-opacity" :class="selectedSort === option.id ? 'font-semibold' : 'opacity-55 hover:opacity-90'" :aria-pressed="selectedSort === option.id" @click="selectedSort = option.id">
            <span v-if="selectedSort === option.id" aria-hidden="true" class="absolute inset-0 -z-10 opacity-[0.32]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            {{ option.label }}
          </button>
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
          <p class="text-xs leading-relaxed opacity-65 mb-6">Finish a {{ selectedLength }}-word match with at least {{ MIN_LEADERBOARD_ACCURACY }}% clarity to appear here.</p>
          <InkButton variant="soft" @click="router.push('/multiplayer')">Enter multiplayer</InkButton>
        </div>
        <template v-else>
          <p v-if="yourRank" class="text-xs mb-5 opacity-70" role="status">Your light is #{{ yourRank }} of {{ ranked.length }} in {{ selectedLength }}-word {{ selectedSort === 'wpm' ? 'pace' : 'clarity' }}.</p>
          <p v-else class="text-xs mb-5 opacity-65">Finish a {{ selectedLength }}-word match with {{ MIN_LEADERBOARD_ACCURACY }}% clarity to reach the top 100.</p>

          <ol class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-8" aria-label="Leading travelers">
            <li v-for="(entry, index) in ranked.slice(0, 3)" :key="entry.uid" class="relative isolate flex flex-col items-center justify-center text-center gap-3 min-h-44 p-6" :class="index === 0 ? 'sm:min-h-56' : ''">
              <span aria-hidden="true" class="absolute inset-0 -z-10" :style="{ backgroundColor: 'var(--trace-season-ink)', opacity: index === 0 ? 0.3 : 0.16, filter: 'url(#ink-blot)' }"></span>
              <span class="text-[9px] tracking-[0.25em] uppercase opacity-65">{{ index === 0 ? 'First light' : index === 1 ? 'Second light' : 'Third light' }}</span>
              <span class="font-ui-serif text-xl leading-tight">{{ displayName(entry) }} <small v-if="entry.uid === currentUser.uid" class="block text-[10px] font-ui-sans opacity-60 mt-1">you</small></span>
              <span v-if="countryFlag(entry.countryCode)" class="text-[10px] opacity-75" :title="countryName(entry.countryCode)"><span aria-hidden="true">{{ countryFlag(entry.countryCode) }}</span> {{ countryName(entry.countryCode) }}</span>
              <span class="font-ui-serif text-2xl tabular-nums">{{ metric(selectedSort === 'clarity' ? entry.accuracy : entry.wpm) }}{{ selectedSort === 'clarity' ? '%' : '' }} <small class="text-[9px] font-ui-sans uppercase tracking-widest opacity-65">{{ selectedSort === 'clarity' ? 'clarity' : 'WPM' }}</small></span>
              <span class="text-[10px] opacity-65">{{ selectedSort === 'clarity' ? `${metric(entry.wpm)} WPM` : `${metric(entry.accuracy)}% clarity` }}</span>
            </li>
          </ol>

          <ol v-if="ranked.length > 3" class="space-y-2" start="4" aria-label="More travelers">
            <li v-for="(entry, index) in ranked.slice(3)" :key="entry.uid" class="relative isolate flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 min-h-16">
              <span aria-hidden="true" class="absolute inset-0 -z-10 opacity-[0.1]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
              <span class="font-ui-serif text-base opacity-65 w-8">{{ index + 4 }}</span>
              <span class="font-ui-serif text-sm flex-1 min-w-0 truncate">{{ displayName(entry) }} <small v-if="entry.uid === currentUser.uid" class="font-ui-sans opacity-60">(you)</small><small v-if="countryFlag(entry.countryCode)" class="block font-ui-sans text-[9px] opacity-65 truncate" :title="countryName(entry.countryCode)"><span aria-hidden="true">{{ countryFlag(entry.countryCode) }}</span> {{ countryName(entry.countryCode) }}</small></span>
              <span class="text-right text-xs tabular-nums whitespace-nowrap">{{ metric(selectedSort === 'clarity' ? entry.accuracy : entry.wpm) }}{{ selectedSort === 'clarity' ? '%' : '' }} {{ selectedSort === 'clarity' ? 'clarity' : 'WPM' }} <small class="block opacity-55">{{ selectedSort === 'clarity' ? `${metric(entry.wpm)} WPM` : `${metric(entry.accuracy)}% clarity` }}</small></span>
            </li>
          </ol>
          <p class="mt-8 text-[10px] leading-relaxed text-center opacity-55">Only the name or alias you share, your chosen country, and your personal-best result appear here. Country is optional.</p>
        </template>
        <div v-if="currentUser && hasRecentResult && !yourRank && !loading" class="mt-6 text-center">
          <p class="text-xs opacity-70 mb-3">Finished a qualifying match but don’t see it here?</p>
          <InkButton variant="soft" :disabled="retrying" @click="retryResult">{{ retrying ? 'Checking your result…' : 'Check recent result' }}</InkButton>
        </div>
        <p v-if="retryMessage" class="mt-3 text-xs text-center opacity-75" role="status">{{ retryMessage }}</p>
      </section>
    </div>
    <AuthModal v-if="showAuth" @close="showAuth = false" />
  </main>
</template>
