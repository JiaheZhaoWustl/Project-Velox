import React, { useState, useCallback, useEffect, useRef } from 'react'
import CustomerLayout from '../components/CustomerLayout'
import TasteProfileSliderRow from '../components/TasteProfileSliderRow'
import { AROMAS, FEELINGS, AXIS_INFO } from '../constants/tasteProfile'
import { FAMOUS_QUOTES } from '../constants/famousQuotes'
import { useTasteProfileActions } from '../hooks/useTasteProfile'
import { useCustomerTasteProfilePage } from '../hooks/useCustomerTasteProfilePage'
import { toPng } from 'html-to-image'
import CocktailPrintCard from '../components/CocktailPrintCard'
import {
  MOCK_COCKTAIL,
  buildDisplayCocktail,
} from '../utils/tasteProfileDisplay'
import { customerApi, cocktailImageApi, toApiAssetUrl } from '../services/api'
import { getCustomerPhoneDisplay } from '../utils/customerSession'

function CustomerTasteProfile() {
  const printCardRef = useRef(null)
  const {
    preferences,
    savePreferences,
    userName,
    recommendations,
    selectedRecIndex,
    setSelectedRecIndex,
    isUpdatingRecommendations,
    recommendationsError,
    handleUpdateRecommendations,
  } = useCustomerTasteProfilePage()

  const { toggleAroma, toggleFeeling } = useTasteProfileActions(preferences, savePreferences)

  const handleTasteChange = (key, value) => {
    savePreferences({ ...preferences, [key]: value })
  }

  const handleStrengthChange = (value) => {
    savePreferences({
      ...preferences,
      strength: value,
      mocktail: value === 0 ? 1 : 0,
    })
  }

  const handleMocktailToggle = () => {
    const nextMocktail = preferences.mocktail === 1 ? 0 : 1
    savePreferences({
      ...preferences,
      mocktail: nextMocktail,
      strength: nextMocktail === 1 ? 0 : preferences.strength === 0 ? 5 : preferences.strength,
    })
  }

  const [saveMsg, setSaveMsg] = useState(null)
  const [savedForCurrent, setSavedForCurrent] = useState(false)
  const [showCustomizations, setShowCustomizations] = useState(false)
  const [cocktailImageUrl, setCocktailImageUrl] = useState(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderMsg, setOrderMsg] = useState(null)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState('')

  const topRecs = recommendations?.top_recommendations || []
  const hasRecs = topRecs.length > 0
  const currentRec = hasRecs ? topRecs[selectedRecIndex] : null
  const displayCocktail = buildDisplayCocktail(currentRec) || MOCK_COCKTAIL

  const fetchCocktailImage = useCallback((name, glassware, { skipCache = false } = {}) => {
    const cacheKey = `cocktailImage_${name}`
    if (!skipCache) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setCocktailImageUrl(cached)
        return
      }
    } else {
      localStorage.removeItem(cacheKey)
    }
    let cancelled = false
    setImageLoading(true)
    setImageError(null)
    cocktailImageApi
      .generate({ cocktailName: name, glassware: glassware || '' })
      .then((data) => {
        if (!cancelled && data.imageUrl) {
          const resolved = toApiAssetUrl(data.imageUrl)
          setCocktailImageUrl(resolved)
          localStorage.setItem(cacheKey, resolved)
        }
      })
      .catch((err) => {
        if (!cancelled) setImageError(err.message || 'Could not generate image')
      })
      .finally(() => { if (!cancelled) setImageLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setSavedForCurrent(false)
    setSaveMsg(null)
    setShowCustomizations(false)
    setCocktailImageUrl(null)
    setImageError(null)
  }, [currentRec?.recipe_id, selectedRecIndex])

  useEffect(() => {
    if (!hasRecs || !currentRec?.recipe_name) return
    return fetchCocktailImage(currentRec.recipe_name, currentRec.recipe?.glassware)
  }, [hasRecs, currentRec?.recipe_name, fetchCocktailImage])

  const handleImageError = useCallback(() => {
    if (!currentRec?.recipe_name) return
    localStorage.removeItem(`cocktailImage_${currentRec.recipe_name}`)
    setCocktailImageUrl(null)
    setImageError('Image failed to load')
  }, [currentRec?.recipe_name])

  const retryImage = useCallback(() => {
    if (!currentRec?.recipe_name) return
    setCocktailImageUrl(null)
    setImageError(null)
    fetchCocktailImage(currentRec.recipe_name, currentRec.recipe?.glassware, { skipCache: true })
  }, [currentRec?.recipe_name, currentRec?.recipe?.glassware, fetchCocktailImage])

  const saveToCollection = useCallback(async () => {
    setSaveMsg(null)
    if (!currentRec?.recipe_name) return
    try {
      await customerApi.addCollectionItem({
        name: currentRec.recipe_name,
        recipeId: currentRec.recipe_id,
        source: 'taste_profile',
      })
      setSavedForCurrent(true)
      setSaveMsg('Saved to Saved.')
    } catch (e) {
      setSaveMsg(e.message || 'Could not save')
    }
  }, [currentRec])

  const pickFamousQuoteNoRepeat = useCallback((seedText) => {
    const source = String(seedText || 'velox')
    const hash = source
      .split('')
      .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)
    const quotes = FAMOUS_QUOTES
    const startIndex = hash % quotes.length
    const storageKey = 'velox_recent_quotes'
    let recent = []
    try {
      recent = JSON.parse(localStorage.getItem(storageKey) || '[]')
      if (!Array.isArray(recent)) recent = []
    } catch {
      recent = []
    }

    let picked = ''
    for (let offset = 0; offset < quotes.length; offset += 1) {
      const candidate = quotes[(startIndex + offset) % quotes.length]
      if (!recent.includes(candidate)) {
        picked = candidate
        break
      }
    }

    if (!picked) {
      picked = quotes[startIndex]
      recent = []
    }

    const keep = Math.max(quotes.length - 1, 1)
    const nextRecent = [...recent, picked].slice(-keep)
    localStorage.setItem(storageKey, JSON.stringify(nextRecent))
    return picked
  }, [])

  const estimateOneLineWidth = useCallback((text, fontSize, letterSpacingEm = 0) => {
    const raw = String(text || '').trim()
    if (!raw) return 0
    const estimatedUnits = raw.split('').reduce((sum, char) => {
      if (char === ' ') return sum + 0.32
      if (char === '“' || char === '”' || char === '"' || char === '\'') return sum + 0.3
      if ('ilIjtfr'.includes(char)) return sum + 0.46
      if ('ABCDEFGHKNOPQRSTUVXYZ'.includes(char)) return sum + 0.78
      if ('mwMW@%&QO'.includes(char)) return sum + 0.92
      if (/[0-9]/.test(char)) return sum + 0.62
      return sum + 0.64
    }, 0)
    const spacing = Math.max(raw.length - 1, 0) * fontSize * letterSpacingEm
    return estimatedUnits * fontSize + spacing
  }, [])

  const fitOneLineFontSize = useCallback((text, { max, min, maxWidth, letterSpacingEm = 0 }) => {
    const raw = String(text || '').trim()
    if (!raw) return max
    for (let size = max; size >= min; size -= 1) {
      if (estimateOneLineWidth(raw, size, letterSpacingEm) <= maxWidth) return size
    }
    return min
  }, [estimateOneLineWidth])

  const fitTwoLineFontSize = useCallback((text, { max, min, maxWidth, letterSpacingEm = 0 }) => {
    const raw = String(text || '').trim()
    if (!raw) return max
    for (let size = max; size >= min; size -= 1) {
      if (estimateOneLineWidth(raw, size, letterSpacingEm) <= maxWidth * 2) return size
    }
    return min
  }, [estimateOneLineWidth])

  const getTitleLetterSpacing = useCallback((name) => {
    const len = String(name || '').trim().length
    if (len > 26) return 0.005
    if (len > 20) return 0.012
    if (len > 15) return 0.02
    return 0.05
  }, [])

  const fitParagraphFontSize = useCallback((text, { max, min, softLimit }) => {
    const raw = String(text || '').trim()
    if (!raw) return max
    const ratio = softLimit / Math.max(raw.length, 1)
    const next = Math.floor(max * Math.min(1, Math.max(0.5, ratio)))
    return Math.max(min, Math.min(max, next))
  }, [])

  const shortenIngredient = useCallback((ingredient) => {
    if (!ingredient) return ''
    return String(ingredient)
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\bounces?\b/gi, 'oz')
      .replace(/\bmilliliters?\b/gi, 'ml')
      .replace(/\bdrops?\b/gi, 'dashes')
      .replace(/\btablespoons?\b/gi, 'tbsp')
      .replace(/\bteaspoons?\b/gi, 'tsp')
      .replace(/\bfresh\b/gi, '')
      .replace(/\b(optional|to taste)\b/gi, '')
      .replace(/^\s*\d+(?:\s+\d+)?(?:[./\-]\d+)?\s*(?:oz|ml|cl|l|g|kg|dashes?|tbsp|tsp|parts?|pinch(?:es)?|sprigs?|slices?|cubes?|pieces?|barspoons?)?\s*/i, '')
      .replace(/\b\d+(?:[./\-]\d+)?\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  const buildIngredientsLine = useCallback((ingredients) => {
    const compact = (ingredients || [])
      .map(shortenIngredient)
      .filter(Boolean)
    if (compact.length === 0) return 'See bartender for house build.'
    return compact.join(' | ')
  }, [shortenIngredient])

  const shortenStep = useCallback((step) => {
    if (!step) return ''
    const source = String(step)
      .replace(/^\s*\d+[\)\.\-:\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim()
    const lowered = source.toLowerCase()
    let compact = source
    if (lowered.includes('rinse') && lowered.includes('absinthe')) compact = 'Rinse with absinthe, discard'
    else if (lowered.includes('rinse')) compact = 'Rinse glass, discard'
    else if (lowered.includes('muddle')) compact = source
    else if (lowered.includes('stir') && lowered.includes('ice')) compact = 'Stir with ice until chilled'
    else if (lowered.includes('shake') && lowered.includes('ice')) compact = 'Shake with ice until chilled'
    else if (lowered.includes('strain') && lowered.includes('glass')) compact = 'Strain into serving glass'
    else if (lowered.includes('strain')) compact = 'Strain'
    else if (lowered.includes('express') && lowered.includes('peel')) compact = 'Express peel over drink, discard'
    else if (lowered.includes('garnish')) compact = 'Garnish and serve'
    else if (lowered.includes('top with')) compact = source
    else if (lowered.includes('combine') && lowered.includes('ice')) compact = 'Combine with ice'
    compact = compact
      .replace(/\s+/g, ' ')
      .replace(/\bfor\s+\d+\s*seconds?\b/gi, '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\.$/, '')
      .trim()
    return compact
  }, [])

  const buildConciseSteps = useCallback((steps, maxTotalLength) => {
    const concise = (steps || []).map(shortenStep).filter(Boolean).slice(0, 5)
    const fallback = ['Stir with ice until chilled', 'Strain into serving glass', 'Garnish and serve']
    const picked = concise.length > 0 ? concise : fallback
    const safeMax = Math.max(64, (maxTotalLength || 120) + 20)
    const separatorCost = Math.max(picked.length - 1, 0) * 2
    const textBudget = Math.max(safeMax - separatorCost, 40)
    const perStepBudget = Math.max(12, Math.floor(textBudget / picked.length))

    const compactToBudget = (text, budget) => {
      if (text.length <= budget) return text
      const trimmed = text
        .replace(/\b(until chilled|very cold)\b/gi, 'chilled')
        .replace(/\b(serving|prepared)\s+glass\b/gi, 'glass')
        .replace(/\bwith\s+ice\b/gi, 'on ice')
        .replace(/\binto\b/gi, 'to')
        .replace(/\s+/g, ' ')
        .trim()
      if (trimmed.length <= budget) return trimmed
      const words = trimmed.split(' ')
      let out = ''
      for (const word of words) {
        const next = out ? `${out} ${word}` : word
        if (next.length > budget) break
        out = next
      }
      return out || words[0]
    }

    let result = picked.map((step) => compactToBudget(step, perStepBudget))
    let total = result.join('  ').length

    // If still over budget, tighten longest steps iteratively so later steps remain visible.
    while (total > safeMax) {
      let idx = -1
      for (let i = 0; i < result.length; i += 1) {
        if (idx === -1 || result[i].length > result[idx].length) idx = i
      }
      if (idx === -1 || result[idx].length <= 10) break
      result[idx] = compactToBudget(result[idx], result[idx].length - 1)
      total = result.join('  ').length
    }

    return result.filter(Boolean)
  }, [shortenStep])

  const ensureFontsLoaded = useCallback(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready
    }
  }, [])

  const downloadPrintCard = useCallback(async () => {
    if (!printCardRef.current) return
    setDownloadLoading(true)
    try {
      await ensureFontsLoaded()
      const node = printCardRef.current
      const exportWidth = Math.ceil(node.offsetWidth)
      const exportHeight = Math.ceil(node.offsetHeight)
      const exportScale = 8
      const dataUrl = await toPng(printCardRef.current, {
        pixelRatio: 1,
        width: exportWidth,
        height: exportHeight,
        canvasWidth: exportWidth * exportScale,
        canvasHeight: exportHeight * exportScale,
        cacheBust: true,
        backgroundColor: '#ffffff',
      })
      const safeName = (displayCocktail.name || 'cocktail')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = `${safeName || 'cocktail'}-2x3-card.png`
      anchor.click()
    } catch (error) {
      setOrderMsg(error.message || 'Could not generate PNG')
    } finally {
      setDownloadLoading(false)
    }
  }, [displayCocktail.name, ensureFontsLoaded])

  useEffect(() => {
    setSelectedQuote(pickFamousQuoteNoRepeat(currentRec?.recipe_name || displayCocktail.name))
  }, [currentRec?.recipe_id, currentRec?.recipe_name, displayCocktail.name, pickFamousQuoteNoRepeat])

  const handleOrder = useCallback(async () => {
    setOrderMsg(null)
    setOrderLoading(true)
    try {
      const data = await customerApi.placeOrder({
        name: displayCocktail.name,
        section: 'recommendation',
        price: 0,
        ingredients: Array.isArray(displayCocktail.ingredients) ? displayCocktail.ingredients : [],
      })
      const num = data.order?.orderNumber || ''
      const msg = data?.notRecorded
        ? (data.message || 'Mobile preview only. Not added to order history.')
        : (num ? `Order placed — ${num}` : 'Order placed.')
      setOrderMsg(msg)
      setPrintModalOpen(true)
    } catch (e) {
      setOrderMsg(e.message || 'Could not place order')
    } finally {
      setOrderLoading(false)
    }
  }, [displayCocktail.ingredients, displayCocktail.name])

  const quoteLine = selectedQuote || FAMOUS_QUOTES[0]
  const ingredientsLine = buildIngredientsLine(displayCocktail.ingredients)
  const titleLetterSpacing = getTitleLetterSpacing(displayCocktail.name)
  const titleFontSize = fitTwoLineFontSize(displayCocktail.name, {
    max: 66,
    min: 14,
    maxWidth: 548,
    letterSpacingEm: titleLetterSpacing,
  })
  const quoteFontSize = fitTwoLineFontSize(quoteLine, {
    max: 34,
    min: 20,
    maxWidth: 510,
    letterSpacingEm: 0,
  })
  const quoteLetterSpacing = 0
  const ingredientsFittedFontSize = fitParagraphFontSize(ingredientsLine, { max: 22, min: 11, softLimit: 210 })
  const ingredientsFontSize = ingredientsFittedFontSize

  const isRegistered = Boolean(getCustomerPhoneDisplay())

  if (!isRegistered) {
    return (
      <CustomerLayout>
        <div className="customer-taste-profile synesthesia-minimal">
          <div className="taste-profile-guest-gate">
            <h2 className="taste-profile-guest-gate-title">Create your taste profile</h2>
            <p className="taste-profile-guest-gate-desc">
              Sign in with your phone number to get personalized cocktail recommendations, save your favorites, and track your order history.
            </p>
            <button
              type="button"
              className="tp-btn tp-btn--primary"
              onClick={() => window.location.href = '/customer'}
            >
              Sign in with phone
            </button>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout>
      <div className="customer-taste-profile synesthesia-minimal">
        <div className="taste-profile-left">
          {hasRecs && (
            <div className="taste-profile-recommendations-header">
              <p className="taste-profile-kicker">Recommended for you</p>
            </div>
          )}
          <div className="taste-profile-card">
            <div className="taste-profile-card-header">
              <div className="taste-profile-card-title-row">
                <h2 className="taste-profile-cocktail-name">
                  {displayCocktail.name}
                  {displayCocktail.customizations?.length > 0 && (
                    <button
                      type="button"
                      className="taste-profile-info-btn"
                      onClick={() => setShowCustomizations((v) => !v)}
                      aria-label="Show customizations"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </button>
                  )}
                </h2>
                <div className="taste-profile-card-actions">
                  {displayCocktail.matchScore != null && (
                    <span className="taste-profile-match-score">
                      {Math.round(displayCocktail.matchScore)}% fit
                    </span>
                  )}
                  {hasRecs && currentRec && (
                    <button
                      type="button"
                      className={`taste-profile-save-icon-btn${savedForCurrent ? ' taste-profile-save-icon-btn--saved' : ''}`}
                      onClick={saveToCollection}
                      aria-label={savedForCurrent ? 'Saved to collection' : 'Save drink to Saved'}
                    >
                      <svg className="taste-profile-save-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path className="taste-profile-save-icon-path" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {saveMsg && <p className="taste-profile-save-msg">{saveMsg}</p>}
            {showCustomizations && displayCocktail.customizations?.length > 0 && (
              <div className="taste-profile-customization-tip">
                <p className="taste-profile-customization-text">
                  {displayCocktail.customizations.join(' · ')}
                </p>
              </div>
            )}
            <div className="taste-profile-cocktail-image">
              {cocktailImageUrl ? (
                <img
                  src={cocktailImageUrl}
                  alt={displayCocktail.name}
                  className="taste-profile-cocktail-img"
                  onError={handleImageError}
                />
              ) : imageLoading ? (
                <div className="taste-profile-image-loading" role="status" aria-live="polite">
                  <span className="taste-profile-image-spinner" aria-hidden="true" />
                  <span className="taste-profile-image-loading-text">
                    Generating cocktail
                    <span className="taste-profile-loading-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </span>
                </div>
              ) : imageError ? (
                <div className="taste-profile-image-error">
                  <span>{imageError}</span>
                  <button type="button" className="tp-btn tp-btn--secondary" onClick={retryImage}>
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
            {displayCocktail.needsRecipeRefresh && hasRecs ? (
              <div className="taste-profile-recipe-refresh">
                <p>Recipe not available yet.</p>
                <button
                  type="button"
                  className="tp-btn tp-btn--primary tp-btn--block"
                  onClick={handleUpdateRecommendations}
                  disabled={isUpdatingRecommendations}
                >
                  {isUpdatingRecommendations ? 'Loading…' : 'Load recipe'}
                </button>
              </div>
            ) : (
              <>
                {displayCocktail.ingredients?.length > 0 && (
                  <div className="taste-profile-recipe">
                    <h4 className="taste-profile-recipe-heading">Ingredients</h4>
                    <ul className="taste-profile-ingredients">
                      {displayCocktail.ingredients.map((ing, i) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                    {displayCocktail.glassware && (
                      <p className="taste-profile-glassware">Glassware: {displayCocktail.glassware}</p>
                    )}
                  </div>
                )}
                {displayCocktail.steps?.length > 0 && (
                  <div className="taste-profile-recipe">
                    <h4 className="taste-profile-recipe-heading">How to make it</h4>
                    <ol className="taste-profile-steps">
                      {displayCocktail.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
            <p className="taste-profile-cocktail-desc">{displayCocktail.description}</p>
            <div className="taste-profile-actions">
              <button type="button" className="tp-btn tp-btn--primary" onClick={handleOrder} disabled={orderLoading}>
                {orderLoading ? 'Ordering…' : 'Order'}
              </button>
              {hasRecs && topRecs.length > 1 ? (
                <button
                  type="button"
                  className="tp-btn tp-btn--secondary"
                  onClick={() => setSelectedRecIndex((i) => (i + 1) % topRecs.length)}
                >
                  Next pick
                </button>
              ) : (
                <button type="button" className="tp-btn tp-btn--secondary" disabled>
                  Next pick
                </button>
              )}
            </div>
            {orderMsg && <p className="taste-profile-save-msg">{orderMsg}</p>}
          </div>
          {hasRecs && topRecs.length > 1 && (
            <div className="taste-profile-rec-list">
              {topRecs.map((r, i) => (
                <button
                  key={r.recipe_id}
                  type="button"
                  className={`taste-profile-rec-chip ${i === selectedRecIndex ? 'active' : ''}`}
                  onClick={() => setSelectedRecIndex(i)}
                >
                  {r.recipe_name}
                  {r.match_score != null ? ` · ${r.match_score}/100` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="taste-profile-right">
          <h2 className="taste-profile-title">{userName} would like the drink to be…</h2>

          <section className="taste-profile-section">
            <h3 className="taste-profile-section-title">Core taste</h3>
            {['Sweetness', 'Sourness', 'Bitterness', 'Saltiness', 'Umami'].map((label) => {
              const key = label.toLowerCase()
              const value = preferences[key] ?? 5
              return (
                <TasteProfileSliderRow
                  key={key}
                  label={label}
                  value={value}
                  onChange={(v) => handleTasteChange(key, v)}
                  info={AXIS_INFO[key]}
                />
              )
            })}
          </section>

          <section className="taste-profile-section">
            <h3 className="taste-profile-section-title">Drink strength</h3>
            <div className="taste-profile-strength-with-mocktail">
              <TasteProfileSliderRow
                label="Light / refreshing ←→ Strong / bold"
                value={preferences.mocktail === 1 ? 0 : preferences.strength ?? 5}
                onChange={handleStrengthChange}
                lowLabel="Light"
                highLabel="Strong"
                info={AXIS_INFO.strength}
              />
              <div className="taste-profile-mocktail-under">
                <span className="taste-profile-mocktail-label">Mocktail</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.mocktail === 1}
                  className={`tp-mocktail-switch ${preferences.mocktail === 1 ? 'on' : ''}`}
                  onClick={handleMocktailToggle}
                >
                  <span className="tp-mocktail-knob" />
                </button>
              </div>
            </div>
          </section>

          <section className="taste-profile-section">
            <h3 className="taste-profile-section-title">Aromas (1–3)</h3>
            <div className="taste-profile-chips">
              {AROMAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`taste-profile-chip ${(preferences.aromas || []).includes(a) ? 'active' : ''}`}
                  onClick={() => toggleAroma(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="taste-profile-text-input"
              placeholder="Or add your own (e.g. vanilla, mint)"
              value={preferences.aromasCustom || ''}
              onChange={(e) => savePreferences({ ...preferences, aromasCustom: e.target.value })}
            />
            {((preferences.aromas || []).length > 0 || preferences.aromasCustom) && (
              <p className="taste-profile-hint">
                <span className="taste-profile-hint-label">Your picks:</span>{' '}
                {[...(preferences.aromas || []), preferences.aromasCustom].filter(Boolean).join(', ')}
              </p>
            )}
          </section>

          <section className="taste-profile-section">
            <h3 className="taste-profile-section-title">Mouthfeel</h3>
            <TasteProfileSliderRow
              label="Rough ←→ smooth"
              value={preferences.mouthfeelRoughSmooth ?? 5}
              onChange={(v) => savePreferences({ ...preferences, mouthfeelRoughSmooth: v })}
              lowLabel="Rough"
              highLabel="Smooth"
              info={AXIS_INFO.mouthfeelRoughSmooth}
            />
            <TasteProfileSliderRow
              label="Crisp ←→ dense"
              value={preferences.mouthfeelCrispDense ?? 5}
              onChange={(v) => savePreferences({ ...preferences, mouthfeelCrispDense: v })}
              lowLabel="Crisp"
              highLabel="Dense"
              info={AXIS_INFO.mouthfeelCrispDense}
            />
            <TasteProfileSliderRow
              label="Flat ←→ sparkling"
              value={preferences.mouthfeelFlatSparkling ?? 5}
              onChange={(v) => savePreferences({ ...preferences, mouthfeelFlatSparkling: v })}
              lowLabel="Flat"
              highLabel="Sparkling"
              info={AXIS_INFO.mouthfeelFlatSparkling}
            />
            <TasteProfileSliderRow
              label="Clear ←→ creamy"
              value={preferences.mouthfeelClearCreamy ?? 5}
              onChange={(v) => savePreferences({ ...preferences, mouthfeelClearCreamy: v })}
              lowLabel="Clear"
              highLabel="Creamy"
              info={AXIS_INFO.mouthfeelClearCreamy}
            />
          </section>

          <section className="taste-profile-section">
            <h3 className="taste-profile-section-title">Mood</h3>
            <div className="taste-profile-chips">
              {FEELINGS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`taste-profile-chip ${(preferences.feelings || []).includes(f) ? 'active' : ''}`}
                  onClick={() => toggleFeeling(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="taste-profile-text-input"
              placeholder="Or describe in your own words"
              value={preferences.feelingsText || ''}
              onChange={(e) => savePreferences({ ...preferences, feelingsText: e.target.value })}
            />
            {((preferences.feelings || []).length > 0 || preferences.feelingsText) && (
              <p className="taste-profile-hint">
                <span className="taste-profile-hint-label">Your picks:</span>{' '}
                {[...(preferences.feelings || []), preferences.feelingsText].filter(Boolean).join(', ')}
              </p>
            )}
          </section>

          <section className="taste-profile-section">
            <h3 className="taste-profile-section-title">Adventurousness</h3>
            <TasteProfileSliderRow
              label="Classic ←→ experimental"
              value={preferences.adventurous ?? 5}
              onChange={(v) => savePreferences({ ...preferences, adventurous: v })}
              info={AXIS_INFO.adventurous}
            />
          </section>

          <section className="taste-profile-section">
            <h3 className="taste-profile-section-title">Additional notes</h3>
            <textarea
              className="taste-profile-textarea"
              placeholder="e.g. avoid cilantro, allergies, prefer low sugar, surprise me…"
              value={preferences.additionalNotes || ''}
              onChange={(e) => savePreferences({ ...preferences, additionalNotes: e.target.value })}
              rows={3}
            />
          </section>

          <div className="taste-profile-update-actions">
            <button
              type="button"
              className="tp-btn tp-btn--primary tp-btn--block"
              onClick={handleUpdateRecommendations}
              disabled={isUpdatingRecommendations}
            >
              {isUpdatingRecommendations ? 'Updating…' : 'Update recommendations'}
            </button>
            {recommendationsError && (
              <p className="taste-profile-update-error" role="alert">
                {recommendationsError}
              </p>
            )}
          </div>
        </div>
      </div>
      {printModalOpen && (
        <div className="print-card-modal-backdrop" role="presentation" onClick={() => setPrintModalOpen(false)}>
          <div
            className="print-card-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Printable cocktail card preview"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="print-card-modal-header">
              <h3>2x3 Print Card Preview</h3>
              <button type="button" className="print-card-modal-close" onClick={() => setPrintModalOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="print-card-modal-body">
              <div className="print-card-preview-scale">
                <CocktailPrintCard
                  ref={printCardRef}
                  name={displayCocktail.name}
                  imageUrl={cocktailImageUrl}
                  quote={quoteLine}
                  ingredientsLine={ingredientsLine}
                  titleFontSize={titleFontSize}
                  titleLetterSpacing={titleLetterSpacing}
                  quoteFontSize={quoteFontSize}
                  quoteLetterSpacing={quoteLetterSpacing}
                  ingredientsFontSize={ingredientsFontSize}
                />
              </div>
            </div>
            <div className="print-card-modal-actions">
              <button type="button" className="tp-btn tp-btn--secondary" onClick={() => setPrintModalOpen(false)}>
                Close
              </button>
              <button type="button" className="tp-btn tp-btn--primary" onClick={downloadPrintCard} disabled={downloadLoading}>
                {downloadLoading ? 'Generating PNG…' : 'Download PNG'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}

export default CustomerTasteProfile
