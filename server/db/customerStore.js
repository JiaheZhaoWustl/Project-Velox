/**
 * File-backed customer accounts (phone-keyed).
 * Swap this module for SQLite/Postgres later — keep the exported API stable for deploy.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { CUSTOMERS_DB_PATH } = require('../config/paths')

const VERSION = 1

/** @typedef {{ id: string, name: string, recipeId?: string, notes?: string, savedAt: string, source?: string }} CollectionItem */
/** @typedef {{ id: string, orderNumber: string, status: string, total: number, currency: string, summary: string, createdAt: string, items?: Array<{ name: string, qty: number, price: number }> }} OrderRecord */
/** @typedef {{ id: string, phoneKey: string, phoneDisplay: string, createdAt: string, updatedAt: string, tasteProfileId?: string|null, collection: CollectionItem[], orders: OrderRecord[] }} CustomerAccount */

let cache = null

function ensureDir() {
  const dir = path.dirname(CUSTOMERS_DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadRaw() {
  ensureDir()
  if (!fs.existsSync(CUSTOMERS_DB_PATH)) {
    return { version: VERSION, accounts: {} }
  }
  try {
    const raw = fs.readFileSync(CUSTOMERS_DB_PATH, 'utf-8')
    const data = JSON.parse(raw)
    if (!data.accounts || typeof data.accounts !== 'object') {
      return { version: VERSION, accounts: {} }
    }
    return { version: data.version || VERSION, accounts: data.accounts }
  } catch {
    return { version: VERSION, accounts: {} }
  }
}

function persist(data) {
  ensureDir()
  const tmp = `${CUSTOMERS_DB_PATH}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, CUSTOMERS_DB_PATH)
}

function getDb() {
  if (!cache) {
    cache = loadRaw()
  }
  return cache
}

function saveDb() {
  persist(getDb())
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
  const db = getDb()
  const existing = db.accounts[phoneKey]
  const iso = new Date().toISOString()
  if (existing) {
    existing.updatedAt = iso
    existing.phoneDisplay = phoneDisplay || existing.phoneDisplay
    saveDb()
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
    orders: seedMockOrders(),
  }
  db.accounts[phoneKey] = account
  saveDb()
  return account
}

function getAccount(phoneKey) {
  const db = getDb()
  return db.accounts[phoneKey] || null
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
  saveDb()
  return row
}

function removeCollectionItem(phoneKey, itemId) {
  const acc = getAccount(phoneKey)
  if (!acc) return false
  const before = acc.collection.length
  acc.collection = acc.collection.filter((c) => c.id !== itemId)
  if (acc.collection.length === before) return false
  acc.updatedAt = new Date().toISOString()
  saveDb()
  return true
}

function setTasteProfileId(phoneKey, profileId) {
  const acc = getAccount(phoneKey)
  if (!acc) return false
  acc.tasteProfileId = profileId || null
  acc.updatedAt = new Date().toISOString()
  saveDb()
  return true
}

/**
 * Demo order for UX testing (mock POS).
 */
function addDemoOrder(phoneKey) {
  const acc = getAccount(phoneKey)
  if (!acc) return null
  const order = {
    id: newId('ord'),
    orderNumber: `VX-${10000 + Math.floor(Math.random() * 89999)}`,
    status: 'Preparing',
    total: 16,
    currency: 'USD',
    summary: 'Seasonal sour (mock)',
    createdAt: new Date().toISOString(),
    items: [{ name: 'Seasonal sour', qty: 1, price: 16 }],
  }
  acc.orders.unshift(order)
  acc.updatedAt = new Date().toISOString()
  saveDb()
  return order
}

/**
 * Place one line-item order from menu (mock POS).
 * @param {{ name: string, price?: number, section?: string }} payload
 */
function addMenuOrder(phoneKey, payload) {
  const acc = getAccount(phoneKey)
  if (!acc) return null
  const name = String(payload?.name || '').trim().slice(0, 120)
  if (!name) return null
  let price = payload?.price
  if (typeof price !== 'number' || !Number.isFinite(price)) price = 0
  price = Math.round(price * 100) / 100
  const section = payload?.section != null ? String(payload.section).slice(0, 80) : ''
  const summary = section ? `${name} (${section})` : name
  const order = {
    id: newId('ord'),
    orderNumber: `VX-${10000 + Math.floor(Math.random() * 89999)}`,
    status: 'Preparing',
    total: price,
    currency: 'USD',
    summary: summary.slice(0, 200),
    createdAt: new Date().toISOString(),
    items: [{ name, qty: 1, price }],
  }
  acc.orders.unshift(order)
  acc.updatedAt = new Date().toISOString()
  saveDb()
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
  CUSTOMERS_DB_PATH,
}
