<script setup>
import { settings } from '../store'

const emit = defineEmits(['close'])
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in px-4">
    
    <!-- Blurred Dark/Light Backdrop -->
    <div class="absolute inset-0 transition-colors duration-1000" 
         :class="settings?.darkMode ? 'bg-black/60 backdrop-blur-[2px]' : 'bg-stone-900/30 backdrop-blur-[2px]'" 
         @click="emit('close')"></div>

    <!-- Modal Container -->
    <div class="relative w-full max-w-sm flex flex-col items-center justify-center p-12 text-center group">
      
      <!-- Organic Ink-Blot Background Layer -->
      <div class="absolute inset-0 rounded-2xl shadow-xl transition-colors duration-1000" 
           :class="settings?.darkMode ? 'bg-[#1E1C1A]' : 'bg-[#FDFBF7]'" 
           style="filter: url(#ink-blot);"></div>
      
      <!-- Modal Content -->
      <div class="relative z-10 flex flex-col items-center w-full">
        
        <h3 class="text-xl sm:text-2xl tracking-[0.25em] uppercase font-light mb-6 font-ui-serif" 
            :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-800'">
          The River Widens
        </h3>
        
        <p class="text-xs leading-relaxed mb-10 font-ui-sans tracking-wide opacity-80" 
           :class="settings?.darkMode ? 'text-stone-400' : 'text-stone-600'">
          The space for solitude is currently expanding. Check back soon to share the current with fellow travelers.
        </p>

        <!-- Ink-Blot Close Button -->
        <button @click="emit('close')" 
                class="relative w-full py-4 px-6 group/btn transition-transform duration-300 hover:scale-[1.02] flex items-center justify-center">
          
          <!-- Permanent Ink Mark Background -->
          <div class="absolute inset-0 rounded-full transition-opacity duration-500" 
               :class="settings?.darkMode ? 'bg-white opacity-5 group-hover/btn:opacity-10' : 'bg-stone-300 opacity-30 group-hover/btn:opacity-50'" 
               style="filter: url(#ink-blot);"></div>
          
          <span class="relative z-10 text-[10px] tracking-[0.2em] uppercase font-semibold font-ui-sans" 
                :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-800'">
            Close
          </span>
        </button>

      </div>
    </div>
  </div>
</template>