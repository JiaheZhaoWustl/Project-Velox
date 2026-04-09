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

export const AXIS_INFO = {
  sweetness: 'How much sugar-like flavor you enjoy — from bone-dry to dessert-sweet.',
  sourness: 'The tart, acidic punch — think fresh citrus juice or vinegar shrubs.',
  bitterness: 'That bracing bite from ingredients like Campari, coffee, or dark chocolate.',
  saltiness: 'A savory, mineral edge — like a salted rim or olive brine.',
  umami: 'Deep, savory richness — think tomato juice, miso, or aged spirits.',
  strength: 'How boozy you want your drink — from a light spritz to a spirit-forward sipper.',
  mouthfeelRoughSmooth: 'Texture on the palate: rough/astringent (like tannins in tea) vs. silky-smooth.',
  mouthfeelCrispDense: 'Body weight: crisp and thin (like soda water) vs. dense and full (like a milkshake).',
  mouthfeelFlatSparkling: 'Carbonation level: still and calm vs. fizzy and effervescent.',
  mouthfeelClearCreamy: 'Clarity vs. richness: a clear, clean pour vs. a thick, creamy consistency.',
  adventurous: 'Stick with crowd-pleasing classics, or explore unusual ingredients and techniques.',
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
