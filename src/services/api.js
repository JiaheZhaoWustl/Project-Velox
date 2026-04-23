/**
 * Centralized API client for all backend endpoints.
 * Use this instead of scattered fetch() calls for consistent error handling and typing.
 */

import { customerAuthHeaders } from '../utils/customerSession'

const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...customerAuthHeaders(), ...options.headers },
    ...options,
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    if (!res.ok) console.warn(`[API] ${url} returned invalid JSON`)
  }
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || 'Request failed')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/** Taste profile */
export const tasteProfileApi = {
  save: (profile) =>
    request('/taste-profile', { method: 'POST', body: JSON.stringify({ customer_taste_profile: profile }) }),
  get: (id) => request(`/taste-profile/${id}`),
  getLatest: () => request('/taste-profile/latest'),
}

/** Recommendations */
export const recommendationsApi = {
  get: (body) =>
    request('/recommendations', { method: 'POST', body: JSON.stringify(body) }),
}

/** Inventory */
export const inventoryApi = {
  list: (params) => {
    const q = new URLSearchParams(params).toString()
    return request(`/inventory${q ? `?${q}` : ''}`)
  },
  reload: () => request('/inventory/reload', { method: 'POST' }),
  getFiles: () => request('/inventory/files'),
}

/** Sales */
export const salesApi = {
  list: (params) => {
    const q = new URLSearchParams(params).toString()
    return request(`/sales${q ? `?${q}` : ''}`)
  },
  reload: () => request('/sales/reload', { method: 'POST' }),
  getFiles: () => request('/sales/files'),
}

/** Menu */
export const menuApi = {
  getItems: () => request('/menu/items'),
  getFiles: () => request('/menu/files'),
  /** GPT-generated copy for item detail modal */
  getItemDetail: (body) =>
    request('/menu/item-detail', { method: 'POST', body: JSON.stringify(body) }),
}

/** Reports & Dashboard */
export const reportsApi = {
  getSources: () => request('/reports/sources'),
  getSales: () => request('/reports/sales'),
  getInventory: () => request('/reports/inventory'),
}

export const dashboardApi = {
  get: () => request('/dashboard'),
}

/** Cocktail image generation */
export const cocktailImageApi = {
  generate: (body) =>
    request('/cocktail-image', { method: 'POST', body: JSON.stringify(body) }),
}

/** Phone-keyed customer accounts (see server/db/customerStore.js). Auth: X-Customer-Phone header. */
export const customerApi = {
  register: (phone) =>
    request('/customers/register', { method: 'POST', body: JSON.stringify({ phone }) }),
  me: () => request('/customers/me'),
  setTasteProfileId: (tasteProfileId) =>
    request('/customers/me/taste-profile', {
      method: 'PATCH',
      body: JSON.stringify({ tasteProfileId }),
    }),
  getCollection: () => request('/customers/collection'),
  addCollectionItem: (body) =>
    request('/customers/collection', { method: 'POST', body: JSON.stringify(body) }),
  removeCollectionItem: (itemId) =>
    request(`/customers/collection/${encodeURIComponent(itemId)}`, { method: 'DELETE' }),
  getOrders: () => request('/customers/orders'),
  addDemoOrder: () => request('/customers/orders/demo', { method: 'POST' }),
  clearOrders: () => request('/customers/orders', { method: 'DELETE' }),
  /** Place order from menu (mock POS) */
  placeOrder: (body) =>
    request('/customers/orders', { method: 'POST', body: JSON.stringify(body) }),
}
