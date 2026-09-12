<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { settings, currentUser } from '../store'
import { db, removeQuoteFromArchive } from '../services/firebase'
import { seasonInkPalette } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'
import AuthModal from '../components/AuthModal.vue'

const router = useRouter()
const showAuthModal = ref(false)
const preservedQuotes = ref([])
const isFetchingArchive = ref(true)
const archiveError = ref('')
const archiveNotice = ref('')
const searchQuery = ref('')
const searchScope = ref('all')
const pendingRemovalId = ref(null)
const removingId = ref(null)

const searchScopes = [
  { id: 'all', label: 'All' },
  { id: 'passage', label: 'Passage' },
  { id: 'author', label: 'Author' }
]

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

const normalizeSearchValue = value => String(value || '').trim().toLowerCase()
const filteredQuotes = computed(() => {
  const search = normalizeSearchValue(searchQuery.value)
  if (!search) return preservedQuotes.value

  return preservedQuotes.value.filter(quote => {
    const passageMatches = normalizeSearchValue(quote.quoteText).includes(search)
    const authorMatches = normalizeSearchValue(quote.author).includes(search)
    if (searchScope.value === 'passage') return passageMatches
    if (searchScope.value === 'author') return authorMatches
    return passageMatches || authorMatches
  })
})

const clearSearch = () => {
  searchQuery.value = ''
  searchScope.value = 'all'
}

const fetchArchivedQuotes = async () => {
  if (!currentUser.value) {
    isFetchingArchive.value = false
    return
  }

  isFetchingArchive.value = true
  archiveError.value = ''
  archiveNotice.value = ''

  try {
    const archiveQuery = query(
      collection(db, 'users', currentUser.value.uid, 'bookmarks'),
      orderBy('savedAt', 'desc')
    )
    const querySnapshot = await getDocs(archiveQuery)
    preservedQuotes.value = querySnapshot.docs.map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data()
    }))
  } catch (error) {
    archiveError.value = error?.message || 'The archive could not be opened. Please try again.'
  } finally {
    isFetchingArchive.value = false
  }
}

const requestRemoval = bookmarkId => {
  archiveNotice.value = ''
  pendingRemovalId.value = pendingRemovalId.value === bookmarkId ? null : bookmarkId
}

const removeQuote = async quote => {
  if (!currentUser.value || removingId.value) return
  removingId.value = quote.id
  archiveError.value = ''
  archiveNotice.value = ''

  try {
    await removeQuoteFromArchive(currentUser.value.uid, quote.id)
    preservedQuotes.value = preservedQuotes.value.filter(item => item.id !== quote.id)
    pendingRemovalId.value = null
    archiveNotice.value = 'The reflection has been released from your archive.'
  } catch (error) {
    archiveError.value = error?.message || 'This reflection could not be removed. Please try again.'
  } finally {
    removingId.value = null
  }
}

const typeAgain = quote => {
  archiveError.value = ''
  archiveNotice.value = 'Opening this reflection for another quiet attempt…'

  try {
    sessionStorage.setItem('trace:archive-replay', JSON.stringify({
      id: quote.passageId || quote.id,
      text: quote.quoteText,
      author: quote.author || 'Unknown'
    }))
    router.push('/meditation')
  } catch {
    archiveError.value = 'This reflection could not be prepared. Please try again.'
  }
}

const formatSavedDate = savedAt => {
  const date = savedAt?.toDate?.()
  if (!date) return 'Preserved reflection'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

onMounted(() => {
  if (!currentUser.value) {
    isFetchingArchive.value = false
    showAuthModal.value = true
  } else {
    fetchArchivedQuotes()
  }
})

watch(currentUser, newUser => {
  if (newUser) {
    showAuthModal.value = false
    fetchArchivedQuotes()
  }
})

const handleModalClose = () => {
  showAuthModal.value = false
  if (!currentUser.value) router.push('/')
}
</script>

<template>
  <main
    class="z-10 w-full min-h-[100dvh] overflow-y-auto no-scrollbar font-ui-sans"
    :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'"
  >
    <div class="w-full max-w-5xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-20">
      <header class="flex items-end justify-between gap-5 mb-8 sm:mb-10">
        <div>
          <p class="text-[9px] uppercase tracking-[0.35em] opacity-55 mb-2">What you chose to keep</p>
          <h1 class="text-3xl sm:text-4xl tracking-[0.28em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">The Archive</h1>
        </div>
        <button v-if="!showAuthModal" @click="router.push('/')" aria-label="Return to menu" class="relative isolate min-h-11 px-5 group">
          <span
            class="absolute inset-0 -z-10 rounded-full transition-[background-color,opacity] duration-700"
            :class="settings.darkMode ? 'opacity-[0.72] group-hover:opacity-[0.82]' : 'opacity-[0.62] group-hover:opacity-[0.72]'"
            :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)', transform: 'rotate(-1deg)' }"
          ></span>
          <span class="text-[10px] uppercase tracking-[0.2em]" :style="{ color: activeSeasonInk.color }">Return</span>
        </button>
      </header>

      <template v-if="currentUser">
        <section class="relative isolate p-5 sm:p-6 mb-6" aria-labelledby="archive-tools-title">
          <span
            aria-hidden="true"
            class="absolute inset-0 -z-10 rounded-2xl transition-[background-color,opacity] duration-700"
            :class="settings.darkMode ? 'opacity-[0.36]' : 'opacity-[0.28]'"
            :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)', transform: 'rotate(-0.08deg)' }"
          ></span>
          <div class="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-8">
            <div class="flex-1">
              <label id="archive-tools-title" for="archive-search" class="block text-[9px] uppercase tracking-[0.28em] opacity-60 mb-3">Find a reflection</label>
              <div class="flex items-center gap-3 border-b pb-3" :style="{ borderColor: activeSeasonInk.accentColor }">
                <svg aria-hidden="true" class="w-4 h-4 opacity-45 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"></path>
                </svg>
                <input
                  id="archive-search"
                  v-model="searchQuery"
                  type="search"
                  autocomplete="off"
                  placeholder="Search a phrase or author…"
                  class="w-full bg-transparent text-sm focus:outline-none placeholder:opacity-40"
                />
                <button v-if="searchQuery" @click="clearSearch" class="min-w-11 min-h-11 text-[9px] uppercase tracking-widest opacity-55 hover:opacity-100">Clear</button>
              </div>
            </div>

            <div>
              <span class="block text-[9px] uppercase tracking-[0.28em] opacity-60 mb-2">Search within</span>
              <div class="grid grid-cols-3 gap-2 min-w-64">
                <button
                  v-for="scope in searchScopes"
                  :key="scope.id"
                  @click="searchScope = scope.id"
                  :aria-pressed="searchScope === scope.id"
                  class="relative isolate min-h-11 px-3 text-[9px] uppercase tracking-[0.14em] group"
                >
                  <span
                    class="absolute inset-0 -z-10 rounded-lg transition-[background-color,opacity] duration-700"
                    :class="searchScope === scope.id
                      ? (settings.darkMode ? 'opacity-[0.72]' : 'opacity-[0.62]')
                      : 'opacity-0 group-hover:opacity-[0.12]'"
                    :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"
                  ></span>
                  <span :style="searchScope === scope.id ? { color: activeSeasonInk.color } : undefined">{{ scope.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <div class="flex items-center justify-between gap-5 mb-6 px-1">
          <span class="text-[9px] uppercase tracking-[0.28em] opacity-60">
            {{ searchQuery ? 'Matching reflections' : 'Preserved reflections' }}
          </span>
          <span class="text-[9px] uppercase tracking-[0.24em] opacity-45" aria-live="polite">
            {{ filteredQuotes.length }} {{ filteredQuotes.length === 1 ? 'entry' : 'entries' }}
          </span>
        </div>

        <p v-if="archiveNotice" class="mb-5 text-xs leading-relaxed opacity-75" role="status" aria-live="polite">{{ archiveNotice }}</p>

        <div v-if="archiveError" class="relative isolate mb-6 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" role="alert">
          <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-xl bg-red-500 opacity-[0.08]" style="filter: url(#ink-blot);"></span>
          <p class="text-xs text-red-700 dark:text-red-300">{{ archiveError }}</p>
          <button @click="fetchArchivedQuotes" class="min-h-11 px-4 text-[9px] uppercase tracking-widest">Try again</button>
        </div>

        <section v-if="isFetchingArchive" aria-label="Loading archive" aria-busy="true" class="grid md:grid-cols-2 gap-5">
          <div v-for="index in 4" :key="index" class="relative isolate min-h-56 p-6 animate-pulse">
            <span class="absolute inset-0 -z-10 rounded-2xl opacity-[0.08]" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></span>
            <div class="h-3 w-2/3 rounded bg-current opacity-10 mb-4"></div>
            <div class="h-3 w-full rounded bg-current opacity-10 mb-3"></div>
            <div class="h-3 w-4/5 rounded bg-current opacity-10"></div>
          </div>
        </section>

        <section v-else-if="filteredQuotes.length" class="grid md:grid-cols-2 gap-5" aria-label="Saved reflections">
          <article v-for="(quote, index) in filteredQuotes" :key="quote.id" class="relative isolate min-h-64 p-6 sm:p-7 flex flex-col group">
            <span
              aria-hidden="true"
              class="absolute inset-0 -z-10 rounded-2xl transition-[background-color,opacity] duration-700"
              :class="settings.darkMode ? 'opacity-[0.26] group-hover:opacity-[0.34]' : 'opacity-[0.20] group-hover:opacity-[0.28]'"
              :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)', transform: `rotate(${index % 2 ? -0.1 : 0.1}deg)` }"
            ></span>

            <p class="text-lg sm:text-xl leading-loose font-ui-serif mb-5" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">“{{ quote.quoteText }}”</p>
            <div class="mt-auto">
              <div class="flex items-center justify-between gap-4 mb-5">
                <span class="text-[9px] uppercase tracking-[0.22em] opacity-70">{{ quote.author || 'Unknown' }}</span>
                <span class="text-[8px] uppercase tracking-[0.16em] opacity-40">{{ formatSavedDate(quote.savedAt) }}</span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button @click="typeAgain(quote)" class="relative isolate min-h-12 px-4 group/action">
                  <span
                    class="absolute inset-0 -z-10 rounded-full transition-[background-color,opacity] duration-700"
                    :class="settings.darkMode ? 'opacity-[0.72] group-hover/action:opacity-[0.82]' : 'opacity-[0.62] group-hover/action:opacity-[0.72]'"
                    :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"
                  ></span>
                  <span class="text-[9px] uppercase tracking-[0.16em] font-semibold" :style="{ color: activeSeasonInk.color }">Type this again</span>
                </button>

                <button
                  v-if="pendingRemovalId !== quote.id"
                  @click="requestRemoval(quote.id)"
                  class="min-h-12 px-4 text-[9px] uppercase tracking-[0.16em] opacity-55 hover:opacity-100"
                >Remove</button>
                <button
                  v-else
                  @click="removeQuote(quote)"
                  :disabled="removingId === quote.id"
                  class="relative isolate min-h-12 px-4 text-[9px] uppercase tracking-[0.14em] text-red-700 dark:text-red-300 disabled:opacity-40"
                >
                  <span class="absolute inset-0 -z-10 rounded-full bg-red-500 opacity-[0.08]" style="filter: url(#ink-blot);"></span>
                  {{ removingId === quote.id ? 'Releasing…' : 'Confirm removal' }}
                </button>
              </div>
              <button
                v-if="pendingRemovalId === quote.id && removingId !== quote.id"
                @click="pendingRemovalId = null"
                class="w-full min-h-11 mt-1 text-[8px] uppercase tracking-[0.2em] opacity-45 hover:opacity-80"
              >Keep reflection</button>
            </div>
          </article>
        </section>

        <section v-else class="relative isolate min-h-64 p-8 flex flex-col items-center justify-center text-center">
          <span
            aria-hidden="true"
            class="absolute inset-0 -z-10 rounded-2xl transition-[background-color,opacity] duration-700"
            :class="settings.darkMode ? 'opacity-[0.20]' : 'opacity-[0.14]'"
            :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"
          ></span>
          <p class="text-lg italic tracking-wide mb-4 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
            {{ searchQuery ? '“Some words remain just beyond the page.”' : '“The ink has not yet touched the paper.”' }}
          </p>
          <p class="text-[9px] uppercase tracking-[0.3em] opacity-55 mb-6">
            {{ searchQuery ? 'No reflections match this search' : 'Your archive is empty' }}
          </p>
          <button v-if="searchQuery" @click="clearSearch" class="relative isolate min-h-11 px-6 group">
            <span class="absolute inset-0 -z-10 rounded-full opacity-[0.20] group-hover:opacity-[0.30] transition-opacity" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></span>
            <span class="text-[9px] uppercase tracking-[0.18em]">Clear search</span>
          </button>
          <button v-else @click="router.push('/meditation')" class="relative isolate min-h-11 px-6 group">
            <span class="absolute inset-0 -z-10 rounded-full opacity-[0.20] group-hover:opacity-[0.30] transition-opacity" :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)' }"></span>
            <span class="text-[9px] uppercase tracking-[0.18em]">Begin a reflection</span>
          </button>
        </section>
      </template>
    </div>

    <AuthModal v-if="showAuthModal" @close="handleModalClose" />
  </main>
</template>
