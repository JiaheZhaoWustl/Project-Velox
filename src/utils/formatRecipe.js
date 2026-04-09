/** Format recipe data for display in taste profile recommendations */

export function formatRecipeIngredients(recipe) {
  if (!recipe?.ingredients?.length) return []
  return recipe.ingredients
}

export function formatRecipeSteps(recipe) {
  if (!recipe?.steps?.length) return []
  return recipe.steps
}

export function formatRecipeGlassware(recipe) {
  return recipe?.glassware || ''
}

/**
 * Legacy helper — returns flat string lines from recipe components.
 * Kept for backward compatibility with older recipe shapes.
 */
export function formatRecipeComponents(recipe) {
  if (!recipe) return []
  if (recipe.ingredients) {
    return recipe.ingredients
  }
  if (recipe.components) {
    const parts = []
    Object.entries(recipe.components).forEach(([role, items]) => {
      if (Array.isArray(items) && items.length) {
        const label = role.replace(/_/g, ' ')
        parts.push(`${label}: ${items.join(', ')}`)
      }
    })
    if (recipe.build?.method) parts.push(`Method: ${recipe.build.method}`)
    if (recipe.build?.glassware) parts.push(`Glass: ${recipe.build.glassware}`)
    return parts
  }
  return []
}
