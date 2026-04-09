const path = require('path')
const fs = require('fs')
const { USER_UPLOADS } = require('../config/paths')

/**
 * Create a route handler that serves a file from userUploads if it passes security checks.
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} filename - Decoded filename from URL
 * @param {string[]} allowedExtensions - e.g. ['.xlsx'] or ['.pdf']
 */
function serveFile(req, res, filename, allowedExtensions = ['.xlsx']) {
  const filePath = path.join(USER_UPLOADS, filename)
  const resolvedUploads = path.resolve(USER_UPLOADS)

  if (!path.resolve(filePath).startsWith(resolvedUploads)) {
    return res.status(403).json({ success: false, error: 'Access denied' })
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'File not found' })
  }
  const ext = path.extname(filename).toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    return res.status(400).json({ success: false, error: 'Invalid file type' })
  }
  res.sendFile(path.resolve(filePath))
}

module.exports = { serveFile }
