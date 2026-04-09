/** Customer identity for API calls (anonymous device key; legacy phone keys still supported). */
import { normalizePhone } from './phone'

const KEY_PHONE_KEY = 'customerPhoneKey'
const KEY_PHONE_DISPLAY = 'customerPhone'
const KEY_DEVICE = 'customerDeviceKey'

function generateDeviceKey() {
  let s = ''
  for (let i = 0; i < 15; i += 1) s += Math.floor(Math.random() * 10).toString()
  return s
}

/**
 * Normalized account key sent as X-Customer-Phone (legacy name).
 * Priority: explicit phone key → legacy display → anonymous device key (created once per browser).
 */
export function getCustomerPhoneKey() {
  try {
    const existing = localStorage.getItem(KEY_PHONE_KEY)
    if (existing) return existing
    const legacy = localStorage.getItem(KEY_PHONE_DISPLAY)
    if (legacy) {
      const n = normalizePhone(legacy)
      if (n) {
        localStorage.setItem(KEY_PHONE_KEY, n)
        return n
      }
    }
    let device = localStorage.getItem(KEY_DEVICE)
    if (!device) {
      device = generateDeviceKey()
      localStorage.setItem(KEY_DEVICE, device)
    }
    return device
  } catch {
    return ''
  }
}

export function getCustomerPhoneDisplay() {
  try {
    return localStorage.getItem(KEY_PHONE_DISPLAY) || ''
  } catch {
    return ''
  }
}

/**
 * @param {string} phoneKey normalized digits from POST /customers/register
 * @param {string} [display] human-readable phone
 */
export function setCustomerSession(phoneKey, display = '') {
  localStorage.setItem(KEY_PHONE_KEY, phoneKey)
  if (display) localStorage.setItem(KEY_PHONE_DISPLAY, display)
}

/** Clears registered phone and anonymous device identity (guest reset). */
export function clearGuestPhone() {
  localStorage.removeItem(KEY_PHONE_KEY)
  localStorage.removeItem(KEY_PHONE_DISPLAY)
  localStorage.removeItem(KEY_DEVICE)
  try {
    localStorage.removeItem('customerPhone')
  } catch {
    /* ignore */
  }
}

/** Full customer sign-out (e.g. header Log out). */
export function clearCustomerSession() {
  clearGuestPhone()
  localStorage.removeItem('customerTasteProfileId')
  localStorage.removeItem('customerTasteProfile')
  localStorage.removeItem('cocktailRecommendations')
}

export function customerAuthHeaders() {
  const key = getCustomerPhoneKey()
  return key ? { 'X-Customer-Phone': key } : {}
}

export function hasCustomerAccount() {
  return Boolean(getCustomerPhoneKey())
}
