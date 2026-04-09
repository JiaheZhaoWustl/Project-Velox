const path = require('path')
const XLSX = require('xlsx')
const router = require('express').Router()
const { USER_UPLOADS } = require('../config/paths')
const { getXlsxFilesInUserUploads, resolveInventoryFile } = require('../utils/fileResolution')
const { normalizeRow } = require('../utils/excelParser')
const { serveFile } = require('../utils/fileServe')

let cachedInventory = null

function readInventoryFromSpreadsheet() {
  const resolved = resolveInventoryFile()
  if (!resolved) return { items: [], total: 0, sourceFile: null, columns: [] }

  const workbook = XLSX.readFile(resolved.path, { type: 'file' })
  let sheetName = workbook.SheetNames.find((n) => n === 'Inventory') ||
    workbook.SheetNames.find((n) => /^inventory$/i.test(n)) ||
    workbook.SheetNames.find((n) => /inventory|ingredients|stock/i.test(n)) ||
    workbook.SheetNames[0]

  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : []

  const items = rawRows
    .map((row, i) => normalizeRow(row, i))
    .filter((item) => item.name && item.name !== '—')

  return { items, total: items.length, sourceFile: resolved.name, columns }
}

function getInventory() {
  if (cachedInventory) return cachedInventory
  cachedInventory = readInventoryFromSpreadsheet()
  return cachedInventory
}

router.get('/columns', (req, res) => {
  try {
    const { columns } = getInventory()
    res.json({ success: true, columns: columns || [] })
  } catch (err) {
    console.error('GET /api/inventory/columns error:', err)
    res.status(500).json({ success: false, error: 'Failed to load columns' })
  }
})

router.get('/', (req, res) => {
  try {
    const { items, total, columns } = getInventory()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 8))
    const search = (req.query.search || '').trim().toLowerCase()

    let filtered = items
    if (search) {
      filtered = items.filter((item) => {
        if ((item.name && item.name.toLowerCase().includes(search)) ||
            (item.category && item.category.toLowerCase().includes(search))) {
          return true
        }
        if (item.rawData) {
          return Object.values(item.rawData).some((val) =>
            String(val).toLowerCase().includes(search)
          )
        }
        return false
      })
    }

    const totalFiltered = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
    const pageIndex = Math.min(page - 1, totalPages - 1)
    const start = pageIndex * pageSize
    const pageItems = filtered.slice(start, start + pageSize)

    res.json({
      success: true,
      items: pageItems,
      total: totalFiltered,
      totalAll: total,
      page,
      pageSize,
      totalPages,
      columns: columns || [],
    })
  } catch (err) {
    console.error('GET /api/inventory error:', err)
    res.status(500).json({ success: false, error: 'Failed to load inventory' })
  }
})

router.post('/reload', (req, res) => {
  try {
    cachedInventory = null
    getInventory()
    res.json({ success: true })
  } catch (err) {
    console.error('POST /api/inventory/reload error:', err)
    res.status(500).json({ success: false })
  }
})

router.get('/files', (req, res) => {
  try {
    const files = getXlsxFilesInUserUploads()
    const resolved = resolveInventoryFile()
    const fileList = resolved
      ? [
          { name: resolved.name, url: `/api/inventory/file/${encodeURIComponent(resolved.name)}` },
          ...files.filter((f) => f.name !== resolved.name).map((f) => ({
            name: f.name,
            url: `/api/inventory/file/${encodeURIComponent(f.name)}`,
          })),
        ]
      : files.map((f) => ({
          name: f.name,
          url: `/api/inventory/file/${encodeURIComponent(f.name)}`,
        }))
    res.json({ success: true, files: fileList })
  } catch (err) {
    console.error('GET /api/inventory/files error:', err)
    res.status(500).json({ success: false, error: 'Failed to list inventory files' })
  }
})

router.get('/file/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename)
    serveFile(req, res, filename, ['.xlsx'])
  } catch (err) {
    console.error('GET /api/inventory/file/:filename error:', err)
    res.status(500).json({ success: false })
  }
})

module.exports = { router, readInventoryFromSpreadsheet }
