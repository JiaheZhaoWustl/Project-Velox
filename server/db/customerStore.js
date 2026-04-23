/**
 * File-backed customer accounts (phone-keyed).
 * Swap this module for SQLite/Postgres later — keep the exported API stable for deploy.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { CUSTOMERS_DB_PATH, ORDER_HISTORY_DB_PATH } = require('../config/paths')

const VERSION = 1

/** @typedef {{ id: string, name: string, recipeId?: string, notes?: string, savedAt: string, source?: string }} CollectionItem */
/** @typedef {{ id: string, orderNumber: string, status: string, total: number, currency: string, summary: string, createdAt: string, items?: Array<{ name: string, qty: number, price: number, ingredients?: string[] }> }} OrderRecord */
/** @typedef {{ id: string, phoneKey: string, phoneDisplay: string, createdAt: string, updatedAt: string, tasteProfileId?: string|null, collection: CollectionItem[], orders: OrderRecord[] }} CustomerAccount */

let customerCache = null
let orderHistoryCache = null

function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadRaw(filePath, emptyFactory) {
  ensureDir(filePath)
  if (!fs.existsSync(filePath)) {
    return emptyFactory()
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return emptyFactory()
  }
}

function loadCustomersRaw() {
  const data = loadRaw(CUSTOMERS_DB_PATH, () => ({ version: VERSION, accounts: {} }))
  if (!data.accounts || typeof data.accounts !== 'object') {
    return { version: VERSION, accounts: {} }
  }
  return { version: data.version || VERSION, accounts: data.accounts }
}

function loadOrderHistoryRaw() {
  const data = loadRaw(ORDER_HISTORY_DB_PATH, () => ({ version: VERSION, ordersByPhone: {} }))
  if (!data.ordersByPhone || typeof data.ordersByPhone !== 'object') {
    return { version: VERSION, ordersByPhone: {} }
  }
  return { version: data.version || VERSION, ordersByPhone: data.ordersByPhone }
}

function persist(filePath, data) {
  ensureDir(filePath)
  const tmp = `${filePath}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, filePath)
}

function getCustomerDb() {
  if (!customerCache) {
    customerCache = loadCustomersRaw()
  }
  return customerCache
}

function saveCustomerDb() {
  persist(CUSTOMERS_DB_PATH, getCustomerDb())
}

function getOrderHistoryDb() {
  if (!orderHistoryCache) {
    orderHistoryCache = loadOrderHistoryRaw()
  }
  return orderHistoryCache
}

function saveOrderHistoryDb() {
  persist(ORDER_HISTORY_DB_PATH, getOrderHistoryDb())
}

/**
 * Normalize to digits only; US 10-digit gets leading 1.
 * @returns {string|null}
 */
function normalizePhone(input) {
  if (input == null) return null
  let d = String(input).replace(/\D/g, '')
  if (d.length === 10) d = `1${d}`
  if (d.length >= 1 && d.length <= 15) return d
  return null
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

function toMoney(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100) / 100
}

function normalizeOrderRecord(order) {
  const items = Array.isArray(order?.items) ? order.items : []
  const normalizedItems = items.map((it) => {
    const qtyRaw = Number(it?.qty)
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1
    const price = toMoney(it?.price)
    return {
      name: String(it?.name || 'Drink').slice(0, 120),
      qty,
      price,
      ingredients: Array.isArray(it?.ingredients)
        ? it.ingredients.map((v) => String(v || '').trim()).filter(Boolean).slice(0, 12)
        : [],
    }
  })
  const computedTotal = toMoney(
    normalizedItems.reduce((sum, it) => sum + toMoney(it.price) * it.qty, 0)
  )
  const total = toMoney(order?.total)
  return {
    id: order?.id ? String(order.id) : newId('ord'),
    orderNumber: String(order?.orderNumber || ''),
    status: String(order?.status || 'Preparing'),
    currency: String(order?.currency || 'USD'),
    summary: String(order?.summary || '').slice(0, 200),
    createdAt: order?.createdAt ? String(order.createdAt) : new Date().toISOString(),
    items: normalizedItems,
    total: total > 0 ? total : computedTotal,
    fullAmount: total > 0 ? total : computedTotal,
  }
}

function getOrderHistory(phoneKey, fallbackOrders = []) {
  const db = getOrderHistoryDb()
  const existing = db.ordersByPhone[phoneKey]
  if (Array.isArray(existing)) return existing.map(normalizeOrderRecord)
  if (Array.isArray(fallbackOrders) && fallbackOrders.length > 0) {
    const migrated = fallbackOrders.map(normalizeOrderRecord)
    db.ordersByPhone[phoneKey] = migrated
    saveOrderHistoryDb()
    return migrated
  }
  return []
}

function setOrderHistory(phoneKey, orders) {
  const db = getOrderHistoryDb()
  db.ordersByPhone[phoneKey] = orders.map(normalizeOrderRecord)
  saveOrderHistoryDb()
}

function seedMockOrders() {
  const now = Date.now()
  return [
    {
      id: newId('ord'),
      orderNumber: 'VX-1042',
      status: 'Complete',
      total: 24.5,
      currency: 'USD',
      summary: 'Negroni, Old Fashioned',
      createdAt: new Date(now - 3 * 86400000).toISOString(),
      items: [
        { name: 'Negroni', qty: 1, price: 14 },
        { name: 'Old Fashioned', qty: 1, price: 10.5 },
      ],
    },
    {
      id: newId('ord'),
      orderNumber: 'VX-1088',
      status: 'Complete',
      total: 12,
      currency: 'USD',
      summary: 'Gimlet',
      createdAt: new Date(now - 10 * 86400000).toISOString(),
      items: [{ name: 'Gimlet', qty: 1, price: 12 }],
    },
  ]
}

/**
 * @param {string} phoneKey
 * @param {string} phoneDisplay
 * @returns {CustomerAccount}
 */
function upsertAccount(phoneKey, phoneDisplay) {
  const db = getCustomerDb()
  const existing = db.accounts[phoneKey]
  const iso = new Date().toISOString()
  if (existing) {
    existing.updatedAt = iso
    existing.phoneDisplay = phoneDisplay || existing.phoneDisplay
    saveCustomerDb()
    return existing
  }
  /** @type {CustomerAccount} */
  const account = {
    id: newId('cust'),
    phoneKey,
    phoneDisplay: phoneDisplay || phoneKey,
    createdAt: iso,
    updatedAt: iso,
    tasteProfileId: null,
    collection: [],
    orders: [],
  }
  db.accounts[phoneKey] = account
  setOrderHistory(phoneKey, seedMockOrders())
  saveCustomerDb()
  return account
}

function getAccount(phoneKey) {
  const db = getCustomerDb()
  const account = db.accounts[phoneKey] || null
  if (!account) return null
  const mergedOrders = getOrderHistory(phoneKey, account.orders)
  return { ...account, orders: mergedOrders }
}

/**
 * @param {string} phoneKey
 * @param {Omit<CollectionItem, 'id'|'savedAt'>} item
 */
function addCollectionItem(phoneKey, item) {
  const acc = getAccount(phoneKey)
  if (!acc) return null
  const row = {
    id: newId('col'),
    name: String(item.name || 'Drink').slice(0, 200),
    recipeId: item.recipeId ? String(item.recipeId).slice(0, 200) : undefined,
    notes: item.notes != null ? String(item.notes).slice(0, 500) : '',
    source: item.source ? String(item.source).slice(0, 80) : undefined,
    savedAt: new Date().toISOString(),
  }
  acc.collection.unshift(row)
  acc.updatedAt = new Date().toISOString()
  saveCustomerDb()
  return row
}

function removeCollectionItem(phoneKey, itemId) {
  const acc = getAccount(phoneKey)
  if (!acc) return false
  const before = acc.collection.length
  acc.collection = acc.collection.filter((c) => c.id !== itemId)
  if (acc.collection.length === before) return false
  acc.updatedAt = new Date().toISOString()
  saveCustomerDb()
  return true
}

function setTasteProfileId(phoneKey, profileId) {
  const acc = getAccount(phoneKey)
  if (!acc) return false
  acc.tasteProfileId = profileId || null
  acc.updatedAt = new Date().toISOString()
  saveCustomerDb()
  return true
}

/**
 * Demo order for UX testing (mock POS).
 */
function addDemoOrder(phoneKey) {
  const acc = getCustomerDb().accounts[phoneKey]
  if (!acc) return null
  const order = normalizeOrderRecord({
    id: newId('ord'),
    orderNumber: `VX-${10000 + Math.floor(Math.random() * 89999)}`,
    status: 'Preparing',
    total: 16,
    currency: 'USD',
    summary: 'Seasonal sour (mock)',
    createdAt: new Date().toISOString(),
    items: [{ name: 'Seasonal sour', qty: 1, price: 16 }],
  })
  const orders = getOrderHistory(phoneKey, acc.orders)
  orders.unshift(order)
  setOrderHistory(phoneKey, orders)
  acc.updatedAt = new Date().toISOString()
  saveCustomerDb()
  return order
}

/**
 * Remove every order from the account.
 * @returns {number|null} number of orders cleared, or null if account missing.
 */
function clearOrders(phoneKey) {
  const acc = getCustomerDb().accounts[phoneKey]
  if (!acc) return null
  const orders = getOrderHistory(phoneKey, acc.orders)
  const cleared = orders.length
  if (cleared === 0) return 0
  setOrderHistory(phoneKey, [])
  acc.updatedAt = new Date().toISOString()
  saveCustomerDb()
  return cleared
}

/**
 * Place one line-item order from menu (mock POS).
 * @param {{ name: string, price?: number, section?: string, ingredients?: string[] }} payload
 */
function addMenuOrder(phoneKey, payload) {
  const acc = getCustomerDb().accounts[phoneKey]
  if (!acc) return null
  const name = String(payload?.name || '').trim().slice(0, 120)
  if (!name) return null
  let price = payload?.price
  if (typeof price !== 'number' || !Number.isFinite(price)) price = 0
  price = Math.round(price * 100) / 100
  const ingredients = Array.isArray(payload?.ingredients)
    ? payload.ingredients.map((v) => String(v || '').trim()).filter(Boolean).slice(0, 12)
    : []
  const section = payload?.section != null ? String(payload.section).slice(0, 80) : ''
  const summary = section ? `${name} (${section})` : name
  const order = normalizeOrderRecord({
    id: newId('ord'),
    orderNumber: `VX-${10000 + Math.floor(Math.random() * 89999)}`,
    status: 'Preparing',
    total: price,
    currency: 'USD',
    summary: summary.slice(0, 200),
    createdAt: new Date().toISOString(),
    items: [{ name, qty: 1, price, ingredients }],
  })
  const orders = getOrderHistory(phoneKey, acc.orders)
  orders.unshift(order)
  setOrderHistory(phoneKey, orders)
  acc.updatedAt = new Date().toISOString()
  saveCustomerDb()
  return order
}

module.exports = {
  normalizePhone,
  upsertAccount,
  getAccount,
  addCollectionItem,
  removeCollectionItem,
  setTasteProfileId,
  addDemoOrder,
  addMenuOrder,
  clearOrders,
  CUSTOMERS_DB_PATH,
  ORDER_HISTORY_DB_PATH,
}
