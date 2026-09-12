<script setup>
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  variant: {
    type: String,
    default: 'soft',
    validator: value => ['primary', 'soft', 'ghost'].includes(value)
  },
  selected: Boolean,
  pressed: {
    type: [Boolean, String],
    default: undefined
  },
  disabled: Boolean,
  block: Boolean,
  compact: Boolean
})

const attrs = useAttrs()
const pressedState = computed(() =>
  props.pressed === undefined ? (props.selected ? 'true' : undefined) : String(props.pressed)
)
</script>

<template>
  <button
    v-bind="attrs"
    type="button"
    class="trace-ink-button"
    :class="[
      `trace-ink-button--${variant}`,
      { 'trace-ink-button--block': block, 'trace-ink-button--compact': compact }
    ]"
    :data-selected="selected || undefined"
    :aria-pressed="pressedState"
    :disabled="disabled"
  >
    <span class="trace-ink-button__content"><slot /></span>
  </button>
</template>

<style scoped>
.trace-ink-button {
  position: relative;
  isolation: isolate;
  min-height: var(--trace-control-height);
  padding: var(--trace-space-3) var(--trace-space-5);
  border: 0;
  border-radius: var(--trace-radius-control);
  color: var(--trace-text-secondary);
  background: transparent;
  font-family: var(--trace-font-control);
  cursor: pointer;
  transition:
    color var(--trace-duration-fast) ease,
    transform var(--trace-duration-fast) ease,
    opacity var(--trace-duration-fast) ease;
}

.trace-ink-button::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: var(--trace-season-ink);
  opacity: 0;
  filter: url(#ink-blot);
  transform: rotate(-0.12deg);
  transition: opacity var(--trace-duration-calm) ease;
}

.trace-ink-button--primary {
  color: var(--trace-season-contrast);
}

.trace-ink-button--primary::before {
  opacity: 0.64;
}

.trace-ink-button--soft::before {
  opacity: 0.06;
}

.trace-ink-button--ghost::before {
  inset: var(--trace-space-1);
}

.trace-ink-button[data-selected] {
  color: var(--trace-season-contrast);
}

.trace-ink-button[data-selected]::before {
  opacity: 0.48;
}

.trace-ink-button:hover:not(:disabled)::before {
  opacity: 0.22;
}

.trace-ink-button--primary:hover:not(:disabled)::before {
  opacity: 0.76;
}

.trace-ink-button[data-selected]:hover:not(:disabled)::before {
  opacity: 0.58;
}

.trace-ink-button:active:not(:disabled) {
  transform: translateY(1px) scale(0.985);
}

.trace-ink-button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.trace-ink-button--block {
  width: 100%;
}

.trace-ink-button--compact {
  min-height: var(--trace-control-height-compact);
  padding: var(--trace-space-2) var(--trace-space-3);
}

.trace-ink-button__content {
  position: relative;
  z-index: 1;
}
</style>
