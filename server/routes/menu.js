const path = require('path')
const router = require('express').Router()
const { getPdfFilesInUserUploads, resolveMenuFile } = require('../utils/fileResolution')
const { parseMenuTextFile } = require('../utils/menuParser')
const { serveFile } = require('../utils/fileServe')
const { getMenuItemDetailFromGpt } = require('../gpt')

router.get('/items', (req, res) => {
  try {
    const menuFilePath = resolveMenuFile()
    if (!menuFilePath) {
      return res.json({
        success: true,
        sections: [],
        items: [],
        sourceFile: null,
      })
    }

    const { sections, items } = parseMenuTextFile(menuFilePath)
    const fileName = path.basename(menuFilePath)

    res.json({
      success: true,
      sections,
      items,
      sourceFile: fileName,
    })
  } catch (err) {
    console.error('GET /api/menu/items error:', err)
    res.status(500).json({ success: false, error: 'Failed to load menu items' })
  }
})

/** GPT-generated tasting copy for menu item modal */
router.post('/item-detail', async (req, res) => {
  try {
    const { name, description, price, section } = req.body || {}
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'name required' })
    }
    const detail = await getMenuItemDetailFromGpt(
      {
        name: String(name).trim(),
        description: description != null ? String(description) : '',
        price: typeof price === 'number' && Number.isFinite(price) ? price : null,
        section: section != null ? String(section) : '',
      },
      process.env.OPENAI_API_KEY
    )
    res.json({ success: true, detail })
  } catch (err) {
    console.error('POST /api/menu/item-detail:', err.message)
    const status = err.status || 500
    const message =
      err.status === 401 ? 'Invalid OpenAI API key' : err.message || 'Failed to generate menu detail'
    res.status(status).json({ success: false, error: message })
  }
})

router.get('/files', (req, res) => {
  try {
    const pdfFiles = getPdfFilesInUserUploads()
    res.json({
      success: true,
      files: pdfFiles.map((f) => ({
        name: f.name,
        url: `/api/menu/file/${encodeURIComponent(f.name)}`,
        mtime: f.mtime,
      })),
    })
  } catch (err) {
    console.error('GET /api/menu/files error:', err)
    res.status(500).json({ success: false, error: 'Failed to list menu files' })
  }
})

router.get('/file/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename)
    const filePath = path.join(require('../config/paths').USER_UPLOADS, filename)
    const resolvedUploads = path.resolve(require('../config/paths').USER_UPLOADS)

    if (!path.resolve(filePath).startsWith(resolvedUploads)) {
      return res.status(403).json({ success: false, error: 'Access denied' })
    }
    if (!require('fs').existsSync(filePath) || !filename.toLowerCase().endsWith('.pdf')) {
      return res.status(404).json({ success: false, error: 'File not found' })
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.sendFile(path.resolve(filePath))
  } catch (err) {
    console.error('GET /api/menu/file/:filename error:', err)
    res.status(500).json({ success: false })
  }
})

module.exports = router
