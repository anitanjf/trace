<script setup>
import { computed } from 'vue'
import { currentUser, settings, syncStatus, syncError, storageRecoveryNotice, retrySync } from '../store'

const label = computed(() => {
  if (syncStatus.value === 'syncing') return 'Syncing…'
  if (syncStatus.value === 'error') return 'Could not sync'
  if (currentUser.value) return 'Synced'
  return 'Saved on this device'
})
</script>

<template>
  <aside class="fixed bottom-3 right-3 z-[90] max-w-xs rounded-full px-3 py-2 text-[10px] font-ui-sans tracking-wider shadow-sm backdrop-blur-sm"
    :class="settings.darkMode ? 'bg-stone-900/75 text-stone-300' : 'bg-white/75 text-stone-700'"
    role="status" aria-live="polite">
    <div class="flex items-center gap-2">
      <span class="h-1.5 w-1.5 rounded-full" :class="syncStatus === 'error' ? 'bg-red-500' : syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'"></span>
      <span>{{ label }}</span>
      <button v-if="syncStatus === 'error' && currentUser" @click="retrySync" class="font-semibold underline underline-offset-2">Retry</button>
    </div>
    <p v-if="syncError" class="mt-1 normal-case tracking-normal text-[9px] text-red-500">{{ syncError }}</p>
    <p v-if="storageRecoveryNotice" class="mt-1 normal-case tracking-normal text-[9px]">{{ storageRecoveryNotice }}</p>
  </aside>
</template>
