/**
 * Customer accounts: phone registry, saved collection, mock orders.
 * Auth: header X-Customer-Phone = normalized digits (from POST /register).
 */
const router = require('express').Router()
const store = require('../db/customerStore')

function getPhoneKeyFromRequest(req) {
  const raw = req.headers['x-customer-phone'] || req.headers['x-customer-phone-key']
  return store.normalizePhone(raw)
}

/** Always create a file-backed account on first use so anonymous device keys never 404. */
const autoCreateMissing = true

function isMobileClient(req) {
  const ua = String(req.headers['user-agent'] || '').toLowerCase()
  return /android|iphone|ipod|mobile/.test(ua)
}

function requireAccount(req, res, next) {
  const phoneKey = getPhoneKeyFromRequest(req)
  if (!phoneKey) {
    return res.status(401).json({ success: false, error: 'Missing X-Customer-Phone' })
  }
  let account = store.getAccount(phoneKey)
  if (!account && autoCreateMissing) {
    account = store.upsertAccount(phoneKey, String(req.headers['x-customer-display'] || phoneKey))
  }
  if (!account) {
    return res.status(404).json({ success: false, error: 'Account not found' })
  }
  req.phoneKey = phoneKey
  req.account = account
  next()
}

/** Public: create or refresh account by phone */
router.post('/register', (req, res) => {
  try {
    const display = req.body?.phone ?? ''
    const phoneKey = store.normalizePhone(display)
    if (!phoneKey) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' })
    }
    const account = store.upsertAccount(phoneKey, display.trim() || phoneKey)
    res.json({
      success: true,
      phoneKey,
      account: {
        id: account.id,
        phoneDisplay: account.phoneDisplay,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        tasteProfileId: account.tasteProfileId,
        collectionCount: account.collection.length,
        orderCount: account.orders.length,
      },
    })
  } catch (err) {
    console.error('[customers] register', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/me', requireAccount, (req, res) => {
  const a = req.account
  res.json({
    success: true,
    account: {
      id: a.id,
      phoneDisplay: a.phoneDisplay,
      phoneKey: a.phoneKey,
      createdAt: a.createdAt,
      tasteProfileId: a.tasteProfileId,
      collectionCount: a.collection.length,
      orderCount: a.orders.length,
    },
  })
})

router.patch('/me/taste-profile', requireAccount, (req, res) => {
  try {
    const id = req.body?.tasteProfileId
    store.setTasteProfileId(req.phoneKey, id == null ? null : String(id))
    res.json({ success: true, tasteProfileId: id || null })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/collection', requireAccount, (req, res) => {
  res.json({ success: true, items: req.account.collection })
})

router.post('/collection', requireAccount, (req, res) => {
  try {
    const { name, recipeId, notes, source } = req.body || {}
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'name required' })
    }
    const item = store.addCollectionItem(req.phoneKey, { name, recipeId, notes, source })
    res.json({ success: true, item })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/collection/:itemId', requireAccount, (req, res) => {
  const ok = store.removeCollectionItem(req.phoneKey, req.params.itemId)
  if (!ok) return res.status(404).json({ success: false, error: 'Item not found' })
  res.json({ success: true })
})

router.get('/orders', requireAccount, (req, res) => {
  res.json({ success: true, orders: req.account.orders })
})

/** Adds one mock “open kitchen” order for demos */
router.post('/orders/demo', requireAccount, (req, res) => {
  try {
    const order = store.addDemoOrder(req.phoneKey)
    res.json({ success: true, order })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** Remove every order on this account */
router.delete('/orders', requireAccount, (req, res) => {
  try {
    const cleared = store.clearOrders(req.phoneKey)
    if (cleared == null) return res.status(404).json({ success: false, error: 'Account not found' })
    res.json({ success: true, cleared })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** Place order from menu item (name + price); mock kitchen flow */
router.post('/orders', requireAccount, (req, res) => {
  try {
    const { name, price, section, ingredients } = req.body || {}
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'name required' })
    }

    // Mobile orders are treated as preview-only so they don't affect
    // persistent order history, inventory balancing, or analytics.
    if (isMobileClient(req)) {
      const order = {
        id: `preview_${Date.now()}`,
        orderNumber: '',
        status: 'Preview',
        total: typeof price === 'number' ? price : 0,
        currency: 'USD',
        summary: section ? `${name} (${section})` : name,
        createdAt: new Date().toISOString(),
        items: [{ name, qty: 1, price: typeof price === 'number' ? price : 0, ingredients: Array.isArray(ingredients) ? ingredients : [] }],
      }
      return res.json({
        success: true,
        order,
        notRecorded: true,
        message: 'Mobile preview only. Not added to order history.',
      })
    }

    const order = store.addMenuOrder(req.phoneKey, { name, price, section, ingredients })
    if (!order) return res.status(500).json({ success: false, error: 'Could not create order' })
    res.json({ success: true, order })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { router }
