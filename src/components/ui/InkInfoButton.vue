<script setup>
defineProps({ label: { type: String, required: true } })
defineEmits(['click'])
</script>

<template>
  <button type="button" :aria-label="label" class="group/info relative z-20 w-11 h-11 shrink-0 grid place-items-center" @click="$emit('click')">
    <span aria-hidden="true" class="absolute w-7 h-7 rounded-full border opacity-70 group-hover/info:opacity-100 transition-opacity duration-500" :style="{ borderColor: 'var(--trace-season-accent)' }"></span>
    <span aria-hidden="true" class="relative font-ui-serif text-xs leading-none font-semibold" :style="{ color: 'var(--trace-season-accent)' }">i</span>
  </button>
</template>
