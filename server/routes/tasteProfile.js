const path = require('path')
const fs = require('fs')
const router = require('express').Router()
const { TASTE_PROFILES_DIR } = require('../config/paths')

function ensureTasteProfilesDir() {
  if (!fs.existsSync(TASTE_PROFILES_DIR)) {
    fs.mkdirSync(TASTE_PROFILES_DIR, { recursive: true })
  }
}

function listTasteProfileFiles() {
  ensureTasteProfilesDir()
  const names = fs.readdirSync(TASTE_PROFILES_DIR).filter((n) => n.endsWith('.json'))
  return names
    .map((name) => {
      const filePath = path.join(TASTE_PROFILES_DIR, name)
      try {
        const stat = fs.statSync(filePath)
        return { id: name.replace(/\.json$/, ''), name, mtime: stat.mtimeMs }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime)
}

function getTasteProfileById(profileId) {
  const safeId = String(profileId).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safeId) return null
  const filePath = path.join(TASTE_PROFILES_DIR, `${safeId}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

router.post('/', (req, res) => {
  try {
    ensureTasteProfilesDir()
    const profile = req.body?.customer_taste_profile ?? req.body
    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid taste profile' })
    }
    const id = `profile_${Date.now()}`
    const filePath = path.join(TASTE_PROFILES_DIR, `${id}.json`)
    const toSave = { id, createdAt: new Date().toISOString(), ...profile }
    fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8')
    res.json({ success: true, id, path: filePath })
  } catch (err) {
    console.error('POST /api/taste-profile error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/', (req, res) => {
  try {
    const files = listTasteProfileFiles()
    res.json({ success: true, profiles: files })
  } catch (err) {
    console.error('GET /api/taste-profile error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/latest', (req, res) => {
  try {
    const files = listTasteProfileFiles()
    if (files.length === 0) {
      return res.json({ success: true, profile: null })
    }
    const latest = getTasteProfileById(files[0].id)
    res.json({ success: true, profile: latest })
  } catch (err) {
    console.error('GET /api/taste-profile/latest error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id', (req, res) => {
  try {
    const profile = getTasteProfileById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }
    res.json({ success: true, profile })
  } catch (err) {
    console.error('GET /api/taste-profile/:id error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { router, getTasteProfileById }
