<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { countryFlag, countryName, countryOptions } from '../../utils/countries'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const search = ref('')
const trigger = ref(null)
const searchInput = ref(null)
const visibleOptions = computed(() => countryOptions.filter(country =>
  country.name.toLowerCase().includes(search.value.trim().toLowerCase()) ||
  country.code.toLowerCase().includes(search.value.trim().toLowerCase())
))

const toggle = async () => {
  open.value = !open.value
  search.value = ''
  if (open.value) { await nextTick(); searchInput.value?.focus() }
}
const select = code => {
  emit('update:modelValue', code)
  open.value = false
  search.value = ''
  nextTick(() => trigger.value?.focus())
}
const dismiss = event => {
  if (!event.currentTarget.contains(event.relatedTarget)) open.value = false
}
const escape = () => {
  open.value = false
  trigger.value?.focus()
}
watch(() => props.modelValue, () => { search.value = '' })
</script>

<template>
  <div class="country-picker" @focusout="dismiss" @keydown.esc.stop.prevent="escape">
    <span id="profile-country-label" class="country-picker__label">Country · optional</span>
    <button ref="trigger" type="button" class="country-picker__trigger" aria-labelledby="profile-country-label profile-country-value" :aria-expanded="open" aria-controls="profile-country-options" @click="toggle">
      <span id="profile-country-value" class="country-picker__choice"><span v-if="modelValue" aria-hidden="true">{{ countryFlag(modelValue) }}</span>{{ modelValue ? countryName(modelValue) : 'Not set' }}</span>
      <span class="country-picker__chevron" aria-hidden="true">⌄</span>
    </button>
    <div v-if="open" id="profile-country-options" class="country-picker__panel">
      <label class="sr-only" for="profile-country-search">Search countries</label>
      <input id="profile-country-search" ref="searchInput" v-model="search" type="search" autocomplete="off" placeholder="Find a country…" class="country-picker__search" />
      <div class="country-picker__list" role="group" aria-label="Choose a country">
        <button v-if="!search" type="button" class="country-picker__option" :aria-current="!modelValue ? 'true' : undefined" @click="select('')">Not set</button>
        <button v-for="country in visibleOptions" :key="country.code" type="button" class="country-picker__option" :aria-current="modelValue === country.code ? 'true' : undefined" @click="select(country.code)">
          <span aria-hidden="true">{{ countryFlag(country.code) }}</span><span>{{ country.name }}</span>
        </button>
        <p v-if="!visibleOptions.length" class="country-picker__empty">No country found.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.country-picker { width: 100%; position: relative; color: inherit; }
.country-picker__label { display: block; font-size: 0.55rem; letter-spacing: .16em; text-transform: uppercase; opacity: .75; margin-bottom: .5rem; }
.country-picker__trigger { position: relative; isolation: isolate; display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 2.75rem; padding: .55rem .8rem; text-align: left; color: inherit; background: transparent; border: 0; cursor: pointer; }
.country-picker__trigger::before { content: ''; position: absolute; inset: 0; z-index: -1; background: var(--trace-season-ink); opacity: .23; filter: url(#ink-blot); transition: opacity .25s ease; }
.country-picker__trigger:hover::before, .country-picker__trigger[aria-expanded='true']::before { opacity: .37; }
.country-picker__choice { display: inline-flex; align-items: center; gap: .55rem; font-size: .74rem; }
.country-picker__chevron { font-size: 1.25rem; transition: transform .2s ease; }
.country-picker__trigger[aria-expanded='true'] .country-picker__chevron { transform: rotate(180deg); }
.country-picker__panel { margin-top: .55rem; padding: .65rem; background: var(--trace-season-ink); color: var(--trace-season-contrast); border-radius: .7rem; box-shadow: 0 8px 26px rgb(0 0 0 / .14); }
.country-picker__search { width: 100%; min-height: 2.5rem; padding: .45rem .55rem; background: transparent; border: 0; border-bottom: 1px solid currentColor; color: inherit; font: inherit; font-size: .74rem; outline-offset: 3px; }
.country-picker__search::placeholder { color: inherit; opacity: .55; }
.country-picker__list { margin-top: .45rem; max-height: 13rem; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
.country-picker__option { position: relative; isolation: isolate; display: flex; align-items: center; gap: .6rem; width: 100%; min-height: 2.6rem; padding: .45rem .6rem; border: 0; background: transparent; color: inherit; text-align: left; font: inherit; font-size: .72rem; cursor: pointer; }
.country-picker__option::before { content: ''; position: absolute; inset: .1rem; z-index: -1; background: var(--trace-paper); opacity: 0; filter: url(#ink-blot); }
.country-picker__option:hover::before, .country-picker__option:focus-visible::before, .country-picker__option[aria-current='true']::before { opacity: .24; }
.country-picker__empty { margin: .7rem .4rem; font-size: .72rem; opacity: .7; }
.country-picker button:focus-visible, .country-picker input:focus-visible { outline: 2px solid var(--trace-season-accent); outline-offset: 2px; }
</style>
