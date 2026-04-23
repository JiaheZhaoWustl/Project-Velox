/**
 * GPT cocktail recommendations: prompt loading and OpenAI API calls.
 */
const path = require('path')
const fs = require('fs')
const OpenAI = require('openai').default

const PROJECT_ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(PROJECT_ROOT, 'data')
const SYSTEM_PROMPT_PATH = path.join(DATA_DIR, 'velox_gpt_api_prompt.txt')
/** Append-only JSONL: one record per successful /api/recommendations call (GPT’s numeric ratings + context). */
const RECOMMENDATION_LOG_PATH = path.join(DATA_DIR, 'gpt_recommendation_log.jsonl')
const IMAGE_PROMPT_PATH = path.join(DATA_DIR, 'cocktail_image_prompt.txt')
const MOCKTAIL_PROMPT_PATH = path.join(DATA_DIR, 'velox_gpt_mocktail_prompt.txt')
const INGREDIENTS_PATH = path.join(DATA_DIR, 'velox_ingredients.json')
const GENERATED_IMAGES_DIR = path.join(PROJECT_ROOT, 'generated-images')

function loadSystemPrompt() {
  try {
    return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8')
  } catch {
    return 'You are a cocktail recommendation engine. Return valid JSON only.'
  }
}

function loadMocktailPrompt() {
  try {
    return fs.readFileSync(MOCKTAIL_PROMPT_PATH, 'utf-8')
  } catch {
    return 'You are a non-alcoholic drink recommendation engine. Every drink must be 100% non-alcoholic. Return valid JSON only.'
  }
}

/** Load the pantry JSON used to constrain mocktail recipes to on-hand ingredients. */
function loadIngredientsPantry() {
  try {
    const raw = fs.readFileSync(INGREDIENTS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    console.warn('[GPT] Could not load ingredients pantry:', e.message)
    return null
  }
}

function toSafeString(value) {
  return String(value || '').trim()
}

function buildIngredientUsageBalance(orderHistory, pantry) {
  if (!pantry?.ingredients || !Array.isArray(orderHistory) || orderHistory.length === 0) return null

  const juiceItems = Array.isArray(pantry.ingredients.juices) ? pantry.ingredients.juices : []
  if (juiceItems.length === 0) return null

  const juiceNames = juiceItems
    .map((item) => toSafeString(item?.name))
    .filter(Boolean)

  if (juiceNames.length === 0) return null

  const usageCounts = Object.fromEntries(juiceNames.map((name) => [name, 0]))

  for (const order of orderHistory) {
    const items = Array.isArray(order?.items) ? order.items : []
    for (const row of items) {
      const ingredientLines = Array.isArray(row?.ingredients) ? row.ingredients : []
      for (const line of ingredientLines) {
        const raw = toSafeString(line).toLowerCase()
        if (!raw) continue
        for (const name of juiceNames) {
          if (raw.includes(name.toLowerCase())) usageCounts[name] += 1
        }
      }
    }
  }

  const totalHits = Object.values(usageCounts).reduce((sum, n) => sum + n, 0)
  if (totalHits === 0) return null

  const avg = totalHits / juiceNames.length
  const overused = juiceNames.filter((name) => usageCounts[name] >= Math.max(3, avg * 1.3))
  const underused = juiceNames.filter((name) => usageCounts[name] <= avg * 0.7)
  const ranked = [...juiceNames].sort((a, b) => usageCounts[b] - usageCounts[a])

  return {
    tracked_juices: juiceNames,
    usage_counts: usageCounts,
    total_hits: totalHits,
    balancing_guidance: {
      overused,
      underused,
      priority_reduce: ranked.slice(0, 2),
      priority_increase: [...ranked].reverse().slice(0, 2),
    },
  }
}

function buildCustomerTasteProfileForGpt(prefs) {
  return {
    taste_profile: {
      sweetness: prefs.sweetness ?? 5,
      sourness: prefs.sourness ?? 5,
      bitterness: prefs.bitterness ?? 5,
      saltiness: prefs.saltiness ?? 5,
      umami: prefs.umami ?? 5,
    },
    mouthfeel_profile: {
      rough_smooth: prefs.mouthfeelRoughSmooth ?? 5,
      crisp_dense: prefs.mouthfeelCrispDense ?? 5,
      flat_sparkling: prefs.mouthfeelFlatSparkling ?? 5,
      clear_creamy: prefs.mouthfeelClearCreamy ?? 5,
    },
    experience_profile: {
      strength: prefs.mocktail === 1 ? 0 : (prefs.strength ?? 5),
      adventurousness: prefs.adventurous ?? 5,
    },
    aroma_tags: [...(prefs.aromas || []), prefs.aromasCustom].filter(Boolean),
    mood_tags: [...(prefs.feelings || []), prefs.feelingsText].filter(Boolean),
    additional_notes: prefs.additionalNotes || '',
  }
}

/** Flat profile keys aligned with velox_gpt_api_prompt.txt "HOW TO READ THE USER PROFILE". */
function buildCustomerProfileForPrompt(prefs) {
  return {
    sweetness: prefs.sweetness ?? 5,
    sourness: prefs.sourness ?? 5,
    bitterness: prefs.bitterness ?? 5,
    saltiness: prefs.saltiness ?? 5,
    umami: prefs.umami ?? 5,
    strength: prefs.mocktail === 1 ? 0 : (prefs.strength ?? 5),
    mocktail: prefs.mocktail ?? 0,
    aromas: [...(prefs.aromas || []), prefs.aromasCustom].filter(Boolean),
    feelings: [...(prefs.feelings || []), prefs.feelingsText].filter(Boolean),
    mouthfeelRoughSmooth: prefs.mouthfeelRoughSmooth ?? 5,
    mouthfeelCrispDense: prefs.mouthfeelCrispDense ?? 5,
    mouthfeelFlatSparkling: prefs.mouthfeelFlatSparkling ?? 5,
    mouthfeelClearCreamy: prefs.mouthfeelClearCreamy ?? 5,
    adventurous: prefs.adventurous ?? 5,
    additionalNotes: prefs.additionalNotes || '',
  }
}

function slugId(name, prefix, index) {
  const slug = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `${prefix}-${index}-${slug || 'cocktail'}`
}

/** Normalize GPT gpt_ratings; coerces numbers where possible. */
function normalizeGptRatings(raw) {
  if (!raw || typeof raw !== 'object') return null
  const overall = raw.overall_fit
  const overallNum =
    typeof overall === 'number' && Number.isFinite(overall)
      ? Math.max(0, Math.min(100, Math.round(overall)))
      : null
  const dimsIn = raw.dimensions && typeof raw.dimensions === 'object' ? raw.dimensions : {}
  const dimensions = {}
  for (const [k, v] of Object.entries(dimsIn)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      dimensions[k] = Math.max(0, Math.min(10, Math.round(v)))
    }
  }
  if (overallNum == null && Object.keys(dimensions).length === 0) return null
  return { overall_fit: overallNum, dimensions }
}

function matchScoreFromGptRatings(gptRatings) {
  if (!gptRatings || typeof gptRatings.overall_fit !== 'number') return null
  return gptRatings.overall_fit
}

function normalizeRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map((s) => String(s).trim()).filter(Boolean)
      : [],
    steps: Array.isArray(raw.steps)
      ? raw.steps.map((s) => String(s).trim()).filter(Boolean)
      : [],
    glassware: typeof raw.glassware === 'string' ? raw.glassware.trim() : '',
  }
}

/**
 * Map GPT JSON (primary_recommendation + alternative_suggestions) to UI-friendly top_recommendations.
 */
function normalizeRecommendationsResponse(raw) {
  const primary = raw.primary_recommendation
  const alts = Array.isArray(raw.alternative_suggestions) ? raw.alternative_suggestions : []

  const top_recommendations = []
  if (primary && primary.cocktail_name) {
    const gptRatings = normalizeGptRatings(primary.gpt_ratings)
    primary.gpt_ratings = gptRatings
    top_recommendations.push({
      recipe_id: slugId(primary.cocktail_name, 'primary', 0),
      recipe_name: primary.cocktail_name,
      gpt_ratings: gptRatings,
      match_score: matchScoreFromGptRatings(gptRatings),
      why_it_matches: Array.isArray(primary.why_it_fits) ? primary.why_it_fits : [],
      possible_customizations: Array.isArray(primary.possible_customizations)
        ? primary.possible_customizations
        : [],
      tradeoffs: Array.isArray(primary.tradeoffs) ? primary.tradeoffs : [],
      recipe: normalizeRecipe(primary.recipe),
    })
  }
  alts.forEach((alt, i) => {
    if (!alt || !alt.cocktail_name) return
    const gptRatings = normalizeGptRatings(alt.gpt_ratings)
    alt.gpt_ratings = gptRatings
    top_recommendations.push({
      recipe_id: slugId(alt.cocktail_name, 'alt', i),
      recipe_name: alt.cocktail_name,
      gpt_ratings: gptRatings,
      match_score: matchScoreFromGptRatings(gptRatings),
      why_it_matches: Array.isArray(alt.why_it_fits) ? alt.why_it_fits : [],
      possible_customizations: Array.isArray(alt.possible_customizations)
        ? alt.possible_customizations
        : [],
      tradeoffs: [],
      recipe: normalizeRecipe(alt.recipe),
    })
  })

  return {
    primary_recommendation: primary,
    alternative_suggestions: alts,
    profile_summary: raw.profile_summary || { dominant_preferences: [], avoidances: [] },
    top_recommendations,
    runner_ups: [],
  }
}

function shouldAppendRecommendationLog() {
  const v = process.env.GPT_RECOMMENDATION_LOG
  if (v == null || String(v).trim() === '') return true
  return !/^(0|false|off|no)$/i.test(String(v).trim())
}

/**
 * Append one JSON line with customer profile snapshot + GPT ratings (for your own analysis).
 */
function appendRecommendationLog({ model, customer_profile, recommendations }) {
  if (!shouldAppendRecommendationLog()) return
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      model,
      customer_profile,
      recommendations,
    })
    fs.appendFileSync(RECOMMENDATION_LOG_PATH, line + '\n', 'utf-8')
    console.log('[GPT] Logged recommendation record to:', RECOMMENDATION_LOG_PATH)
  } catch (e) {
    console.warn('[GPT] Could not append recommendation log:', e.message)
  }
}

/**
 * Get cocktail recommendations from GPT based on customer taste profile.
 * @param {object} customerProfile - Raw customer taste profile from request
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ success: true, recommendations: object }>}
 * @throws {Error} with .status for HTTP status (401, 502, 503)
 */
async function getRecommendations(customerProfile, apiKey, options = {}) {
  if (!apiKey || !apiKey.trim()) {
    const err = new Error('OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.')
    err.status = 503
    throw err
  }

  const customerProfilePayload = buildCustomerProfileForPrompt(customerProfile)

  const isMocktail = customerProfilePayload.mocktail === 1
  let systemPrompt = isMocktail ? loadMocktailPrompt() : loadSystemPrompt()
  const promptSource = isMocktail ? MOCKTAIL_PROMPT_PATH : SYSTEM_PROMPT_PATH
  console.log('[GPT] Prompt loaded from:', promptSource, isMocktail ? '(MOCKTAIL)' : '')

  // Mocktails are constrained to the Velox pantry. Inject the ingredient list
  // into both the system prompt and user message so the model cannot drift.
  const pantry = loadIngredientsPantry()
  if (isMocktail) {
    if (pantry) {
      systemPrompt += `\n\nAVAILABLE INGREDIENTS (authoritative pantry — the only ingredients you may use):\n${JSON.stringify(
        pantry,
        null,
        2
      )}`
      console.log('[GPT] Injected pantry into mocktail prompt from:', INGREDIENTS_PATH)
    } else {
      console.warn('[GPT] Mocktail mode but pantry unavailable — model will have no ingredient list.')
    }
  }

  const ingredientUsageBalance = buildIngredientUsageBalance(options.orderHistory || [], pantry)
  if (ingredientUsageBalance) {
    systemPrompt += `\n\nINGREDIENT ROTATION GOAL:\nWhen possible, avoid repeatedly overused juices and help spread usage more evenly across available juices while still matching the user's taste profile. This is a secondary preference and must not violate hard safety or recipe constraints.`
  }

  console.log('[GPT] Sending API request to OpenAI...')

  const messageSections = [
    `customer_profile:
${JSON.stringify(customerProfilePayload, null, 2)}
`,
  ]

  if (isMocktail && pantry) {
    messageSections.push(`available_ingredients (reminder — use ONLY these ingredients, respecting each item's \`use\`/\`usage\` rules):
${JSON.stringify(pantry, null, 2)}
`)
  }

  if (ingredientUsageBalance) {
    messageSections.push(`ingredient_usage_balance_from_order_history:
${JSON.stringify(ingredientUsageBalance, null, 2)}

Use this to reduce repeated reliance on overused juices and favor underused juices when flavor fit is still good.`)
  }

  const userMessage = messageSections.join('\n')

  // Sampling & budget (see .env.example). Low temperature → repetitive "safe" picks.
  // Token limits usually show up as truncated JSON / parse errors, not similarity.
  const model =
    (process.env.OPENAI_RECOMMENDATIONS_MODEL || '').trim() || 'gpt-5.4'
  const temperature = parseFloat(String(process.env.OPENAI_RECOMMENDATIONS_TEMPERATURE || '0.9'))
  const topP = process.env.OPENAI_RECOMMENDATIONS_TOP_P
  const maxCompletionTokensRaw = process.env.OPENAI_RECOMMENDATIONS_MAX_COMPLETION_TOKENS
  const max_completion_tokens =
    maxCompletionTokensRaw != null && String(maxCompletionTokensRaw).trim() !== ''
      ? parseInt(maxCompletionTokensRaw, 10)
      : 4096

  const completionParams = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: Number.isFinite(temperature) ? temperature : 0.9,
    max_completion_tokens: Number.isFinite(max_completion_tokens) ? max_completion_tokens : 4096,
  }
  if (topP != null && String(topP).trim() !== '') {
    const p = parseFloat(topP, 10)
    if (Number.isFinite(p)) completionParams.top_p = p
  }

  const openai = new OpenAI({ apiKey: apiKey.trim() })
  const completion = await openai.chat.completions.create(completionParams)

  const content = completion.choices?.[0]?.message?.content?.trim()
  if (!content) {
    const err = new Error('Empty response from OpenAI')
    err.status = 502
    throw err
  }

  // Extract JSON (handle markdown code blocks)
  let jsonStr = content
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) jsonStr = codeBlock[1].trim()

  const parsed = JSON.parse(jsonStr)
  const recommendations = normalizeRecommendationsResponse(parsed)
  console.log(
    '[GPT] Recommendations:',
    recommendations.top_recommendations
      .map((r) => {
        const s = r.match_score != null ? ` (${r.match_score})` : ''
        return `${r.recipe_name}${s}`
      })
      .join(', ')
  )

  appendRecommendationLog({
    model,
    customer_profile: customerProfilePayload,
    recommendations,
  })

  return { success: true, recommendations }
}

/**
 * GPT copy for a single menu item (modal on customer menu).
 * @returns {Promise<{ subtitle: string, highlights: string[], tasting_notes: string, pairing: string }>}
 */
async function getMenuItemDetailFromGpt(item, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    const err = new Error('OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.')
    err.status = 503
    throw err
  }

  const model = (process.env.OPENAI_MENU_DETAIL_MODEL || '').trim() || 'gpt-4o-mini'
  const openai = new OpenAI({ apiKey: apiKey.trim() })
  const userPayload = {
    name: item.name,
    menu_description: item.description || '',
    section: item.section || '',
    list_price_usd: item.price,
  }

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You write concise bar menu copy. Return ONLY a JSON object with keys: ' +
          '"subtitle" (optional string, max 80 chars), ' +
          '"highlights" (array of 2-4 short bullet strings, each max 100 chars), ' +
          '"tasting_notes" (2-4 sentences: flavor, texture, occasion), ' +
          '"pairing" (optional string: one food pairing). ' +
          'Be plausible for the drink name and menu text; if info is sparse, infer typical traits for that style. No markdown.',
      },
      { role: 'user', content: JSON.stringify(userPayload) },
    ],
    temperature: 0.65,
    max_tokens: 500,
  })

  const content = completion.choices?.[0]?.message?.content?.trim()
  if (!content) {
    const err = new Error('Empty response from OpenAI')
    err.status = 502
    throw err
  }

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    const err = new Error('Invalid JSON from model')
    err.status = 502
    throw err
  }

  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights.map((s) => String(s).trim()).filter(Boolean).slice(0, 6)
    : []

  return {
    subtitle: typeof parsed.subtitle === 'string' ? parsed.subtitle.trim().slice(0, 120) : '',
    highlights: highlights.map((s) => s.slice(0, 200)),
    tasting_notes: typeof parsed.tasting_notes === 'string' ? parsed.tasting_notes.trim() : '',
    pairing: typeof parsed.pairing === 'string' ? parsed.pairing.trim().slice(0, 200) : '',
  }
}

function loadImagePromptTemplate() {
  try {
    return fs.readFileSync(IMAGE_PROMPT_PATH, 'utf-8').trim()
  } catch {
    return 'A single glass of {{COCKTAIL_NAME}} in impressionistic oil painting style, dark moody background, cinematic still life. No text.'
  }
}

function buildImagePrompt(cocktailName, glassware, drinkColor) {
  const template = loadImagePromptTemplate()
  const glass = glassware || 'cocktail glass'
  const color = drinkColor || 'amber-gold'
  return template
    .replace('{{GLASSWARE}}', glass)
    .replace('{{DRINK_VISUAL}}', color)
}

function cocktailSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
}

function findCachedImage(slug) {
  try {
    if (!fs.existsSync(GENERATED_IMAGES_DIR)) return null
    const files = fs.readdirSync(GENERATED_IMAGES_DIR)
    const match = files.find((f) => f.startsWith(slug + '-') && f.endsWith('.png'))
    return match || null
  } catch {
    return null
  }
}

const _inFlightImages = new Map()

/**
 * Generate a cocktail image using OpenAI's image generation API.
 * Caches by cocktail name — returns existing image if already generated.
 * Uses an in-flight lock to prevent duplicate parallel generations.
 */
async function generateCocktailImage({ cocktailName, glassware, drinkColor }, apiKey) {
  const slug = cocktailSlug(cocktailName)
  const cached = findCachedImage(slug)
  if (cached) {
    console.log('[GPT-Image] Cache hit:', cached)
    return { filename: cached, filepath: path.join(GENERATED_IMAGES_DIR, cached) }
  }

  if (_inFlightImages.has(slug)) {
    console.log('[GPT-Image] Waiting for in-flight generation:', slug)
    return _inFlightImages.get(slug)
  }

  const promise = _generateImage(slug, cocktailName, glassware, drinkColor, apiKey)
  _inFlightImages.set(slug, promise)
  try {
    return await promise
  } finally {
    _inFlightImages.delete(slug)
  }
}

async function _generateImage(slug, cocktailName, glassware, drinkColor, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    const err = new Error('OpenAI API key not configured.')
    err.status = 503
    throw err
  }

  const prompt = buildImagePrompt(cocktailName, glassware, drinkColor)
  console.log('[GPT-Image] Generating image for:', cocktailName)
  console.log('[GPT-Image] Prompt:', prompt.slice(0, 200) + '...')

  const openai = new OpenAI({ apiKey: apiKey.trim() })
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1792x1024',
    quality: 'standard',
  })

  const imageUrl = response.data?.[0]?.url
  if (!imageUrl) {
    const err = new Error('No image returned from OpenAI')
    err.status = 502
    throw err
  }

  fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true })
  const filename = `${slug}-${Date.now()}.png`
  const filepath = path.join(GENERATED_IMAGES_DIR, filename)

  const imgRes = await fetch(imageUrl)
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  fs.writeFileSync(filepath, buffer)
  console.log('[GPT-Image] Saved:', filepath)

  return { filename, filepath }
}

module.exports = {
  getRecommendations,
  getMenuItemDetailFromGpt,
  generateCocktailImage,
  buildCustomerTasteProfileForGpt,
  loadSystemPrompt,
  SYSTEM_PROMPT_PATH,
  RECOMMENDATION_LOG_PATH,
  GENERATED_IMAGES_DIR,
}
