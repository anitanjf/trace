<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { settings, currentUser, stats } from '../store'
import { logOut, db } from '../services/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import AuthModal from '../components/AuthModal.vue'
import Heatmap from '../components/Heatmap.vue'
import { seasons } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'

const router = useRouter()
const showAuthModal = ref(false)
const activeTab = ref(getRealWorldSeason())

const isEditing = ref(false)
const customProfile = ref({
  bio: '',
  github: '',
  twitter: '',
  website: '',
  alias: 'A Wandering Soul',
  isAnonymous: false
})

const fetchProfile = async () => {
  if (!currentUser.value) return
  try {
    const docRef = doc(db, 'users', currentUser.value.uid)
    const snap = await getDoc(docRef)
    if (snap.exists() && snap.data().profile) {
      customProfile.value = { ...customProfile.value, ...snap.data().profile }
    }
  } catch (err) {
    console.error('Failed to fetch profile', err)
  }
}

const saveProfile = async () => {
  if (!currentUser.value) return
  try {
    const docRef = doc(db, 'users', currentUser.value.uid)
    await setDoc(docRef, { profile: customProfile.value }, { merge: true })
    isEditing.value = false
  } catch (err) {
    console.error('Failed to save profile', err)
  }
}

onMounted(() => {
  if (!currentUser.value) showAuthModal.value = true
  else fetchProfile()
})

watch(currentUser, (newUser) => {
  if (newUser) {
    showAuthModal.value = false
    fetchProfile()
  }
})

const handleModalClose = () => {
  showAuthModal.value = false
  if (!currentUser.value) router.push('/')
}

const handleLogout = async () => {
  try { await logOut(); router.push('/') } 
  catch (err) { console.error(err) }
}

const getSeasonAccuracy = (sIdx) => {
  const s = stats.value.seasonal[sIdx]
  if (!s || s.keystrokes === 0) return 100
  const correct = s.keystrokes - s.mistakes
  return Math.max(0, Math.round((correct / s.keystrokes) * 100))
}
</script>

<template>
  <div class="z-10 flex flex-col w-full max-w-6xl mx-auto min-h-screen pt-12 md:pt-20 px-4 sm:px-12 pb-16 font-ui-sans relative overflow-x-hidden no-scrollbar">
    
    <h2 class="text-2xl sm:text-3xl tracking-[0.3em] uppercase font-light mb-8 md:mb-12 flex-shrink-0 font-ui-serif w-full text-center md:text-left" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
      Traces of the Mind
    </h2>

    <template v-if="currentUser">
      <div class="flex flex-col md:grid md:grid-cols-[16rem_1fr] gap-y-12 md:gap-y-8 gap-x-12 md:gap-x-16 w-full items-center md:items-start">
        
        <!-- LEFT SIDEBAR: PROFILE INFO -->
        <div class="order-1 flex flex-col items-center flex-shrink-0 animate-fade-in text-center w-full md:col-start-1 md:row-start-1">
          
          <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-6 shadow-sm p-1" :class="settings.darkMode ? 'bg-stone-800/50' : 'bg-stone-300/30'">
             <img :src="customProfile.isAnonymous ? 'https://api.dicebear.com/7.x/shapes/svg?seed=zen' : (currentUser.photoURL || '/default-avatar.png')" alt="Profile" class="w-full h-full object-cover grayscale rounded-full hover:grayscale-0 transition-all duration-700" />
             <div class="absolute inset-0 rounded-full opacity-30 pointer-events-none" style="filter: url(#ink-blot);" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-400'"></div>
          </div>
          
          <div class="flex flex-col gap-1 w-full items-center px-2 md:px-0">
            <h1 class="text-xl tracking-widest font-ui-serif px-4 md:px-0" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">
              {{ customProfile.isAnonymous ? (customProfile.alias || 'A Wandering Soul') : (currentUser.displayName || 'Jhonnel Fernandez Anitan') }}
            </h1>
            
            <h2 v-if="!customProfile.isAnonymous" class="text-[9px] uppercase tracking-[0.2em] opacity-70 mb-6 font-semibold truncate w-full px-4" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">
              {{ currentUser.email || 'anitanjhonnel@gmail.com' }}
            </h2>
            <div v-else class="text-[9px] uppercase tracking-[0.2em] opacity-50 mb-6 italic" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-400'">
              Hidden Identity
            </div>
            
            <template v-if="!isEditing">
              <p class="text-xs leading-loose mb-6 opacity-90 font-light w-full max-w-[280px] md:max-w-[220px]" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
                {{ customProfile.bio || 'Silence is the root of all sound.' }}
              </p>
              
              <div v-if="!customProfile.isAnonymous && (customProfile.github || customProfile.twitter || customProfile.website)" class="flex items-center justify-center gap-5 mb-8" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-500'">
                <a v-if="customProfile.github" :href="customProfile.github" target="_blank" class="transition-all hover:scale-110" :class="settings.darkMode ? 'hover:text-stone-200' : 'hover:text-stone-800'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a v-if="customProfile.twitter" :href="customProfile.twitter" target="_blank" class="transition-all hover:scale-110" :class="settings.darkMode ? 'hover:text-stone-200' : 'hover:text-stone-800'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a v-if="customProfile.website" :href="customProfile.website" target="_blank" class="transition-all hover:scale-110" :class="settings.darkMode ? 'hover:text-stone-200' : 'hover:text-stone-800'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                </a>
              </div>
              
              <button @click="isEditing = true" class="relative px-6 py-2.5 w-full max-w-[260px] md:max-w-[200px] group transition-transform hover:scale-105 mb-10">
                <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-10 group-hover:opacity-20' : 'bg-stone-800 opacity-15 group-hover:opacity-25'" style="filter: url(#ink-blot);"></div>
                <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] font-semibold" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">Edit profile</span>
              </button>
            </template>

            <template v-else>
              <div class="flex flex-col gap-4 mb-6 w-full max-w-[280px] md:max-w-[240px] text-left px-4 md:px-0">
                
                <div @click="customProfile.isAnonymous = !customProfile.isAnonymous" class="flex items-center gap-3 cursor-pointer select-none py-1 group mt-2 mb-2">
                  <div class="relative w-5 h-5 flex items-center justify-center">
                    <div class="absolute inset-0 transition-all duration-300"
                         :class="customProfile.isAnonymous 
                            ? (settings.darkMode ? 'bg-stone-200' : 'bg-stone-800') 
                            : (settings.darkMode ? 'bg-stone-700 opacity-40 group-hover:opacity-70' : 'bg-stone-300 opacity-60 group-hover:opacity-100')"
                         style="filter: url(#ink-blot);"></div>
                    <svg v-if="customProfile.isAnonymous" class="relative z-10 w-3 h-3 animate-fade-in" :class="settings.darkMode ? 'text-stone-900' : 'text-white'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span class="text-[9px] uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Hide Identity</span>
                </div>

                <div v-if="customProfile.isAnonymous" class="flex flex-col gap-1 mt-1">
                  <span class="text-[8px] uppercase tracking-widest opacity-50">Wandering Alias</span>
                  <input v-model="customProfile.alias" type="text" placeholder="e.g. A Silent Monk" class="w-full bg-transparent border-b p-1 text-xs focus:outline-none" :class="settings.darkMode ? 'border-stone-700 text-stone-200 focus:border-stone-500' : 'border-stone-300 text-stone-800 focus:border-stone-500'" />
                </div>

                <div class="flex flex-col gap-1 mt-1">
                  <span class="text-[8px] uppercase tracking-widest opacity-50">Reflection / Bio</span>
                  <textarea v-model="customProfile.bio" rows="3" placeholder="Share a reflection..." class="w-full bg-transparent border-b p-1 text-xs focus:outline-none resize-none" :class="settings.darkMode ? 'border-stone-700 text-stone-200 focus:border-stone-500' : 'border-stone-300 text-stone-800 focus:border-stone-500'"></textarea>
                </div>
                
                <div class="flex items-center gap-3 border-b py-1 mt-1" :class="settings.darkMode ? 'border-stone-700 text-stone-400 focus-within:text-stone-200 focus-within:border-stone-500' : 'border-stone-300 text-stone-500 focus-within:text-stone-800 focus-within:border-stone-500'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  <input v-model="customProfile.github" type="text" placeholder="GitHub URL" class="w-full bg-transparent text-xs focus:outline-none" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'" />
                </div>
                
                <div class="flex items-center gap-3 border-b py-1" :class="settings.darkMode ? 'border-stone-700 text-stone-400 focus-within:text-stone-200 focus-within:border-stone-500' : 'border-stone-300 text-stone-500 focus-within:text-stone-800 focus-within:border-stone-500'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  <input v-model="customProfile.twitter" type="text" placeholder="Twitter URL" class="w-full bg-transparent text-xs focus:outline-none" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'" />
                </div>
                
                <div class="flex items-center gap-3 border-b py-1" :class="settings.darkMode ? 'border-stone-700 text-stone-400 focus-within:text-stone-200 focus-within:border-stone-500' : 'border-stone-300 text-stone-500 focus-within:text-stone-800 focus-within:border-stone-500'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  <input v-model="customProfile.website" type="text" placeholder="Portfolio URL" class="w-full bg-transparent text-xs focus:outline-none" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'" />
                </div>
              </div>
              
              <div class="flex gap-4 w-full max-w-[260px] md:max-w-[200px] mb-8 mt-2 px-4 md:px-0">
                <button @click="saveProfile" class="relative flex-1 py-3 md:py-2 group transition-transform hover:scale-105">
                  <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-10 group-hover:opacity-20' : 'bg-stone-800 opacity-15 group-hover:opacity-25'" style="filter: url(#ink-blot);"></div>
                  <span class="relative z-10 tracking-widest uppercase text-[9px] font-semibold" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">Save</span>
                </button>
                <button @click="isEditing = false; fetchProfile()" class="relative flex-1 py-3 md:py-2 group transition-transform hover:scale-105">
                  <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-stone-700 opacity-20 group-hover:opacity-30' : 'bg-stone-400 opacity-20 group-hover:opacity-30'" style="filter: url(#ink-blot);"></div>
                  <span class="relative z-10 tracking-widest uppercase text-[9px] font-semibold opacity-70 group-hover:opacity-100" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Cancel</span>
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- MAIN CONTENT (Heatmap & Stats) -->
        <div class="order-2 flex flex-col gap-10 md:gap-16 w-full animate-fade-in pt-4 md:pt-0 min-w-0 md:col-start-2 md:row-start-1 md:row-span-2" style="animation-delay: 100ms;">
          
          <div class="w-full">
            <Heatmap :activityGrid="stats.activityGrid || {}" />
          </div>

          <div class="w-full flex flex-col items-center md:items-start mt-4">
            
            <div class="w-full flex flex-wrap justify-center md:justify-start gap-2 sm:gap-4 mb-6 md:mb-8 border-b pb-4" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
              <button
                v-for="(season, index) in seasons"
                :key="index"
                @click="activeTab = index"
                class="relative px-4 sm:px-5 py-2.5 text-[8px] sm:text-[9px] tracking-[0.25em] uppercase transition-all duration-300 group"
                :class="activeTab === index 
                  ? (settings.darkMode ? 'text-stone-100 font-semibold' : 'text-stone-900 font-semibold') 
                  : (settings.darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-700 hover:text-stone-900')"
              >
                <div v-if="activeTab === index" class="absolute inset-0 rounded-sm pointer-events-none z-[-1] transition-opacity duration-300" :class="settings.darkMode ? 'bg-white opacity-[0.15]' : 'bg-stone-800 opacity-[0.12]'" style="filter: url(#ink-blot);"></div>
                <div v-if="activeTab !== index" class="absolute inset-0 rounded-sm pointer-events-none z-[-1] opacity-0 group-hover:opacity-[0.05] transition-opacity duration-300" :class="settings.darkMode ? 'bg-white' : 'bg-stone-800'" style="filter: url(#ink-blot);"></div>
                {{ season.name }}
              </button>
            </div>

            <div class="w-full relative py-8 sm:py-12 px-4 sm:px-8 mt-2 mb-8">
              <div class="absolute inset-0 pointer-events-none opacity-[0.05]" :class="settings.darkMode ? 'bg-white' : 'bg-black'" style="filter: url(#ink-blot);"></div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-y-10 sm:gap-y-12 gap-x-4 sm:gap-x-8 relative z-10 text-center">
                <div class="flex flex-col gap-3 sm:gap-4">
                  <span class="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] opacity-70 font-ui-sans font-semibold" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Passages</span>
                  <span class="text-3xl sm:text-4xl font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">{{ stats.seasonal[activeTab].passages }}</span>
                </div>
                <div class="flex flex-col gap-3 sm:gap-4">
                  <span class="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] opacity-70 font-ui-sans font-semibold" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Clarity</span>
                  <span class="text-3xl sm:text-4xl font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">{{ getSeasonAccuracy(activeTab) }}%</span>
                </div>
                <div class="flex flex-col gap-3 sm:gap-4">
                  <span class="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] opacity-70 font-ui-sans font-semibold" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Keystrokes</span>
                  <span class="text-3xl sm:text-4xl font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">{{ stats.seasonal[activeTab].keystrokes }}</span>
                </div>
                <div class="flex flex-col gap-3 sm:gap-4">
                  <span class="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] opacity-70 font-ui-sans font-semibold" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Missteps</span>
                  <span class="text-3xl sm:text-4xl font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">{{ stats.seasonal[activeTab].mistakes }}</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        <!-- ACTIONS & ACHIEVEMENTS (Order 3 on mobile) -->
        <template v-if="!isEditing">
          <!-- Removed md:items-start so everything stays perfectly centered -->
          <div class="order-3 flex flex-col items-center w-full animate-fade-in md:col-start-1 md:row-start-2 pt-8 border-t md:border-t-0" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
            
            <div class="flex flex-col items-center mb-10 w-full max-w-[260px] md:max-w-[200px] border-b pb-10" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
              <h3 class="text-[9px] uppercase tracking-[0.3em] mb-6 opacity-70 font-semibold" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-700'">Achievements</h3>
              <div class="flex gap-4">
                 <div class="w-10 h-10 rounded-full opacity-50 border border-dashed flex items-center justify-center text-[8px] uppercase tracking-widest" :class="settings.darkMode ? 'border-stone-400 text-stone-300' : 'border-stone-500 text-stone-700'">?</div>
                 <div class="w-10 h-10 rounded-full opacity-50 border border-dashed flex items-center justify-center text-[8px] uppercase tracking-widest" :class="settings.darkMode ? 'border-stone-400 text-stone-300' : 'border-stone-500 text-stone-700'">?</div>
              </div>
            </div>

            <div class="flex flex-col gap-4 w-full items-center max-w-[260px] md:max-w-[200px]">
              <button @click="handleLogout" class="relative px-6 py-3 md:py-2.5 w-full group transition-transform hover:scale-105">
                <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-red-500 opacity-5 group-hover:opacity-15' : 'bg-red-500 opacity-5 group-hover:opacity-10'" style="filter: url(#ink-blot);"></div>
                <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] font-semibold transition-colors" :class="settings.darkMode ? 'text-red-400 group-hover:text-red-300' : 'text-red-700 group-hover:text-red-600'">Sign out</span>
              </button>
              
              <button v-if="!showAuthModal" @click="router.push('/')" class="relative px-6 py-3 md:py-2.5 w-full group transition-transform hover:scale-105">
                <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-15' : 'bg-stone-800 opacity-5 group-hover:opacity-10'" style="filter: url(#ink-blot);"></div>
                <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] font-semibold transition-colors" :class="settings.darkMode ? 'text-stone-400 group-hover:text-stone-200' : 'text-stone-600 group-hover:text-stone-900'">Return to Menu</span>
              </button>
            </div>
            
          </div>
        </template>

      </div>
    </template>

    <AuthModal v-if="showAuthModal" @close="handleModalClose" />
  </div>
</template>

<style>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>