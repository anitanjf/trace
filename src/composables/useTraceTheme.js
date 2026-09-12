import { computed } from 'vue'
import { settings } from '../store'
import { seasonInkPalette } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'

export const useTraceTheme = () => {
  const activeSeasonIndex = computed(() =>
    settings.value.themeMode === 'locked'
      ? Number(settings.value.lockedSeason || 0)
      : getRealWorldSeason()
  )

  const activePalette = computed(() =>
    seasonInkPalette[activeSeasonIndex.value] || seasonInkPalette[0]
  )

  const themeStyle = computed(() => {
    const palette = activePalette.value
    const dark = settings.value.darkMode

    return {
      '--trace-paper': dark ? '#0c0a09' : '#fdfbf7',
      '--trace-paper-raised': dark ? '#1c1917' : '#faf7f1',
      '--trace-panel': dark ? palette.dark : palette.light,
      '--trace-panel-strong': dark ? palette.dark : palette.light,
      '--trace-text-primary': dark ? '#fafaf9' : '#1c1917',
      '--trace-text-secondary': dark ? '#d6d3d1' : '#44403c',
      '--trace-text-muted': dark ? '#a8a29e' : '#78716c',
      '--trace-border': dark ? 'rgba(231, 229, 228, 0.18)' : 'rgba(41, 37, 36, 0.18)',
      '--trace-focus': dark ? palette.light : palette.dark,
      '--trace-season-ink': dark ? palette.dark : palette.light,
      '--trace-season-contrast': dark ? palette.darkText : palette.lightText,
      '--trace-season-accent': dark ? palette.light : palette.dark
    }
  })

  return { activeSeasonIndex, activePalette, themeStyle }
}
