<script setup>
defineProps({ label: { type: String, required: true } })
defineEmits(['click'])
</script>

<template>
  <button type="button" :aria-label="label" class="group/info absolute z-20 top-1/2 right-2 -translate-y-1/2 w-11 h-11 grid place-items-center" @click="$emit('click')">
    <span aria-hidden="true" class="absolute w-6 h-6 rounded-[35%] opacity-75 group-hover/info:opacity-100 transition-opacity duration-500" :style="{ backgroundColor: 'var(--trace-season-accent)', filter: 'url(#ink-blot)' }"></span>
    <span aria-hidden="true" class="relative font-ui-serif text-[10px] leading-none font-semibold" :style="{ color: 'var(--trace-paper)' }">i</span>
  </button>
</template>
