import { fallbackQuotes } from '../utils/constants'

export const fetchPassages = async () => {
  try {
    const [response] = await Promise.all([
      fetch('https://dummyjson.com/quotes?limit=145', { cache: 'no-cache' }),
      new Promise(resolve => setTimeout(resolve, 2500)) // Zen artificial delay
    ])
    if (!response.ok) throw new Error('API unreachable')
    const json = await response.json()
    return json.quotes.sort((a, b) => a.id - b.id).map(item => ({ 
      text: String(item.quote).trim(), 
      author: String(item.author).trim() 
    }))
  } catch (error) {
    return fallbackQuotes
  }
}