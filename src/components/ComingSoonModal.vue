<script setup>
import { ref } from 'vue'
import { settings } from '../store'
import { useFocusTrap } from '../composables/useFocusTrap'
import InkButton from './ui/InkButton.vue'

const props = defineProps({
  title: { type: String, default: 'The River Widens' },
  description: {
    type: String,
    default: 'The space for solitude is currently expanding. Check back soon to share the current with fellow travelers.'
  },
  actionLabel: { type: String, default: '' }
})

const emit = defineEmits(['close', 'action'])
const dialogRef = ref(null)
const closeDialog = () => emit('close')
useFocusTrap(dialogRef, { onEscape: closeDialog })
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
        :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)', transform: 'rotate(-0.15deg)' }"
      ></div>

      <div class="relative z-10 flex flex-col items-center w-full" :style="{ color: 'var(--trace-season-contrast)' }">
        <p class="text-[8px] uppercase tracking-[0.35em] opacity-55 mb-3">A note from Trace</p>
        <h3 id="mode-info-title" class="text-xl sm:text-2xl tracking-[0.25em] uppercase font-light mb-6 font-ui-serif">
          {{ props.title }}
        </h3>

        <p class="text-xs leading-relaxed mb-10 font-ui-sans tracking-wide opacity-80">
          {{ props.description }}
        </p>

        <div class="grid w-full gap-2" :class="props.actionLabel ? 'grid-cols-2' : 'grid-cols-1'">
          <InkButton
            v-if="props.actionLabel"
            variant="primary"
            block
            class="text-[10px] tracking-[0.14em] uppercase font-semibold"
            @click="emit('action')"
          >{{ props.actionLabel }}</InkButton>
          <InkButton
            variant="ghost"
            block
            aria-label="Close information dialog"
            class="text-[10px] tracking-[0.2em] uppercase font-semibold"
            @click="closeDialog"
          >Close</InkButton>
        </div>
      </div>
    </div>
  </div>
</template>
