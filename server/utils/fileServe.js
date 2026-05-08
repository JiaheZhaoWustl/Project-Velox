const path = require('path')
const fs = require('fs')
const { USER_UPLOADS, INVENTORY_DIR } = require('../config/paths')

/**
 * Serve a file from one of the allowed roots (inventory/ or userUploads/).
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} filename - Decoded filename from URL
 * @param {string[]} allowedExtensions - e.g. ['.xlsx'] or ['.pdf']
 */
function serveFile(req, res, filename, allowedExtensions = ['.xlsx']) {
  const ext = path.extname(filename).toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    return res.status(400).json({ success: false, error: 'Invalid file type' })
  }

  const roots = [INVENTORY_DIR, USER_UPLOADS]
  for (const root of roots) {
    if (!root) continue
    const resolvedRoot = path.resolve(root)
    const filePath = path.resolve(path.join(root, filename))
    if (!filePath.startsWith(resolvedRoot)) continue
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath)
    }
  }

  return res.status(404).json({ success: false, error: 'File not found' })
}

module.exports = { serveFile }
