const path = require('path')
const fs = require('fs')
const { USER_UPLOADS, INVENTORY_DIR, DEFAULT_INVENTORY_FILE, DEFAULT_SALES_FILE } = require('../config/paths')

function listXlsxFilesIn(dir) {
  if (!dir || !fs.existsSync(dir)) return []
  const names = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.xlsx'))
  return names
    .map((name) => {
      const filePath = path.join(dir, name)
      try {
        const stat = fs.statSync(filePath)
        return { name, path: filePath, mtime: stat.mtimeMs, dir }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime)
}

function listInventoryFilesIn(dir) {
  if (!dir || !fs.existsSync(dir)) return []
  const names = fs
    .readdirSync(dir)
    .filter((n) => n.toLowerCase().endsWith('.xlsx') || n.toLowerCase().endsWith('.txt'))
  return names
    .map((name) => {
      const filePath = path.join(dir, name)
      try {
        const stat = fs.statSync(filePath)
        return { name, path: filePath, mtime: stat.mtimeMs, dir }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime)
}

function getXlsxFilesInUserUploads() {
  return listXlsxFilesIn(USER_UPLOADS)
}

function getXlsxFilesInInventoryDir() {
  return listXlsxFilesIn(INVENTORY_DIR)
}

function getInventoryFilesInUserUploads() {
  return listInventoryFilesIn(USER_UPLOADS)
}

function getInventoryFilesInInventoryDir() {
  return listInventoryFilesIn(INVENTORY_DIR)
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
  // Inventory dir wins over userUploads — it's the authoritative location.
  const inventoryFiles = getInventoryFilesInInventoryDir()
  const uploadFiles = getInventoryFilesInUserUploads()
  const groups = [inventoryFiles, uploadFiles]

  // Prefer simple text inventory pastes first when present.
  for (const files of groups) {
    const txtKeyword = files.find((f) =>
      path.extname(f.name).toLowerCase() === '.txt' &&
      /inventory|ingredients|stock|bar|menu/i.test(f.name)
    )
    if (txtKeyword) return { path: txtKeyword.path, name: txtKeyword.name }
  }
  for (const files of groups) {
    const anyTxt = files.find((f) => path.extname(f.name).toLowerCase() === '.txt')
    if (anyTxt) return { path: anyTxt.path, name: anyTxt.name }
  }

  for (const files of groups) {
    if (files.length === 0) continue
    const ltInventoryFile = files.find((f) => /^LT_Inventory|LT_Inventory/i.test(f.name))
    if (ltInventoryFile) return { path: ltInventoryFile.path, name: ltInventoryFile.name }
    const menuBasedFile = files.find((f) => /menu.*based.*inventory|menu.*inventory/i.test(f.name))
    if (menuBasedFile) return { path: menuBasedFile.path, name: menuBasedFile.name }
  }
  const inventoryDefault = path.join(INVENTORY_DIR, DEFAULT_INVENTORY_FILE)
  if (fs.existsSync(inventoryDefault)) return { path: inventoryDefault, name: DEFAULT_INVENTORY_FILE }
  const uploadsDefault = path.join(USER_UPLOADS, DEFAULT_INVENTORY_FILE)
  if (fs.existsSync(uploadsDefault)) return { path: uploadsDefault, name: DEFAULT_INVENTORY_FILE }
  for (const files of groups) {
    const byKeyword = files.find((f) => /inventory|stock|bar|menu/i.test(f.name))
    if (byKeyword) return { path: byKeyword.path, name: byKeyword.name }
  }
  for (const files of groups) {
    if (files.length > 0) return { path: files[0].path, name: files[0].name }
  }
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
  getXlsxFilesInInventoryDir,
  getInventoryFilesInUserUploads,
  getInventoryFilesInInventoryDir,
  getPdfFilesInUserUploads,
  resolveInventoryFile,
  resolveSalesFile,
  resolveMenuFile,
}
