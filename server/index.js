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

const app = express()
app.use(express.json())

const PORT = process.env.API_PORT || 3001

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
    let customerProfile = req.body?.customer_taste_profile ?? req.body
    const profileId = req.body?.profile_id
    if (profileId && (!customerProfile || Object.keys(customerProfile).length === 0)) {
      const stored = getTasteProfileById(profileId)
      if (stored) customerProfile = stored
    }

    const { recommendations } = await getRecommendations(customerProfile, process.env.OPENAI_API_KEY)
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

app.listen(PORT, () => {
  const { CUSTOMERS_DB_PATH } = require('./config/paths')
  console.log(`API running at http://localhost:${PORT}`)
  const inventoryResolved = resolveInventoryFile()
  console.log(`Inventory: ${inventoryResolved ? inventoryResolved.name : 'No file found'}`)
  console.log(`Sales (first ${SALES_MAX_ENTRIES}): ${path.join(USER_UPLOADS, DEFAULT_SALES_FILE)}`)
  console.log(`Customers DB: ${CUSTOMERS_DB_PATH}`)
})
