<script setup>
import { computed, ref } from 'vue';
import { settings } from '../store';

const props = defineProps({
  activityGrid: {
    type: Object,
    default: () => ({})
  }
});

const selectedYear = ref(2026);
const years = [2026, 2025, 2024, 2023];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const month = date.toLocaleString('default', { month: 'long' });
  const day = date.getDate();
  const nth = (d) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  };
  return `${month} ${day}${nth(day)}`;
};

const calendarDays = computed(() => {
  const days = [];
  const year = selectedYear.value;
  
  const startDate = new Date(year, 0, 1);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(year, 11, 31);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const d = new Date(startDate);
  while (d <= endDate) {
    const dateString = d.getFullYear() + '-' + 
                       String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(d.getDate()).padStart(2, '0');
    
    const sessions = props.activityGrid[dateString] || 0;
    const isCurrentYear = d.getFullYear() === year;
    
    days.push({
      date: dateString,
      sessions: sessions,
      isCurrentYear: isCurrentYear,
      opacity: isCurrentYear 
        ? (sessions > 0 ? Math.min(sessions * 0.25 + 0.25, 1) : (settings.value.darkMode ? 0.05 : 0.08)) 
        : 0
    });
    
    d.setDate(d.getDate() + 1);
  }
  return days;
});
</script>

<template>
  <div class="flex flex-col md:flex-row gap-6 md:gap-8 w-full items-start font-ui-sans min-w-0">
    
    <div class="flex-1 w-full relative min-w-0">
      <h3 class="text-[10px] uppercase tracking-widest opacity-60 font-ui-sans px-2 md:px-0" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-500'">
        {{ calendarDays.filter(d => d.sessions > 0).length }} active days in {{ selectedYear }}
      </h3>
      
      <!-- Replaced no-scrollbar with zen-scroll, added extra pb-4 to fit it -->
      <div class="w-full overflow-x-auto zen-scroll pb-6 pt-12 -mt-4 px-2">
        <!-- w-max and pr-10 forces extra space at the end of the scroll so tooltips don't clip -->
        <div class="w-max flex flex-col gap-3 pr-10 relative">
          
          <div class="flex justify-between text-[9px] uppercase tracking-[0.2em] opacity-40">
             <span v-for="m in months" :key="m">{{ m }}</span>
          </div>
          
          <div class="grid grid-rows-7 grid-flow-col gap-[3px] sm:gap-1 relative">
            <div v-for="(day, index) in calendarDays" :key="day.date" 
                 class="relative inline-block" 
                 :class="{ 'group': day.isCurrentYear }">
              
              <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] transition-all duration-500"
                 :class="settings.darkMode ? 'bg-stone-300' : 'bg-stone-700'"
                 :style="{ 
                   opacity: day.opacity, 
                   filter: day.sessions > 0 ? 'url(#ink-blot)' : 'none',
                   visibility: day.isCurrentYear ? 'visible' : 'hidden' 
                 }">
              </div>
              
              <!-- High z-index (z-[60]) and dynamic positioning -->
              <div v-if="day.isCurrentYear" 
                   class="absolute bottom-full mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[60] px-3 py-1.5 rounded shadow-lg text-[10px] whitespace-nowrap tracking-wide"
                   :class="[
                     settings.darkMode ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-stone-100',
                     Math.floor(index / 7) < 8 ? 'left-0' : (Math.floor(index / 7) > 44 ? 'right-0' : 'left-1/2 -translate-x-1/2')
                   ]">
                {{ day.sessions === 0 ? 'No reflections' : `${day.sessions} reflections` }} on {{ formatDate(day.date) }}
                
                <div class="absolute top-full border-4 border-transparent"
                     :class="[
                       settings.darkMode ? 'border-t-stone-200' : 'border-t-stone-800',
                       Math.floor(index / 7) < 8 ? 'left-2' : (Math.floor(index / 7) > 44 ? 'right-2' : 'left-1/2 -translate-x-1/2')
                     ]"></div>
              </div>

            </div>
          </div>

        </div>
      </div>

      <div class="flex justify-between items-center mt-2 text-[8px] sm:text-[9px] uppercase tracking-widest opacity-50 px-2 md:px-0">
        <span>Clarity Depth</span>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <span>Rest</span>
          <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[2px] opacity-10" :class="settings.darkMode ? 'bg-stone-300' : 'bg-stone-700'"></div>
          <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[2px] opacity-40" :class="settings.darkMode ? 'bg-stone-300' : 'bg-stone-700'"></div>
          <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[2px] opacity-70" :class="settings.darkMode ? 'bg-stone-300' : 'bg-stone-700'"></div>
          <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-[2px] opacity-100" :class="settings.darkMode ? 'bg-stone-300' : 'bg-stone-700'"></div>
          <span>Flow</span>
        </div>
      </div>
    </div>

    <div class="flex flex-row md:flex-col gap-2 sm:gap-3 w-full md:w-24 shrink-0 overflow-x-auto md:overflow-visible no-scrollbar pt-2 md:pt-14 pb-2 md:pb-0 px-2 md:px-0">
       <button v-for="yr in years" :key="yr" @click="selectedYear = yr" 
               class="relative px-4 py-2 text-xs tracking-widest text-center md:text-left transition-colors whitespace-nowrap group shrink-0"
               :class="selectedYear === yr 
                ? (settings.darkMode ? 'text-stone-200' : 'text-stone-900') 
                : (settings.darkMode ? 'text-stone-600 hover:text-stone-400' : 'text-stone-400 hover:text-stone-600')">
         
         <div v-if="selectedYear === yr" class="absolute inset-0 pointer-events-none z-[-1] transition-opacity" 
              :class="settings.darkMode ? 'bg-white opacity-[0.08]' : 'bg-stone-800 opacity-[0.08]'" 
              style="filter: url(#ink-blot);"></div>
         <span class="relative z-10">{{ yr }}</span>
       </button>
    </div>

  </div>
</template>

<style>
/* Beautiful minimalist scrollbar to replace the clunky native one */
.zen-scroll::-webkit-scrollbar {
  height: 4px;
}
.zen-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.zen-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(150, 150, 150, 0.2);
  border-radius: 10px;
}
.zen-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(150, 150, 150, 0.4);
}

/* Fallback for Firefox */
.zen-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(150, 150, 150, 0.2) transparent;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>