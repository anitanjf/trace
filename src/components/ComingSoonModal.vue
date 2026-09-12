<script setup>
import { ref, computed } from 'vue'
import { settings } from '../store'
import { seasonInkPalette } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'
import { useFocusTrap } from '../composables/useFocusTrap'

const props = defineProps({
  title: { type: String, default: 'The River Widens' },
  description: {
    type: String,
    default: 'The space for solitude is currently expanding. Check back soon to share the current with fellow travelers.'
  }
})

const emit = defineEmits(['close'])
const dialogRef = ref(null)
const closeDialog = () => emit('close')
useFocusTrap(dialogRef, { onEscape: closeDialog })

const activeSeasonIndex = computed(() =>
  settings.value.themeMode === 'locked'
    ? Number(settings.value.lockedSeason || 0)
    : getRealWorldSeason()
)
const activeSeasonInk = computed(() => {
  const palette = seasonInkPalette[activeSeasonIndex.value] || seasonInkPalette[0]
  return {
    backgroundColor: settings.value.darkMode ? palette.dark : palette.light,
    color: settings.value.darkMode ? palette.darkText : palette.lightText
  }
})
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in px-4">
    <div
      class="absolute inset-0 backdrop-blur-[2px] transition-colors duration-1000"
      :class="settings.darkMode ? 'bg-black/60' : 'bg-stone-900/30'"
      @click="closeDialog"
      aria-hidden="true"
    ></div>

    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-info-title"
      tabindex="-1"
      class="relative isolate w-full max-w-sm flex flex-col items-center justify-center p-10 sm:p-12 text-center"
    >
      <div
        class="absolute inset-0 -z-10 rounded-2xl shadow-xl transition-[background-color,opacity] duration-700"
        :class="settings.darkMode ? 'opacity-[0.72]' : 'opacity-[0.62]'"
        :style="{ backgroundColor: activeSeasonInk.backgroundColor, filter: 'url(#ink-blot)', transform: 'rotate(-0.15deg)' }"
      ></div>

      <div class="relative z-10 flex flex-col items-center w-full" :style="{ color: activeSeasonInk.color }">
        <p class="text-[8px] uppercase tracking-[0.35em] opacity-55 mb-3">A note from Trace</p>
        <h3 id="mode-info-title" class="text-xl sm:text-2xl tracking-[0.25em] uppercase font-light mb-6 font-ui-serif">
          {{ props.title }}
        </h3>

        <p class="text-xs leading-relaxed mb-10 font-ui-sans tracking-wide opacity-80">
          {{ props.description }}
        </p>

        <button
          @click="closeDialog"
          aria-label="Close information dialog"
          class="relative isolate w-full min-h-12 py-3 px-6 group transition-transform duration-300 hover:scale-[1.02] flex items-center justify-center"
        >
          <span
            class="absolute inset-0 -z-10 rounded-full opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-500"
            :style="{ backgroundColor: activeSeasonInk.color, filter: 'url(#ink-blot)' }"
          ></span>
          <span class="text-[10px] tracking-[0.2em] uppercase font-semibold font-ui-sans">Close</span>
        </button>
      </div>
    </div>
  </div>
</template>
