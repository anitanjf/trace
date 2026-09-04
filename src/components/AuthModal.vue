<script setup>
import { ref } from 'vue'
import { settings } from '../store'
import { logInWithGoogle } from '../services/firebase'

const emit = defineEmits(['close'])
const isAuthenticating = ref(false)

const handleGoogleLogin = async () => {
  isAuthenticating.value = true
  try {
    await logInWithGoogle()
    emit('close')
  } catch (error) {
    console.error("Authentication failed:", error)
    isAuthenticating.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in px-4">
    
    <!-- Blurred Dark/Light Backdrop -->
    <div class="absolute inset-0 transition-colors duration-1000" 
         :class="settings.darkMode ? 'bg-black/60 backdrop-blur-[2px]' : 'bg-stone-900/30 backdrop-blur-[2px]'" 
         @click="!isAuthenticating && emit('close')"></div>

    <!-- Modal Container -->
    <div class="relative w-full max-w-sm flex flex-col items-center justify-center p-12 text-center group">
      
      <!-- Organic Ink-Blot Background Layer -->
      <div class="absolute inset-0 rounded-2xl shadow-xl transition-colors duration-1000" 
           :class="settings.darkMode ? 'bg-[#1E1C1A]' : 'bg-[#FDFBF7]'" 
           style="filter: url(#ink-blot);"></div>
      
      <!-- Modal Content -->
      <div class="relative z-10 flex flex-col items-center w-full">
        
        <h3 class="text-2xl tracking-[0.4em] uppercase font-light mb-6 font-ui-serif" 
            :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
          Seeker
        </h3>
        
        <p class="text-xs leading-relaxed mb-10 font-ui-sans tracking-wide opacity-80" 
           :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">
          You have traveled far. Secure your journey to continue meditating and save your clarity.
        </p>

        <!-- Google Auth Button (Now using the Ink Mark) -->
        <button @click="handleGoogleLogin" :disabled="isAuthenticating" 
                class="relative w-full py-4 px-6 group/btn transition-transform duration-300 hover:scale-[1.02] flex items-center justify-center gap-4 mb-6">
          
          <!-- Permanent Ink Mark Background -->
          <div class="absolute inset-0 rounded-full transition-opacity duration-500" 
               :class="settings.darkMode ? 'bg-white opacity-5 group-hover/btn:opacity-10' : 'bg-stone-300 opacity-30 group-hover/btn:opacity-50'" 
               style="filter: url(#ink-blot);"></div>
          
          <!-- Minimalist Google "G" Icon -->
          <svg class="w-4 h-4 relative z-10 opacity-80 grayscale group-hover/btn:grayscale-0 transition-all duration-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          
          <span class="relative z-10 text-[10px] tracking-[0.2em] uppercase font-semibold font-ui-sans" 
                :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
            {{ isAuthenticating ? 'Connecting...' : 'Continue with Google' }}
          </span>
        </button>

        <!-- Cancel Text Link -->
        <button @click="emit('close')" :disabled="isAuthenticating" 
                class="text-[9px] tracking-[0.25em] uppercase font-ui-sans transition-colors" 
                :class="settings.darkMode ? 'text-stone-500 hover:text-stone-300' : 'text-stone-400 hover:text-stone-800'">
          Maybe Later
        </button>
      </div>

    </div>
  </div>
</template>