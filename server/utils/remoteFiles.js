async function fetchBufferFromUrl(url) {
  const u = String(url || '').trim()
  if (!u) return null
  const res = await fetch(u)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${u}: ${res.status}`)
  }
  const arr = await res.arrayBuffer()
  return Buffer.from(arr)
}

async function fetchTextFromUrl(url) {
  const u = String(url || '').trim()
  if (!u) return null
  const res = await fetch(u)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${u}: ${res.status}`)
  }
  return res.text()
}

module.exports = {
  fetchBufferFromUrl,
  fetchTextFromUrl,
}
