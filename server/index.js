/**
 * Backend server: reads inventory and sales from userUploads spreadsheets.
 * Routes are split into modules under server/routes/.
 */
require('dotenv').config()
const path = require('path')
const express = require('express')
const { getRecommendations, generateCocktailImage, GENERATED_IMAGES_DIR } = require('./gpt')
const { resolveInventoryFile, resolveSalesFile } = require('./utils/fileResolution')
const { USER_UPLOADS } = require('./config/paths')
const { SALES_MAX_ENTRIES, DEFAULT_SALES_FILE } = require('./config/paths')

const inventoryRoutes = require('./routes/inventory')
const salesRoutes = require('./routes/sales')
const menuRoutes = require('./routes/menu')
const reportsRoutes = require('./routes/reports')
const { router: tasteProfileRouter, getTasteProfileById } = require('./routes/tasteProfile')
const { router: customerAccountsRouter } = require('./routes/customerAccounts')
const customerStore = require('./db/customerStore')

function createApp() {
  const app = express()
  const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  function isAllowedOrigin(origin) {
    if (!origin) return true
    if (FRONTEND_ORIGINS.length === 0) return true
    return FRONTEND_ORIGINS.includes(origin)
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (!origin) return next()

    if (!isAllowedOrigin(origin)) {
      if (req.method === 'OPTIONS') return res.sendStatus(403)
      return res.status(403).json({ success: false, error: 'Origin not allowed' })
    }

    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Customer-Phone, X-Customer-Phone-Key, X-Customer-Display'
    )
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')

    if (req.method === 'OPTIONS') return res.sendStatus(204)
    return next()
  })

  app.use(express.json())

  // Mount route modules
  app.use('/api/inventory', inventoryRoutes.router)
  app.use('/api/sales', salesRoutes.router)
  app.use('/api/menu', menuRoutes)
  app.use('/api', reportsRoutes)
  app.use('/api/taste-profile', tasteProfileRouter)
  app.use('/api/customers', customerAccountsRouter)

  // POST /api/recommendations — GPT cocktail recommendations
  app.post('/api/recommendations', async (req, res) => {
  try {
    const directProfile = req.body?.customer_taste_profile
    const profileId = req.body?.profile_id
    let customerProfile = directProfile

    // If client passes only profile_id (onboarding flow), resolve the stored profile.
    if (profileId && (!customerProfile || Object.keys(customerProfile).length === 0)) {
      const stored = getTasteProfileById(profileId)
      if (stored) customerProfile = stored
    }

    // Backward compatibility: allow posting the profile object at top level.
    if (!customerProfile || Object.keys(customerProfile).length === 0) {
      const topLevel = req.body
      if (topLevel && typeof topLevel === 'object' && !topLevel.profile_id) {
        customerProfile = topLevel
      }
    }

    if (!customerProfile || typeof customerProfile !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing customer taste profile' })
    }

    const phoneRaw = req.headers['x-customer-phone'] || req.headers['x-customer-phone-key']
    const phoneKey = customerStore.normalizePhone(phoneRaw)
    const orderHistory = phoneKey ? (customerStore.getAccount(phoneKey)?.orders || []) : []
    const { recommendations } = await getRecommendations(customerProfile, process.env.OPENAI_API_KEY, {
      orderHistory,
    })
    res.json({ success: true, recommendations })
  } catch (err) {
    console.error('[GPT] API call failed:', err.message)
    const status = err.status || 500
    const message = err.status === 503 ? err.message : (err.status === 401 ? 'Invalid OpenAI API key' : err.message || 'Failed to get recommendations')
    res.status(status).json({ success: false, error: message })
  }
  })

  // Serve generated cocktail images (ensure directory exists for express.static)
  const fs = require('fs')
  fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true })
  app.use('/api/generated-images', express.static(GENERATED_IMAGES_DIR))

  // POST /api/cocktail-image — generate a cocktail image via DALL-E
  app.post('/api/cocktail-image', async (req, res) => {
  try {
    const { cocktailName, glassware, drinkColor } = req.body || {}
    if (!cocktailName) {
      return res.status(400).json({ success: false, error: 'cocktailName is required' })
    }
    const { filename } = await generateCocktailImage(
      { cocktailName, glassware, drinkColor },
      process.env.OPENAI_API_KEY
    )
    res.json({ success: true, imageUrl: `/api/generated-images/${filename}` })
  } catch (err) {
    console.error('[GPT-Image] Failed:', err.message)
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message })
  }
  })

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, status: 'ok' })
  })

  app.locals.frontendOrigins = FRONTEND_ORIGINS
  return app
}

const app = createApp()
const PORT = process.env.PORT || process.env.API_PORT || 3001

if (require.main === module) {
  app.listen(PORT, () => {
    const { CUSTOMERS_DB_PATH } = require('./config/paths')
    const FRONTEND_ORIGINS = app.locals.frontendOrigins || []
    console.log(`API running at http://localhost:${PORT}`)
    console.log(`CORS origins: ${FRONTEND_ORIGINS.length ? FRONTEND_ORIGINS.join(', ') : '(all origins allowed)'}`)
    const inventoryResolved = resolveInventoryFile()
    console.log(`Inventory: ${inventoryResolved ? inventoryResolved.name : 'No file found'}`)
    console.log(`Sales (first ${SALES_MAX_ENTRIES}): ${path.join(USER_UPLOADS, DEFAULT_SALES_FILE)}`)
    console.log(`Customers DB: ${CUSTOMERS_DB_PATH}`)
  })
}

module.exports = { app, createApp }
