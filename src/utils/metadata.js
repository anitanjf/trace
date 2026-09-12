const defaultMetadata = {
  title: 'Trace — Mindful Typing',
  description: 'Trace is a mindful typing space for seasonal passages, quiet focus, and progress without pressure.'
}

const routeMetadata = {
  Home: defaultMetadata,
  Meditation: {
    title: 'Meditation — Trace',
    description: 'Practice a seasonal passage at your own pace and leave a gentle record of attention.'
  },
  Daily: {
    title: 'Daily Reflection — Trace',
    description: 'Return to one shared passage each day for a quiet, mindful typing ritual.'
  },
  Flow: {
    title: 'Flow State — Trace',
    description: 'Settle into a continuous punctuation-free typing practice for calm concentration.'
  },
  QuietMultiplayer: {
    title: 'Quiet Multiplayer — Trace',
    description: 'Invite one person into a private, non-competitive online typing room without sharing typed text.'
  },
  Archive: {
    title: 'Archive — Trace',
    description: 'Find, revisit, and practice the reflections you chose to preserve.'
  },
  Settings: {
    title: 'Preferences — Trace',
    description: 'Shape the reading, seasonal atmosphere, motion, and sound of your Trace practice.'
  },
  About: {
    title: 'About — Trace',
    description: 'Discover the quiet purpose, guiding principles, and maker behind Trace.'
  },
  Profile: {
    title: 'Profile — Trace',
    description: 'Review your private Trace journey, seasonal progress, and earned enlightenments.'
  }
}

const upsertMeta = (attribute, key, content) => {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

const upsertCanonical = href => {
  let element = document.head.querySelector('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export const applyRouteMetadata = route => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  const metadata = routeMetadata[route.name] || defaultMetadata
  const canonicalUrl = new URL(route.path || '/', window.location.origin).href
  const previewUrl = new URL('/social-preview.svg', window.location.origin).href

  document.title = metadata.title
  upsertMeta('name', 'description', metadata.description)
  upsertMeta('property', 'og:title', metadata.title)
  upsertMeta('property', 'og:description', metadata.description)
  upsertMeta('property', 'og:url', canonicalUrl)
  upsertMeta('property', 'og:image', previewUrl)
  upsertMeta('name', 'twitter:title', metadata.title)
  upsertMeta('name', 'twitter:description', metadata.description)
  upsertMeta('name', 'twitter:image', previewUrl)
  upsertCanonical(canonicalUrl)
}
