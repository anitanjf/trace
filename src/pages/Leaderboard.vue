<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, settings, stats } from '../store'
import { refreshLeaderboardIdentity, retryRecentLeaderboardResult, subscribeLeaderboard } from '../services/leaderboard'
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
const identityRefreshError = ref(false)
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
const initials = entry => displayName(entry).split('·')[0].trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
const metric = number => Number(number || 0).toFixed(1).replace(/\.0$/, '')
let unsubscribe = null

const refreshIdentity = async user => {
  if (!user) return
  try {
    await refreshLeaderboardIdentity(user)
    if (currentUser.value?.uid === user.uid) identityRefreshError.value = false
  } catch {
    if (currentUser.value?.uid === user.uid) identityRefreshError.value = true
  }
}
watch(currentUser, user => {
  identityRefreshError.value = false
  if (user) void refreshIdentity(user)
}, { immediate: true })

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
  <main class="relative z-10 min-h-[100dvh] w-full px-5 py-8 sm:px-9 sm:py-14 font-ui-sans" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
    <div class="mx-auto max-w-5xl">
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
          <div class="flex flex-wrap items-center justify-between gap-3 mb-6 text-xs opacity-70" role="status">
            <p>{{ yourRank ? `Your light is #${yourRank} of ${ranked.length} in ${selectedLength}-word ${selectedSort === 'wpm' ? 'pace' : 'clarity'}.` : `A clear ${selectedLength}-word match can place you among these lights.` }}</p>
            <p class="text-[9px] uppercase tracking-[0.2em]">{{ ranked.length }} {{ ranked.length === 1 ? 'traveler' : 'travelers' }} · top 100</p>
          </div>

          <section aria-labelledby="rank-heading" class="mt-7">
            <div class="flex flex-wrap items-baseline justify-between gap-2 mb-4 sm:mb-5">
              <h3 id="rank-heading" class="font-ui-serif text-xl sm:text-2xl">The standings</h3>
              <span class="text-[9px] uppercase tracking-wider opacity-55">{{ selectedLength }} words · by {{ selectedSort === 'wpm' ? 'pace' : 'clarity' }}</span>
            </div>
            <div class="rounded-2xl px-3 py-3 sm:px-6 sm:py-5" :class="settings.darkMode ? 'bg-white/[0.035]' : 'bg-stone-950/[0.035]'">
              <div aria-hidden="true" class="grid grid-cols-[2rem_minmax(0,1fr)_3.25rem_3.25rem] sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(7rem,0.55fr)_5rem_5rem] items-center gap-x-2 sm:gap-x-5 px-3 sm:px-5 py-4 border-b border-current/15 text-[8px] sm:text-[9px] uppercase tracking-widest opacity-60">
                <span>Rank</span><span>Traveler</span><span class="hidden sm:block">Country</span><span class="text-right">WPM</span><span class="text-right">Clarity</span>
              </div>
              <ol aria-label="Ranked travelers">
                <li v-for="(entry, index) in ranked" :key="entry.uid" class="relative isolate grid grid-cols-[2rem_minmax(0,1fr)_3.25rem_3.25rem] sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(7rem,0.55fr)_5rem_5rem] items-center gap-x-2 sm:gap-x-5 min-h-20 px-3 sm:px-5 py-4 border-b border-current/10 last:border-b-0" :aria-label="`Rank ${index + 1}, ${displayName(entry)}, ${metric(entry.wpm)} WPM, ${metric(entry.accuracy)} percent clarity`">
                  <span v-if="entry.uid === currentUser.uid" aria-hidden="true" class="absolute inset-0 -z-10 rounded-lg opacity-[0.1]" :style="{ backgroundColor: 'var(--trace-season-ink)' }"></span>
                  <span class="font-ui-serif text-lg tabular-nums opacity-80">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="min-w-0 flex items-center gap-2.5 sm:gap-4">
                    <span aria-hidden="true" class="relative isolate shrink-0 w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full font-ui-serif text-[10px] sm:text-xs">
                      <span class="absolute inset-0 -z-10 rounded-full opacity-[0.18]" :style="{ backgroundColor: 'var(--trace-season-ink)' }"></span>
                      {{ initials(entry) }}
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate font-ui-serif text-sm sm:text-base" :title="displayName(entry)">{{ displayName(entry) }}</span>
                      <span v-if="entry.uid === currentUser.uid || countryFlag(entry.countryCode)" class="block sm:hidden text-[9px] opacity-65 mt-1" :title="countryName(entry.countryCode)">{{ entry.uid === currentUser.uid ? 'you' : '' }} {{ countryFlag(entry.countryCode) }}</span>
                      <span v-else-if="index < 3" class="block text-[9px] uppercase tracking-wider opacity-55 mt-1">{{ index === 0 ? 'First light' : index === 1 ? 'Second light' : 'Third light' }}</span>
                    </span>
                  </span>
                  <span class="hidden sm:block truncate text-xs opacity-70" :title="countryName(entry.countryCode)">{{ countryFlag(entry.countryCode) }} {{ countryName(entry.countryCode) || '—' }}</span>
                  <span class="text-right text-sm tabular-nums" :class="selectedSort === 'wpm' ? 'font-semibold' : 'opacity-65'">{{ metric(entry.wpm) }}</span>
                  <span class="text-right text-sm tabular-nums" :class="selectedSort === 'clarity' ? 'font-semibold' : 'opacity-65'">{{ metric(entry.accuracy) }}%</span>
                </li>
              </ol>
            </div>
          </section>
          <p class="mt-8 text-[10px] leading-relaxed text-center opacity-55">One fastest qualifying match per traveler and passage length. Your name or chosen alias and country are all that others see.</p>
        </template>
        <p v-if="identityRefreshError && yourRank" class="mt-5 text-xs text-center opacity-70" role="status">Your public name could not be refreshed. <button type="button" class="underline underline-offset-4" @click="refreshIdentity(currentUser)">Try again</button></p>
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
