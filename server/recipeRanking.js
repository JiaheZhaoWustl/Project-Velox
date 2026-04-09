/**
 * Deterministic recipe scoring from customer taste profile vs recipe metadata.
 * Uses graduated penalties for not_recommended_if, recipe-aware sparkle rules,
 * and MMR-style diversity so top picks are not all the same family / base spirit.
 */

const TASTE_KEYS = ['sweetness', 'sourness', 'bitterness', 'saltiness', 'umami']
const MOUTH_KEYS = ['rough_smooth', 'crisp_dense', 'flat_sparkling', 'clear_creamy']

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

function l2dist(userObj, recipeObj, keys) {
  let s = 0
  for (const k of keys) {
    const u = userObj[k] ?? 5
    const r = recipeObj[k] ?? 5
    s += (u - r) ** 2
  }
  return Math.sqrt(s)
}

/** Map UI aroma labels to substrings we look for in recipe aroma_tags (lowercase). */
const AROMA_HINTS = {
  citrus: ['lime', 'lemon', 'citrus', 'grapefruit', 'orange'],
  herbaceous: ['herb', 'mint', 'basil', 'grass'],
  floral: ['floral', 'elderflower', 'rose', 'perfume'],
  fruity: ['fruit', 'berry', 'apple', 'passion', 'pineapple', 'tropical'],
  spicy: ['spice', 'pepper', 'ginger', 'cinnamon'],
  tropical: ['tropical', 'pineapple', 'coconut', 'passion'],
  woody: ['oak', 'wood', 'barrel'],
  nutty: ['nut', 'almond', 'walnut'],
  smoky: ['smoke', 'peat', 'mezcal'],
  earthy: ['earth', 'soil', 'mushroom', 'herbal'],
}

const MOOD_HINTS = {
  calm: ['calm', 'soft', 'relaxed', 'contemplative'],
  playful: ['playful', 'fun', 'bright'],
  nostalgic: ['nostalgic', 'warm', 'comfort'],
  energetic: ['energetic', 'bright', 'festive'],
  romantic: ['romantic', 'elegant', 'soft'],
  adventurous: ['adventurous', 'bold'],
  relaxed: ['relaxed', 'calm', 'contemplative'],
  celebratory: ['celebratory', 'festive', 'sunny'],
  cozy: ['cozy', 'warm', 'comfort'],
  refreshed: ['refreshing', 'bright', 'crisp'],
}

function tagOverlapScore(userTags, recipeTags, hintMap) {
  if (!userTags?.length) return null
  const r = (recipeTags || []).map((t) => String(t).toLowerCase())
  let hits = 0
  for (const raw of userTags) {
    const key = String(raw).toLowerCase().trim()
    const hints = hintMap[key] || [key.replace(/\s+/g, '_')]
    if (hints.some((h) => r.some((rt) => rt.includes(h) || h.includes(rt)))) hits += 1
  }
  return (hits / userTags.length) * 100
}

function recipeHasPineapple(recipe) {
  const blob = JSON.stringify(recipe.components || {}).toLowerCase()
  return blob.includes('pineapple') || String(recipe.id || '').includes('pineapple')
}

function isTropicalOrExplicitFruitIntent(customer) {
  const aromas = [...(customer.aroma_tags || [])].map((a) => String(a).toLowerCase().trim())
  const extra = `${customer.avoid_or_dislike || ''} ${customer.anything_else || ''}`.toLowerCase()
  if (/pineapple|passion\s*fruit|tropical|tiki|mango|pina/.test(extra)) return 'full'
  if (aromas.some((a) => a === 'tropical')) return 'full'
  return null
}

function isFruityAromaOnly(customer) {
  const aromas = [...(customer.aroma_tags || [])].map((a) => String(a).toLowerCase().trim())
  return aromas.some((a) => a === 'fruity')
}

/**
 * Sparkling vs still: flat_preference_max_below means different things for bubbly vs still builds.
 * - Sparkling recipe (high flat_sparkling): penalize if user wants still drinks (low flat_sparkling).
 * - Still recipe (low flat_sparkling): penalize if user wants effervescence (high flat_sparkling).
 */
function flatPreferencePenalty(recipe, userFlat, threshold) {
  if (threshold == null) return 0
  const rf = recipe.mouthfeel_profile?.flat_sparkling ?? 5
  const u = userFlat ?? 5

  if (rf >= 6) {
    if (u < threshold) {
      const depth = (threshold - u) / Math.max(threshold, 1)
      return 38 + 32 * clamp(depth, 0, 1)
    }
  } else if (rf <= 3) {
    const needSparkleAbove = 10 - threshold
    if (u > needSparkleAbove) {
      const depth = (u - needSparkleAbove) / Math.max(10 - needSparkleAbove, 1)
      return 38 + 32 * clamp(depth, 0, 1)
    }
  } else {
    if (u < threshold) {
      return 28 + 15 * clamp((threshold - u) / Math.max(threshold, 1), 0, 1)
    }
  }
  return 0
}

function graduatedAbove(userVal, minAbove, scale = 10) {
  if (userVal <= minAbove) return 0
  const over = userVal - minAbove
  const room = Math.max(scale - minAbove, 1)
  return clamp(over / room, 0, 1)
}

/**
 * Returns total penalty 0–120+ from not_recommended_if (dataset semantics: any matching rule hurts fit).
 */
function notRecommendedPenalty(customer, recipe) {
  const nr = recipe.not_recommended_if
  if (!nr) return 0

  const tp = customer.taste_profile || {}
  const mp = customer.mouthfeel_profile || {}
  const xp = customer.experience_profile || {}

  let total = 0

  if (nr.bitterness_min_above != null) {
    const u = tp.bitterness ?? 5
    if (u > nr.bitterness_min_above) {
      total += 42 + 28 * graduatedAbove(u, nr.bitterness_min_above)
    }
  }
  if (nr.sweetness_min_above != null) {
    const u = tp.sweetness ?? 5
    if (u > nr.sweetness_min_above) {
      total += 42 + 28 * graduatedAbove(u, nr.sweetness_min_above)
    }
  }
  if (nr.sourness_min_above != null) {
    const u = tp.sourness ?? 5
    if (u > nr.sourness_min_above) {
      total += 42 + 28 * graduatedAbove(u, nr.sourness_min_above)
    }
  }
  if (nr.dense_preference_min_above != null) {
    const u = mp.crisp_dense ?? 5
    if (u > nr.dense_preference_min_above) {
      total += 38 + 25 * graduatedAbove(u, nr.dense_preference_min_above)
    }
  }
  if (nr.creamy_preference_min_above != null) {
    const u = mp.clear_creamy ?? 5
    if (u > nr.creamy_preference_min_above) {
      total += 38 + 25 * graduatedAbove(u, nr.creamy_preference_min_above)
    }
  }
  if (nr.clear_preference_max_below != null) {
    const u = mp.clear_creamy ?? 5
    if (u < nr.clear_preference_max_below) {
      total += 38 + 25 * (nr.clear_preference_max_below - u) / Math.max(nr.clear_preference_max_below, 1)
    }
  }
  if (nr.flat_preference_max_below != null) {
    total += flatPreferencePenalty(recipe, mp.flat_sparkling ?? 5, nr.flat_preference_max_below)
  }
  if (nr.sparkling_preference_min_above != null) {
    const u = mp.flat_sparkling ?? 5
    if (u > nr.sparkling_preference_min_above) {
      total += 38 + 28 * graduatedAbove(u, nr.sparkling_preference_min_above)
    }
  }
  if (nr.strength_max_below != null) {
    const u = xp.strength ?? 5
    if (u < nr.strength_max_below) {
      total += 42 + 28 * (nr.strength_max_below - u) / Math.max(nr.strength_max_below, 1)
    }
  }
  if (nr.strength_min_above != null) {
    const u = xp.strength ?? 5
    if (u > nr.strength_min_above) {
      total += 42 + 28 * graduatedAbove(u, nr.strength_min_above)
    }
  }

  return total
}

function splitBasePenalty(customer, recipe) {
  if (!recipe.split_base_allowed) return 0
  const adv = customer.experience_profile?.adventurousness ?? 5
  if (adv < 5) return 22 + (5 - adv) * 4
  return 0
}

function pineappleModifierPenalty(customer, recipe) {
  if (!recipeHasPineapple(recipe)) return 0
  const intent = isTropicalOrExplicitFruitIntent(customer)
  if (intent === 'full') return 0
  if (isFruityAromaOnly(customer)) return 22
  const base = 52
  return base
}

/** Slight de-prioritize obvious “margarita variant” clutter vs classic builds elsewhere in the list. */
function margaritaVariantPenalty(recipe) {
  const fam = recipe.cocktail_family || ''
  const id = recipe.id || ''
  if (id === 'pineapple_margarita' || id === 'split_base_margarita') return 12
  if (fam === 'tropical_daisy') return 12
  return 0
}

/** Elderflower / floral-led builds should not dominate neutral profiles unless the user picks Floral or mentions it. */
function floralModifierPenalty(customer, recipe) {
  const fam = recipe.cocktail_family || ''
  const blob = JSON.stringify(recipe.components || {}).toLowerCase()
  const hasElderflower = blob.includes('elderflower')
  if (fam !== 'floral_sour' && !hasElderflower) return 0
  const aromas = (customer.aroma_tags || []).map((a) => String(a).toLowerCase().trim())
  if (aromas.includes('floral')) return 0
  const extra = `${customer.avoid_or_dislike || ''} ${customer.anything_else || ''}`.toLowerCase()
  if (/floral|elderflower|flower|parma|perfume/.test(extra)) return 0
  if (fam === 'floral_sour') return 24
  return 17
}

/**
 * @param {object} customer — shape from buildCustomerTasteProfileForGpt
 * @param {object} recipe — one recipe from velox_recipes_llm_ready.json
 * @returns {{ score: number, tiebreak: number }} score 0–100 (one decimal), tiebreak lower = better raw fit
 */
function scoreRecipe(customer, recipe) {
  const tp = customer.taste_profile || {}
  const mp = customer.mouthfeel_profile || {}
  const rp = recipe.taste_profile || {}
  const rm = recipe.mouthfeel_profile || {}
  const xe = customer.experience_profile || {}
  const re = recipe.experience_profile || {}

  const tasteD = l2dist(tp, rp, TASTE_KEYS)
  const mouthD = l2dist(mp, rm, MOUTH_KEYS)
  const maxTaste = Math.sqrt(TASTE_KEYS.length * 100)
  const maxMouth = Math.sqrt(MOUTH_KEYS.length * 100)

  const tastePart = 100 * (1 - clamp(tasteD / maxTaste, 0, 1))
  const mouthPart = 100 * (1 - clamp(mouthD / maxMouth, 0, 1))

  const strU = xe.strength ?? 5
  const strR = re.strength ?? 5
  const advU = xe.adventurousness ?? 5
  const advR = re.adventurousness ?? 5
  const expPart =
    100 -
    (Math.abs(strU - strR) / 10) * 52 -
    (Math.abs(advU - advR) / 10) * 28

  let aromaPart = 52
  const ar = tagOverlapScore(customer.aroma_tags, recipe.aroma_tags, AROMA_HINTS)
  if (ar != null) aromaPart = ar

  let moodPart = 52
  const mo = tagOverlapScore(customer.mood_tags, recipe.mood_tags, MOOD_HINTS)
  if (mo != null) moodPart = mo

  const hasAroma = (customer.aroma_tags || []).length > 0
  const hasMood = (customer.mood_tags || []).length > 0

  let wTaste = 0.34
  let wMouth = 0.28
  let wExp = 0.18
  let wAroma = hasAroma ? 0.12 : 0
  let wMood = hasMood ? 0.08 : 0
  if (!hasAroma && !hasMood) {
    wTaste += 0.06
    wMouth += 0.06
  }
  const sumW = wTaste + wMouth + wExp + wAroma + wMood
  const n = 1 / sumW

  let blended =
    (tastePart * wTaste + mouthPart * wMouth + expPart * wExp + aromaPart * wAroma + moodPart * wMood) * n

  const nrPen = notRecommendedPenalty(customer, recipe)
  blended -= nrPen
  blended -= splitBasePenalty(customer, recipe)
  blended -= pineappleModifierPenalty(customer, recipe)
  blended -= margaritaVariantPenalty(recipe)
  blended -= floralModifierPenalty(customer, recipe)

  if (nrPen >= 55) {
    blended *= 0.45
  } else if (nrPen >= 35) {
    blended *= 0.72
  }

  if (strU === 0) {
    blended -= (strR / 10) * 42
  }

  const strDiff = Math.abs(strU - strR)
  const advDiff = Math.abs(advU - advR)
  const tiebreak = tasteD + mouthD + strDiff * 0.35 + advDiff * 0.25

  const raw = clamp(blended, 0, 100)
  const score = Math.round(raw * 10) / 10
  return { score, tiebreak }
}

function recipeSimilarity(a, b) {
  const ra = a.recipe
  const rb = b.recipe
  const famA = ra.cocktail_family || ''
  const famB = rb.cocktail_family || ''
  const baseA = (ra.base_spirits || [])[0] || ''
  const baseB = (rb.base_spirits || [])[0] || ''
  const styleA = ra.style || ''
  const styleB = rb.style || ''

  let sim = 0
  if (famA && famA === famB) sim += 0.58
  else if (famA && famB && (famA.includes(famB) || famB.includes(famA))) sim += 0.35
  else if (
    (famA === 'daisy' && famB === 'tropical_daisy') ||
    (famA === 'tropical_daisy' && famB === 'daisy')
  ) {
    sim += 0.48
  }
  if (baseA && baseA === baseB) sim += 0.32
  if (styleA && styleA === styleB) {
    sim += 0.14
    if (styleA === 'sour' || styleA === 'citrus_forward') sim += 0.12
  }
  return clamp(sim, 0, 1)
}

function maxSimToSelected(candidate, selected) {
  if (!selected.length) return 0
  let m = 0
  for (const s of selected) {
    m = Math.max(m, recipeSimilarity(candidate, s))
  }
  return m
}

/**
 * MMR: balance relevance (score) with diversity vs already picked items.
 */
function mmrSelect(ranked, k, poolSize, lambda) {
  const pool = ranked.slice(0, Math.min(poolSize, ranked.length))
  if (pool.length === 0) return []
  const selected = [pool[0]]
  const remaining = pool.slice(1)
  while (selected.length < k && remaining.length) {
    let bestIdx = 0
    let bestMmr = -Infinity
    for (let i = 0; i < remaining.length; i++) {
      const sim = maxSimToSelected(remaining[i], selected)
      const mmr = lambda * remaining[i].score - (1 - lambda) * sim * 100
      if (mmr > bestMmr) {
        bestMmr = mmr
        bestIdx = i
      }
    }
    selected.push(remaining.splice(bestIdx, 1)[0])
  }
  return selected
}

/**
 * @param {object} customer
 * @param {object[]} recipes
 * @returns {{ recipe: object, score: number }[]}
 */
function rankRecipes(customer, recipes) {
  const list = (recipes || []).map((recipe) => {
    const { score, tiebreak } = scoreRecipe(customer, recipe)
    return { recipe, score, tiebreak }
  })
  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.tiebreak !== b.tiebreak) return a.tiebreak - b.tiebreak
    return String(a.recipe.id).localeCompare(String(b.recipe.id))
  })
  return list
}

/**
 * Top picks + runner-ups with diversity (different families / bases when possible).
 */
function selectDiverseRecommendationSlots(ranked, topK = 3, runnerK = 3, options = {}) {
  const poolSize = options.poolSize ?? 20
  const lambdaTop = options.lambdaTop ?? 0.62
  const lambdaRunner = options.lambdaRunner ?? 0.72

  const top = mmrSelect(ranked, topK, poolSize, lambdaTop)
  const used = new Set(top.map((t) => t.recipe.id))
  const rest = ranked.filter((r) => !used.has(r.recipe.id))
  const runners = mmrSelect(rest, runnerK, poolSize, lambdaRunner)
  return { top, runners }
}

module.exports = {
  rankRecipes,
  scoreRecipe,
  selectDiverseRecommendationSlots,
  recipeSimilarity,
}
