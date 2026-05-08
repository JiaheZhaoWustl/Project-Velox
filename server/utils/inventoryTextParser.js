function inferCategoryFromName(name) {
  const n = String(name || '').toLowerCase()
  if (!n) return '—'
  if (/vodka|whiskey|whisky|bourbon|rum|gin|tequila|mezcal|brandy|cognac|scotch|rye/.test(n)) return 'Spirits'
  if (/juice|lemon|lime|orange|pineapple|grapefruit|cranberry|apple/.test(n)) return 'Juice'
  if (/syrup|simple|agave|grenadine|honey/.test(n)) return 'Syrup'
  if (/bitters/.test(n)) return 'Bitters'
  if (/soda|tonic|sparkling|water|cola|ginger ale|ginger beer/.test(n)) return 'Mixer'
  if (/mint|basil|rosemary|thyme|herb/.test(n)) return 'Herb'
  if (/salt|sugar|pepper|spice|cinnamon|nutmeg/.test(n)) return 'Seasoning'
  return '—'
}

function extractNumber(raw) {
  const match = String(raw || '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function splitSmart(line) {
  if (line.includes('\t')) return line.split('\t').map((s) => s.trim())
  if (line.includes('|')) return line.split('|').map((s) => s.trim())
  if (line.includes(';')) return line.split(';').map((s) => s.trim())
  if (line.includes(',')) return line.split(',').map((s) => s.trim())
  return [line.trim()]
}

function looksLikeHeader(parts) {
  const lower = parts.map((p) => p.toLowerCase())
  const hasName = lower.some((p) => /ingredient|item|name|product/.test(p))
  const hasMeta = lower.some((p) => /category|type|qty|quantity|stock|price|cost/.test(p))
  return hasName || hasMeta
}

function mapHeaderParts(headers, parts) {
  const row = {}
  headers.forEach((header, index) => {
    const key = String(header || '').toLowerCase()
    const value = parts[index] ?? ''
    if (/ingredient|item|name|product/.test(key)) row.Ingredient = value
    else if (/category|type|group/.test(key)) row.Category = value
    else if (/qty|quantity|stock|units|available|amount/.test(key)) row.Quantity = value
    else if (/price|cost/.test(key)) row['Unit Price'] = value
    else row[header || `Column ${index + 1}`] = value
  })
  if (!row.Ingredient && parts.length > 0) row.Ingredient = parts[0]
  if (!row.Category) row.Category = inferCategoryFromName(row.Ingredient)
  return row
}

function mapFreeformLine(line) {
  const base = line.replace(/^[*\-\d.)\s]+/, '').trim()
  if (!base) return null
  const parts = splitSmart(base)

  if (parts.length > 1) {
    const row = {
      Ingredient: parts[0],
      Category: parts[1] || inferCategoryFromName(parts[0]),
    }
    const qty = extractNumber(parts[2] || '')
    if (qty != null) row.Quantity = qty
    const price = extractNumber(parts[3] || '')
    if (price != null) row['Unit Price'] = price
    return row
  }

  // Handle single-line patterns: "Vodka x2", "Lime Juice - 5", "Gin (10)"
  const qty = extractNumber(base)
  const ingredient = base
    .replace(/\bx\s*-?\d+(?:\.\d+)?\b/i, '')
    .replace(/[-:(]\s*-?\d+(?:\.\d+)?\s*\)?$/, '')
    .trim()
  if (!ingredient) return null
  const row = {
    Ingredient: ingredient,
    Category: inferCategoryFromName(ingredient),
  }
  if (qty != null) row.Quantity = qty
  return row
}

function parseInventoryTextToRows(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'))

  if (!lines.length) return []

  const firstParts = splitSmart(lines[0])
  const headerMode = firstParts.length > 1 && looksLikeHeader(firstParts)
  const headers = headerMode ? firstParts : null
  const bodyLines = headerMode ? lines.slice(1) : lines

  const rows = []
  for (const line of bodyLines) {
    const parsed = headerMode
      ? mapHeaderParts(headers, splitSmart(line))
      : mapFreeformLine(line)
    if (!parsed || !parsed.Ingredient) continue
    rows.push(parsed)
  }
  return rows
}

module.exports = {
  parseInventoryTextToRows,
}
