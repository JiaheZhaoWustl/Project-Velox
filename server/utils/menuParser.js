const fs = require('fs')

function parseMenuTextFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').map((l) => l.trim())

    const sections = []
    const items = []
    let currentSection = null
    let currentSectionPrice = 14
    let currentItem = null
    let itemId = 1
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      if (!line || line.includes('N Euclid') || (line.includes('St. Louis') && line.includes('MO'))) {
        i++
        continue
      }

      if (line === 'LAZY TIGER' && !currentSection) {
        i++
        continue
      }

      const sectionMatch = line.match(/^([A-Z\s]+)—\s*\$(\d+)/)
      if (sectionMatch) {
        if (currentItem && currentItem.name) {
          if (!currentItem.price) currentItem.price = currentSectionPrice
          items.push({
            ...currentItem,
            id: itemId++,
            section: currentSection,
            status: 'active',
            happyHour: currentSection && currentSection.includes('CLASSICS'),
            tags: [],
            modifiers: currentItem.modifiers || [],
          })
          currentItem = null
        }

        currentSection = sectionMatch[1].trim()
        currentSectionPrice = parseInt(sectionMatch[2], 10)

        if (!sections.find((s) => s === currentSection)) {
          sections.push(currentSection)
        }

        i++
        if (i < lines.length &&
            (lines[i].toLowerCase().includes('happy hour') ||
             lines[i].toLowerCase().includes('experimental') ||
             lines[i].toLowerCase().includes('limited'))) {
          i++
        }
        continue
      }

      const isAllCaps = line === line.toUpperCase() && line.match(/^[A-Z\s.'-]+$/)
      const hasMinLength = line.length >= 3
      const isNotDescription = !line.includes(',') && !line.includes('—') && !line.includes('$')
      const isNotMetadata = !line.toLowerCase().includes('contains') &&
          !line.toLowerCase().includes('experimental') &&
          !line.toLowerCase().includes('limited') &&
          !line.toLowerCase().includes('happy hour') &&
          !line.toLowerCase().includes('release')
      const isItemName = isAllCaps && hasMinLength && isNotDescription && isNotMetadata && currentSection

      if (isItemName) {
        if (currentItem && currentItem.name) {
          if (!currentItem.price) currentItem.price = currentSectionPrice
          items.push({
            ...currentItem,
            id: itemId++,
            section: currentSection,
            status: 'active',
            happyHour: currentSection && currentSection.includes('CLASSICS'),
            tags: [],
            modifiers: currentItem.modifiers || [],
          })
        }

        currentItem = {
          name: line,
          description: '',
          price: currentSectionPrice,
          modifiers: [],
        }
        i++
        continue
      }

      if (currentItem && line.startsWith('*')) {
        const warning = line.replace(/^\*\s*/, '').trim()
        if (warning && !currentItem.modifiers.includes(warning)) {
          currentItem.modifiers.push(warning)
        }
        i++
        continue
      }

      const hasLowercase = line.match(/[a-z]/)
      const hasCommas = line.includes(',')
      const commaCount = (line.match(/,/g) || []).length
      const startsWithArticle = /^(A |An |The )/i.test(line.trim())
      const isIngredientList = hasCommas && commaCount >= 2 && !startsWithArticle

      if (currentItem && hasLowercase && !isIngredientList) {
        if (currentItem.description) {
          currentItem.description += ' ' + line
        } else {
          currentItem.description = line
        }
        i++
        continue
      }

      if (currentItem && isIngredientList) {
        i++
        continue
      }

      i++
    }

    if (currentItem && currentItem.name) {
      if (!currentItem.price) currentItem.price = currentSectionPrice
      items.push({
        ...currentItem,
        id: itemId++,
        section: currentSection || 'Cocktails',
        status: 'active',
        happyHour: currentSection && currentSection.includes('CLASSICS'),
        tags: [],
        modifiers: currentItem.modifiers || [],
      })
    }

    return { sections, items }
  } catch (err) {
    console.error('Error parsing menu file:', err)
    return { sections: [], items: [] }
  }
}

module.exports = { parseMenuTextFile }
