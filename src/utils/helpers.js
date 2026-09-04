export const detectClimate = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('Manila') || tz.includes('Jakarta') || tz.includes('Bangkok') || 
        tz.includes('Ho_Chi_Minh') || tz.includes('Kuala_Lumpur') || tz.includes('Singapore') ||
        tz.includes('Bogota') || tz.includes('Lima') || tz.includes('Nairobi')) {
      return 'tropical'
    }
  } catch (e) {}
  return 'temperate'
}

export const getRealWorldSeason = () => {
  const month = new Date().getMonth() 
  const climate = detectClimate() 
  
  if (climate === 'tropical') {
    if (month === 11 || month <= 4) return 4 
    return 5 
  } else {
    if (month >= 2 && month <= 4) return 0 
    if (month >= 5 && month <= 7) return 1 
    if (month >= 8 && month <= 10) return 2 
    return 3 
  }
}

export const calculateTimeOfDay = () => {
  const currentHour = new Date().getHours()
  if (currentHour >= 5 && currentHour < 8) return 'dawn'
  if (currentHour >= 8 && currentHour < 17) return 'day'
  if (currentHour >= 17 && currentHour < 20) return 'dusk'
  return 'night'
}

export const getWordAtIndex = (text, index) => {
  let start = index; while (start > 0 && text[start - 1] !== ' ') start--
  let end = index; while (end < text.length && text[end] !== ' ') end++
  return text.slice(start, end).trim()
}