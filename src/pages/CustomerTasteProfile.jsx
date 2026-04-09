import React, { useState, useCallback, useEffect } from 'react'
import CustomerLayout from '../components/CustomerLayout'
import TasteProfileSliderRow from '../components/TasteProfileSliderRow'
import { AROMAS, FEELINGS } from '../constants/tasteProfile'
import { useTasteProfileActions } from '../hooks/useTasteProfile'
import { useCustomerTasteProfilePage } from '../hooks/useCustomerTasteProfilePage'
import {
  MOCK_COCKTAIL,
  buildDisplayCocktail,
} from '../utils/tasteProfileDisplay'
import { customerApi, cocktailImageApi } from '../services/api'
import { getCustomerPhoneDisplay } from '../utils/customerSession'

function CustomerTasteProfile() {
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

  const topRecs = recommendations?.top_recommendations || []
  const hasRecs = topRecs.length > 0
  const currentRec = hasRecs ? topRecs[selectedRecIndex] : null
  const displayCocktail = buildDisplayCocktail(currentRec) || MOCK_COCKTAIL

  useEffect(() => {
    setSavedForCurrent(false)
    setSaveMsg(null)
    setShowCustomizations(false)
    setCocktailImageUrl(null)
  }, [currentRec?.recipe_id, selectedRecIndex])

  useEffect(() => {
    if (!hasRecs || !currentRec?.recipe_name) return
    const name = currentRec.recipe_name
    const cacheKey = `cocktailImage_${name}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setCocktailImageUrl(cached)
      return
    }
    let cancelled = false
    setImageLoading(true)
    cocktailImageApi
      .generate({
        cocktailName: name,
        glassware: currentRec.recipe?.glassware || '',
      })
      .then((data) => {
        if (!cancelled && data.imageUrl) {
          setCocktailImageUrl(data.imageUrl)
          localStorage.setItem(cacheKey, data.imageUrl)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setImageLoading(false) })
    return () => { cancelled = true }
  }, [hasRecs, currentRec?.recipe_name])

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
                <img src={cocktailImageUrl} alt={displayCocktail.name} className="taste-profile-cocktail-img" />
              ) : imageLoading ? (
                <span className="taste-profile-image-loading">Generating image…</span>
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
              <button type="button" className="tp-btn tp-btn--primary">
                Order
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
              label="Rough vs. smooth"
              value={preferences.mouthfeelRoughSmooth ?? 5}
              onChange={(v) => savePreferences({ ...preferences, mouthfeelRoughSmooth: v })}
              lowLabel="Rough"
              highLabel="Smooth"
            />
            <TasteProfileSliderRow
              label="Crisp vs. dense"
              value={preferences.mouthfeelCrispDense ?? 5}
              onChange={(v) => savePreferences({ ...preferences, mouthfeelCrispDense: v })}
              lowLabel="Crisp"
              highLabel="Dense"
            />
            <TasteProfileSliderRow
              label="Flat vs. sparkling"
              value={preferences.mouthfeelFlatSparkling ?? 5}
              onChange={(v) => savePreferences({ ...preferences, mouthfeelFlatSparkling: v })}
              lowLabel="Flat"
              highLabel="Sparkling"
            />
            <TasteProfileSliderRow
              label="Clear vs. creamy"
              value={preferences.mouthfeelClearCreamy ?? 5}
              onChange={(v) => savePreferences({ ...preferences, mouthfeelClearCreamy: v })}
              lowLabel="Clear"
              highLabel="Creamy"
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
    </CustomerLayout>
  )
}

export default CustomerTasteProfile
