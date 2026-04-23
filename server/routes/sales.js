const XLSX = require('xlsx')
const router = require('express').Router()
const { SALES_MAX_ENTRIES } = require('../config/paths')
const { getXlsxFilesInUserUploads, resolveSalesFile } = require('../utils/fileResolution')
const { normalizeSalesRow } = require('../utils/excelParser')
const { serveFile } = require('../utils/fileServe')
const { fetchBufferFromUrl } = require('../utils/remoteFiles')

let cachedSales = null

async function readSalesFromSpreadsheet() {
  const remoteUrl = String(process.env.SALES_FILE_URL || '').trim()
  if (remoteUrl) {
    const content = await fetchBufferFromUrl(remoteUrl)
    const workbook = XLSX.read(content, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : []
    const items = rawRows
      .slice(0, SALES_MAX_ENTRIES)
      .map((row, i) => normalizeSalesRow(row, i))
      .filter((item) => item.orderId && item.orderId !== '—')
    return { items, total: items.length, sourceFile: remoteUrl, columns }
  }
  const resolved = resolveSalesFile()
  if (!resolved) return { items: [], total: 0, sourceFile: null, columns: [] }

  const workbook = XLSX.readFile(resolved.path, { type: 'file' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : []

  const items = rawRows
    .slice(0, SALES_MAX_ENTRIES)
    .map((row, i) => normalizeSalesRow(row, i))
    .filter((item) => item.orderId && item.orderId !== '—')

  return { items, total: items.length, sourceFile: resolved.name, columns }
}

async function getSales() {
  if (cachedSales) return cachedSales
  cachedSales = await readSalesFromSpreadsheet()
  return cachedSales
}

router.get('/', async (req, res) => {
  try {
    const { items, total, columns } = await getSales()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 8))
    const search = (req.query.search || '').trim().toLowerCase()
    const channel = (req.query.channel || '').trim().toLowerCase()
    const bartender = (req.query.bartender || '').trim().toLowerCase()

    let filtered = items
    if (search) {
      filtered = filtered.filter((item) => {
        if ((item.orderId && item.orderId.toLowerCase().includes(search)) ||
            (item.itemName && item.itemName.toLowerCase().includes(search)) ||
            (item.category && item.category.toLowerCase().includes(search)) ||
            (item.location && item.location.toLowerCase().includes(search)) ||
            (item.paymentMethod && item.paymentMethod.toLowerCase().includes(search)) ||
            (item.bartender && item.bartender.toLowerCase().includes(search)) ||
            (item.channel && item.channel.toLowerCase().includes(search))) {
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
    if (channel) {
      filtered = filtered.filter((item) => item.channel && item.channel.toLowerCase().includes(channel))
    }
    if (bartender) {
      filtered = filtered.filter((item) => item.bartender && item.bartender.toLowerCase().includes(bartender))
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
    console.error('GET /api/sales error:', err)
    res.status(500).json({ success: false, error: 'Failed to load sales' })
  }
})

router.post('/reload', async (req, res) => {
  try {
    cachedSales = null
    await getSales()
    res.json({ success: true })
  } catch (err) {
    console.error('POST /api/sales/reload error:', err)
    res.status(500).json({ success: false })
  }
})

router.get('/files', (req, res) => {
  try {
    const remoteUrl = String(process.env.SALES_FILE_URL || '').trim()
    if (remoteUrl) {
      return res.json({
        success: true,
        files: [{ name: 'sales.xlsx (remote)', url: remoteUrl }],
      })
    }
    const files = getXlsxFilesInUserUploads()
    const resolved = resolveSalesFile()
    const fileList = resolved
      ? [
          { name: resolved.name, url: `/api/sales/file/${encodeURIComponent(resolved.name)}` },
          ...files.filter((f) => f.name !== resolved.name).map((f) => ({
            name: f.name,
            url: `/api/sales/file/${encodeURIComponent(f.name)}`,
          })),
        ]
      : files.map((f) => ({
          name: f.name,
          url: `/api/sales/file/${encodeURIComponent(f.name)}`,
        }))
    res.json({ success: true, files: fileList })
  } catch (err) {
    console.error('GET /api/sales/files error:', err)
    res.status(500).json({ success: false, error: 'Failed to list sales files' })
  }
})

router.get('/file/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename)
    serveFile(req, res, filename, ['.xlsx'])
  } catch (err) {
    console.error('GET /api/sales/file/:filename error:', err)
    res.status(500).json({ success: false })
  }
})

module.exports = { router, readSalesFromSpreadsheet }
