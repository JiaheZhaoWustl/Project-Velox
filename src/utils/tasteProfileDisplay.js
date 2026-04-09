import { formatRecipeIngredients, formatRecipeSteps, formatRecipeGlassware } from './formatRecipe'

export const MOCK_COCKTAIL = {
  name: 'Smoked Boulevardier',
  description:
    'A dry, intensely bitter, herbal, and woody drink with strong ABV, low sweetness, and a complex, late-night, cigar-pairing character.',
  ingredients: [
    '1 oz rye whiskey (bold, dry base)',
    '1 oz Campari (bitter backbone)',
    '1 oz sweet vermouth (complex, umami-balancing layer)',
  ],
  steps: [
    'Combine all ingredients in a mixing glass with ice.',
    'Stir for 30 seconds until well chilled.',
    'Strain over a large cube in a rocks glass.',
    'Optional: rinse glass with peated Scotch for smoke.',
    'Garnish with orange peel and a touch of smoked sea salt.',
  ],
  glassware: 'Rocks',
}

/**
 * @param {object | null} currentRec - one entry from recommendations.top_recommendations
 */
export function buildDisplayCocktail(currentRec) {
  if (!currentRec) return null

  const whyParts = (currentRec.why_it_matches || [])
    .map((s) => s.replace(/\.+$/, ''))
  const description = whyParts.length
    ? whyParts.join('. ') + '.'
    : 'Personalized recommendation based on your taste profile.'

  const recipe = currentRec.recipe
  const ingredients = recipe ? formatRecipeIngredients(recipe) : []
  const steps = recipe ? formatRecipeSteps(recipe) : []
  const glassware = recipe ? formatRecipeGlassware(recipe) : ''

  // Stale cached data without recipe — signal the UI to show fallback
  const needsRecipeRefresh = !recipe || (ingredients.length === 0 && steps.length === 0)

  return {
    name: currentRec.recipe_name,
    description,
    ingredients,
    steps,
    glassware,
    matchScore: currentRec.match_score,
    customizations: (currentRec.possible_customizations || []).slice(0, 1),
    tradeoffs: currentRec.tradeoffs || [],
    needsRecipeRefresh,
  }
}
