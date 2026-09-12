<script setup>
import { computed } from 'vue'
import InkButton from './InkButton.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    required: true
  },
  value: {
    type: [String, Number, Boolean],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  align: {
    type: String,
    default: 'center',
    validator: value => ['left', 'center'].includes(value)
  },
  compact: Boolean,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])
const selected = computed(() => props.modelValue === props.value)
</script>

<template>
  <InkButton
    variant="soft"
    block
    :compact="compact"
    :selected="selected"
    :pressed="selected"
    :disabled="disabled"
    class="trace-settings-choice"
    :class="{ 'trace-settings-choice--left': align === 'left' }"
    @click="emit('update:modelValue', value)"
  >
    <span class="trace-settings-choice__label">{{ label }}</span>
    <span v-if="note" class="trace-settings-choice__note">{{ note }}</span>
  </InkButton>
</template>

<style scoped>
.trace-settings-choice {
  text-align: center;
}

.trace-settings-choice--left {
  text-align: left;
}

.trace-settings-choice__label,
.trace-settings-choice__note {
  display: block;
}

.trace-settings-choice__label {
  font-size: 0.625rem;
  line-height: 1.35;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.trace-settings-choice__note {
  margin-top: var(--trace-space-1);
  color: currentColor;
  font-size: 0.5rem;
  line-height: 1.45;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  opacity: 0.58;
}
</style>
