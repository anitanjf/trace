import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

export const useFocusTrap = (containerRef, options = {}) => {
  const active = options.active
  let previouslyFocused = null
  let listening = false

  const getFocusable = () => Array.from(containerRef.value?.querySelectorAll(FOCUSABLE) || [])
    .filter(element => !element.hasAttribute('hidden'))

  const handleKeydown = event => {
    if (event.key === 'Escape' && options.onEscape) {
      event.preventDefault()
      options.onEscape()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = getFocusable()
    if (!focusable.length) {
      event.preventDefault()
      containerRef.value?.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const activate = async () => {
    if (listening) return
    previouslyFocused = document.activeElement
    document.addEventListener('keydown', handleKeydown)
    listening = true
    await nextTick()
    const target = getFocusable()[0] || containerRef.value
    target?.focus()
  }

  const deactivate = () => {
    if (!listening) return
    document.removeEventListener('keydown', handleKeydown)
    listening = false
    previouslyFocused?.focus?.()
    previouslyFocused = null
  }

  onMounted(() => {
    if (active) watch(active, value => value ? activate() : deactivate(), { immediate: true })
    else activate()
  })
  onBeforeUnmount(deactivate)
}
