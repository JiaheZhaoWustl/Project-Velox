/**
 * Must match server/db/customerStore.js normalizePhone for API auth.
 * @param {string|null|undefined} input
 * @returns {string|null}
 */
export function normalizePhone(input) {
  if (input == null) return null
  let d = String(input).replace(/\D/g, '')
  if (d.length === 10) d = `1${d}`
  /* Local testing: allow any length 1–15 (e.g. short test numbers) */
  if (d.length >= 1 && d.length <= 15) return d
  return null
}

/**
 * @param {string} prefix e.g. "+1"
 * @param {string} nationalDigits user-typed digits
 */
export function combinePhoneForRegister(prefix, nationalDigits) {
  const cc = String(prefix || '+1').replace(/\D/g, '')
  const n = String(nationalDigits || '').replace(/\D/g, '')
  const combined = cc + n
  return { normalized: normalizePhone(combined), display: `${prefix} ${nationalDigits}`.trim() }
}
