<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { settings, currentUser } from '../store'
import AuthModal from '../components/AuthModal.vue'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'

const router = useRouter()
const showAuthModal = ref(false)

const preservedQuotes = ref([])
const isFetchingArchive = ref(true)

const fetchArchivedQuotes = async () => {
  if (!currentUser.value) return
  isFetchingArchive.value = true
  
  try {
    const q = query(
      collection(db, "users", currentUser.value.uid, "bookmarks"),
      orderBy("savedAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    preservedQuotes.value = querySnapshot.docs.map(doc => doc.data())
  } catch (error) {
    console.error("Error fetching preserved quotes:", error)
  } finally {
    isFetchingArchive.value = false
  }
}

onMounted(() => {
  if (!currentUser.value) {
    showAuthModal.value = true
  } else {
    fetchArchivedQuotes()
  }
})

watch(currentUser, (newUser) => {
  if (newUser) {
    showAuthModal.value = false
    fetchArchivedQuotes()
  }
})

const handleModalClose = () => {
  showAuthModal.value = false
  if (!currentUser.value) {
    router.push('/')
  }
}
</script>

<template>
  <div class="z-10 flex flex-col items-center w-full max-w-4xl px-8 h-screen py-16 relative">
    <h2 class="text-3xl tracking-[0.3em] uppercase font-light mb-4 flex-shrink-0 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-700'">The Archive</h2>
    <p class="text-xs uppercase tracking-widest opacity-50 mb-12 flex-shrink-0 font-ui-sans" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-500'">A record of your journey</p>
    
    <div class="w-full flex-1 overflow-y-auto no-scrollbar flex flex-col gap-24 px-4 pb-12 mask-fade-edges">
      
      <template v-if="currentUser">
        
        <!-- EXPLICITLY PRESERVED QUOTES (Now with Dynamic Theme Colors) -->
        <div v-if="preservedQuotes.length > 0" class="flex flex-col items-center w-full animate-fade-in mb-8">
          <div class="flex flex-col items-center w-full mb-8">
            <h3 class="text-xl tracking-[0.4em] uppercase font-semibold mb-4" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">Preserved</h3>
            <div class="flex gap-8 text-[9px] uppercase tracking-[0.2em] opacity-60 font-ui-sans" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">
              <span>{{ preservedQuotes.length }} Reflections</span>
            </div>
            <div class="w-24 h-px opacity-30 mt-6" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-400'"></div>
          </div>
          
          <div class="flex flex-col gap-12 w-full max-w-2xl">
            <div v-for="(quote, i) in preservedQuotes" :key="'preserved-'+i" class="flex flex-col items-center text-center">
              <p class="text-lg leading-relaxed mb-4 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">{{ quote.quoteText }}</p>
              <div class="flex items-center gap-4 opacity-50">
                <div class="w-6 h-[1px]" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-400'"></div>
                <span class="text-[9px] tracking-[0.2em] uppercase font-ui-sans" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">{{ quote.author }}</span>
                <div class="w-6 h-[1px]" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-400'"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="!isFetchingArchive" class="opacity-40 italic text-xs tracking-wide pb-8 font-ui-sans text-center" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-600'">
            Your archive is currently empty.
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