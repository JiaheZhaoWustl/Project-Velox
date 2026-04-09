/** Shared taste profile constants used by CustomerOnboarding and CustomerTasteProfile */

export const AROMAS = [
  'Citrus',
  'Herbaceous',
  'Floral',
  'Fruity',
  'Spicy',
  'Tropical',
  'Woody',
  'Nutty',
  'Smoky',
  'Earthy',
]

export const FEELINGS = [
  'Calm',
  'Playful',
  'Nostalgic',
  'Energetic',
  'Romantic',
  'Adventurous',
  'Relaxed',
  'Celebratory',
  'Cozy',
  'Refreshed',
]

export const SCALE_LABELS = {
  taste: { low: 'Low', high: 'High' },
  strength: { low: 'Light / refreshing', high: 'Strong / Bold' },
  mouthfeel: { low: 'Rough', high: 'Smooth' },
  crisp: { low: 'Crisp', high: 'Dense' },
  flat: { low: 'Flat', high: 'Sparkling' },
  clear: { low: 'Clear', high: 'Creamy' },
  adventurous: { low: 'Classic and familiar', high: 'Creative and experimental' },
}

export const DEFAULT_PREFS = {
  sweetness: 5,
  sourness: 5,
  bitterness: 5,
  saltiness: 5,
  umami: 5,
  strength: 5,
  mocktail: 0,
  aromas: [],
  mouthfeelRoughSmooth: 5,
  mouthfeelCrispDense: 5,
  mouthfeelFlatSparkling: 5,
  mouthfeelClearCreamy: 5,
  feelings: [],
  feelingsText: '',
  aromasCustom: '',
  adventurous: 5,
  additionalNotes: '',
}
