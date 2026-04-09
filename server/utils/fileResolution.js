const path = require('path')
const fs = require('fs')
const { USER_UPLOADS, DEFAULT_INVENTORY_FILE, DEFAULT_SALES_FILE } = require('../config/paths')

function getXlsxFilesInUserUploads() {
  if (!fs.existsSync(USER_UPLOADS)) return []
  const names = fs.readdirSync(USER_UPLOADS).filter((n) => n.endsWith('.xlsx'))
  return names
    .map((name) => {
      const filePath = path.join(USER_UPLOADS, name)
      try {
        const stat = fs.statSync(filePath)
        return { name, path: filePath, mtime: stat.mtimeMs }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime)
}

function getPdfFilesInUserUploads() {
  if (!fs.existsSync(USER_UPLOADS)) return []
  const names = fs.readdirSync(USER_UPLOADS).filter((n) => n.toLowerCase().endsWith('.pdf'))
  return names
    .map((name) => {
      const filePath = path.join(USER_UPLOADS, name)
      try {
        const stat = fs.statSync(filePath)
        return { name, path: filePath, mtime: stat.mtimeMs }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime)
}

function resolveInventoryFile() {
  const files = getXlsxFilesInUserUploads()
  const ltInventoryFile = files.find((f) => /^LT_Inventory|LT_Inventory/i.test(f.name))
  if (ltInventoryFile) return { path: ltInventoryFile.path, name: ltInventoryFile.name }
  const menuBasedFile = files.find((f) => /menu.*based.*inventory|menu.*inventory/i.test(f.name))
  if (menuBasedFile) return { path: menuBasedFile.path, name: menuBasedFile.name }
  const defaultPath = path.join(USER_UPLOADS, DEFAULT_INVENTORY_FILE)
  if (fs.existsSync(defaultPath)) return { path: defaultPath, name: DEFAULT_INVENTORY_FILE }
  const byKeyword = files.find((f) => /inventory|stock|bar|menu/i.test(f.name))
  if (byKeyword) return { path: byKeyword.path, name: byKeyword.name }
  if (files.length > 0) return { path: files[0].path, name: files[0].name }
  return null
}

function resolveSalesFile() {
  const defaultPath = path.join(USER_UPLOADS, DEFAULT_SALES_FILE)
  if (fs.existsSync(defaultPath)) return { path: defaultPath, name: DEFAULT_SALES_FILE }
  const files = getXlsxFilesInUserUploads()
  const byKeyword = files.find((f) => /sales|orders/i.test(f.name))
  if (byKeyword) return { path: byKeyword.path, name: byKeyword.name }
  if (files.length > 0) return { path: files[0].path, name: files[0].name }
  return null
}

function resolveMenuFile() {
  if (!fs.existsSync(USER_UPLOADS)) return null
  const files = fs.readdirSync(USER_UPLOADS)
  const menuFile = files.find((f) =>
    f.toLowerCase().includes('menu') &&
    (f.toLowerCase().endsWith('.txt') || !f.includes('.'))
  )
  return menuFile ? path.join(USER_UPLOADS, menuFile) : null
}

module.exports = {
  getXlsxFilesInUserUploads,
  getPdfFilesInUserUploads,
  resolveInventoryFile,
  resolveSalesFile,
  resolveMenuFile,
}
