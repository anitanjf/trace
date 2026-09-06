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
  <div class="z-10 flex flex-col w-full max-w-4xl mx-auto min-h-screen pt-12 md:pt-20 px-4 sm:px-12 pb-16 font-ui-sans relative overflow-x-hidden no-scrollbar">
    
    <!-- HEADER -->
    <div class="w-full flex flex-col items-center animate-fade-in text-center mb-16 sm:mb-20">
      <h2 class="text-2xl sm:text-3xl tracking-[0.3em] uppercase font-light mb-4 flex-shrink-0 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
        The Archive
      </h2>
      <p class="text-[8px] sm:text-[9px] uppercase tracking-[0.4em] opacity-40 font-semibold font-ui-sans">
        A Record of Your Journey
      </p>
    </div>

    <!-- MAIN CONTENT -->
    <div class="w-full flex-1 flex flex-col animate-fade-in" style="animation-delay: 100ms;">
      
      <template v-if="currentUser">
        
        <!-- SINGLE COLUMN "SCROLL" OF QUOTES -->
        <div v-if="preservedQuotes.length > 0" class="w-full mb-12 flex flex-col items-center">
          
          <div class="flex items-center justify-between w-full max-w-2xl border-b pb-4 mb-16" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
             <span class="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] opacity-60 font-semibold" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">
               Preserved Reflections
             </span>
             <span class="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] opacity-40">
               {{ preservedQuotes.length }} {{ preservedQuotes.length === 1 ? 'Entry' : 'Entries' }}
             </span>
          </div>
          
          <!-- Deeply spaced vertical list -->
          <div class="flex flex-col gap-20 sm:gap-28 w-full max-w-2xl px-4 sm:px-0">
            <div v-for="(quote, i) in preservedQuotes" :key="'preserved-'+i" 
                 class="group relative flex flex-col items-center text-center transition-all duration-700 ease-out">

              <!-- Quote Text -->
              <p class="text-xl sm:text-2xl leading-loose sm:leading-loose mb-6 font-ui-serif transition-opacity duration-700" 
                 :class="settings.darkMode ? 'text-stone-400 group-hover:text-stone-200' : 'text-stone-600 group-hover:text-stone-900'">
                "{{ quote.quoteText }}"
              </p>

              <!-- Elegant Author Footer -->
              <div class="flex items-center gap-6 opacity-40 transition-opacity duration-700 group-hover:opacity-80">
                <div class="w-8 h-[1px]" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-400'"></div>
                <span class="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] font-ui-sans" 
                      :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
                  {{ quote.author }}
                </span>
                <div class="w-8 h-[1px]" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-400'"></div>
              </div>
              
            </div>
          </div>
        </div>

        <!-- EMPTY STATE -->
        <div v-else-if="!isFetchingArchive" class="flex flex-col items-center justify-center w-full h-[30vh] opacity-40 transition-opacity duration-1000">
            <p class="text-lg italic tracking-wide mb-6 font-ui-serif text-center" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">
              "The ink has not yet touched the paper."
            </p>
            <span class="text-[8px] uppercase tracking-[0.4em] font-ui-sans font-semibold">Your archive is empty</span>
        </div>

      </template>

    </div>

    <!-- RETURN BUTTON -->
    <div class="w-full flex justify-center mt-auto animate-fade-in pb-8" style="animation-delay: 200ms;">
      <button v-if="!showAuthModal" @click="router.push('/')" class="relative px-8 py-3 group transition-transform hover:scale-105 font-ui-sans mt-8">
          <div class="absolute inset-0 rounded-full transition-opacity" 
              :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-800 opacity-5 group-hover:opacity-10'" 
              style="filter: url(#ink-blot);"></div>
          <span class="relative z-10 tracking-[0.25em] uppercase text-[9px] font-semibold transition-colors"
                  :class="settings.darkMode ? 'text-stone-400 group-hover:text-stone-200' : 'text-stone-600 group-hover:text-stone-900'">
              Return to Menu
          </span>
      </button>
    </div>

    <!-- AUTH MODAL GUARD -->
    <AuthModal v-if="showAuthModal" @close="handleModalClose" />
  </div>
</template>