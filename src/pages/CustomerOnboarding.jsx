import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomerLayout from '../components/CustomerLayout'
import DragSlider from '../components/DragSlider'
import { AROMAS, FEELINGS, SCALE_LABELS, DEFAULT_PREFS, AXIS_INFO } from '../constants/tasteProfile'
import { useTasteProfileActions } from '../hooks/useTasteProfile'
import { tasteProfileApi, recommendationsApi, customerApi } from '../services/api'

const INITIAL_PREFS = { ...DEFAULT_PREFS, wantsProfile: null }

function SliderInput({ value, onChange, labels = SCALE_LABELS.taste, min = 1, max = 10 }) {
  return (
    <DragSlider
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={1}
      labels={labels}
    />
  )
}

function AxisLabel({ text, info }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="onboarding-axis-label-row">
      <label>{text}</label>
      {info && (
        <button
          type="button"
          className="taste-profile-axis-info-btn"
          onClick={() => setOpen((v) => !v)}
          aria-label={`What does "${text}" mean?`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      )}
      {open && <p className="taste-profile-axis-info-text">{info}</p>}
    </div>
  )
}

function CustomerOnboarding() {
  const [step, setStep] = useState(0)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState(null)
  const [preferences, setPreferences] = useState(INITIAL_PREFS)
  const { toggleAroma, toggleFeeling } = useTasteProfileActions(
    preferences,
    (next) => setPreferences(next)
  )
  const navigate = useNavigate()

  const goToTasteProfile = () => navigate('/customer/taste-profile')

  const saveProfileAndContinue = async () => {
    try {
      const saveData = await tasteProfileApi.save(preferences).catch(() => ({}))
      if (saveData?.success && saveData.id) {
        localStorage.setItem('customerTasteProfileId', saveData.id)
        customerApi.setTasteProfileId(saveData.id).catch(() => {})
      }
    } catch {
      // continue anyway
    }
    goToTasteProfile()
  }

  const handleFinish = async () => {
    localStorage.setItem('customerTasteProfile', JSON.stringify(preferences))
    setIsLoadingRecommendations(true)
    setRecommendationsError(null)
    try {
      const saveData = await tasteProfileApi.save(preferences).catch(() => ({}))
      const profileId = saveData?.success ? saveData.id : null
      if (profileId) {
        localStorage.setItem('customerTasteProfileId', profileId)
        customerApi.setTasteProfileId(profileId).catch(() => {})
      }

      const body = profileId ? { profile_id: profileId } : { customer_taste_profile: preferences }
      const data = await recommendationsApi.get(body)
      localStorage.setItem('cocktailRecommendations', JSON.stringify(data.recommendations))
      goToTasteProfile()
    } catch (err) {
      setRecommendationsError(err.message || 'Could not load recommendations')
      localStorage.setItem('cocktailRecommendations', JSON.stringify(null))
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const showBack = step > 2 && step < 9
  const currentStepNum = step >= 2 ? Math.min(step - 1, 7) : 0

  const StepProgress = () => {
    if (step < 2) return null
    return (
      <div className="onboarding-step-arrows" role="progressbar" aria-valuenow={currentStepNum} aria-valuemin={1} aria-valuemax={7} aria-label={`Step ${currentStepNum} of 7`}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <React.Fragment key={n}>
            {n > 1 && (
              <span className={`onboarding-step-arrow ${n <= currentStepNum ? 'done' : ''}`} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            )}
            <span className={`onboarding-step-node ${n < currentStepNum ? 'done' : ''} ${n === currentStepNum ? 'active' : ''}`} />
          </React.Fragment>
        ))}
      </div>
    )
  }

  if (step === 0) {
    return (
      <CustomerLayout variant="minimal">
        <div className="onboarding-screen">
          <h2 className="onboarding-title">Would you like to build a taste profile?</h2>
          <div className="onboarding-actions">
            <button type="button" className="customer-btn-continue" onClick={() => { setPreferences((p) => ({ ...p, wantsProfile: true })); setStep(1); }}>
              Yes
            </button>
            <button type="button" className="customer-btn-guest" onClick={() => navigate('/customer/menu')}>
              No, take me to the menu
            </button>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  if (step === 1) {
    return (
      <CustomerLayout variant="minimal">
        <div className="onboarding-screen">
          <h2 className="onboarding-title">Let's start with a few questions.</h2>
          <button type="button" className="customer-btn-continue" onClick={() => setStep(2)}>
            Start
          </button>
        </div>
      </CustomerLayout>
    )
  }

  if (step === 2) {
    return (
      <CustomerLayout variant="minimal">
        <div className="onboarding-screen">
          <StepProgress />
          <h2 className="onboarding-title">How are you feeling?</h2>
          <div className="onboarding-chips">
            {FEELINGS.map((f) => (
              <button
                key={f}
                type="button"
                className={`onboarding-chip ${preferences.feelings.includes(f) ? 'active' : ''}`}
                onClick={() => toggleFeeling(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="onboarding-text-input"
            placeholder="Your words (optional)"
            value={preferences.feelingsText}
            onChange={(e) => setPreferences((p) => ({ ...p, feelingsText: e.target.value }))}
          />
          <button type="button" className="customer-btn-continue" onClick={() => setStep(3)}>
            Next
          </button>
        </div>
      </CustomerLayout>
    )
  }

  if (step === 3) {
    return (
      <CustomerLayout variant="minimal">
        <div className="onboarding-screen">
          <StepProgress />
          <h2 className="onboarding-title">Core flavors</h2>
          <div className="onboarding-form">
            {['sweetness', 'sourness', 'bitterness', 'saltiness', 'umami'].map((key) => (
              <div key={key} className="onboarding-field">
                <AxisLabel text={key.charAt(0).toUpperCase() + key.slice(1)} info={AXIS_INFO[key]} />
                <SliderInput value={preferences[key]} onChange={(v) => setPreferences((p) => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </div>
          <button type="button" className="customer-btn-continue" onClick={() => setStep(4)}>
            Next
          </button>
        </div>
      </CustomerLayout>
    )
  }

  if (step === 4) {
    const handleStrengthChange = (v) => {
      setPreferences((p) => ({
        ...p,
        strength: v,
        mocktail: v === 0 ? 1 : 0,
      }))
    }
    const handleMocktailToggle = () => {
      const nextMocktail = preferences.mocktail === 1 ? 0 : 1
      setPreferences((p) => ({
        ...p,
        mocktail: nextMocktail,
        strength: nextMocktail === 1 ? 0 : (p.strength === 0 ? 5 : p.strength),
      }))
    }
    return (
      <CustomerLayout variant="minimal">
        <div className="onboarding-screen">
          {showBack && <button type="button" className="onboarding-back" onClick={() => setStep(step - 1)}>← Back</button>}
          <StepProgress />
          <h2 className="onboarding-title">Strength</h2>
          <div className="onboarding-form">
            <div className="onboarding-field">
              <AxisLabel text="Light / refreshing ←→ Strong / Bold" info={AXIS_INFO.strength} />
              <DragSlider
                value={preferences.mocktail === 1 ? 0 : preferences.strength}
                onChange={handleStrengthChange}
                min={0}
                max={10}
                step={1}
                labels={SCALE_LABELS.strength}
              />
              <div className="onboarding-mocktail-under">
                <label className="onboarding-mocktail-label">Mocktail</label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.mocktail === 1}
                  className={`onboarding-mocktail-switch ${preferences.mocktail === 1 ? 'on' : ''}`}
                  onClick={handleMocktailToggle}
                >
                  <span className="onboarding-mocktail-knob" />
                </button>
              </div>
            </div>
          </div>
          <button type="button" className="customer-btn-continue" onClick={() => setStep(5)}>
            Next
          </button>
        </div>
      </CustomerLayout>
    )
  }

  if (step === 5) {
    return (
      <CustomerLayout variant="minimal">
        <div className="onboarding-screen">
          {showBack && <button type="button" className="onboarding-back" onClick={() => setStep(step - 1)}>← Back</button>}
          <StepProgress />
          <h2 className="onboarding-title">Aromas (1–3)</h2>
          <div className="onboarding-chips">
            {AROMAS.map((a) => (
              <button
                key={a}
                type="button"
                className={`onboarding-chip ${preferences.aromas.includes(a) ? 'active' : ''}`}
                onClick={() => toggleAroma(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="onboarding-text-input"
            placeholder="Custom aromas"
            value={preferences.aromasCustom}
            onChange={(e) => setPreferences((p) => ({ ...p, aromasCustom: e.target.value }))}
          />
          {preferences.aromas.length > 0 && (
            <p className="onboarding-hint">{preferences.aromas.join(', ')}{preferences.aromasCustom ? `, ${preferences.aromasCustom}` : ''}</p>
          )}
          <button type="button" className="customer-btn-continue" onClick={() => setStep(6)}>
            Next
          </button>
        </div>
      </CustomerLayout>
    )
  }

  if (step === 6) {
    return (
      <CustomerLayout variant="minimal">
        <div className="onboarding-screen">
          {showBack && <button type="button" className="onboarding-back" onClick={() => setStep(step - 1)}>← Back</button>}
          <StepProgress />
          <h2 className="onboarding-title">Mouthfeel</h2>
          <div className="onboarding-form">
            <div className="onboarding-field">
              <AxisLabel text="Rough vs. Smooth" info={AXIS_INFO.mouthfeelRoughSmooth} />
              <SliderInput
                value={preferences.mouthfeelRoughSmooth}
                onChange={(v) => setPreferences((p) => ({ ...p, mouthfeelRoughSmooth: v }))}
                labels={SCALE_LABELS.mouthfeel}
              />
            </div>
            <div className="onboarding-field">
              <AxisLabel text="Crisp vs. Dense" info={AXIS_INFO.mouthfeelCrispDense} />
              <SliderInput
                value={preferences.mouthfeelCrispDense}
                onChange={(v) => setPreferences((p) => ({ ...p, mouthfeelCrispDense: v }))}
                labels={SCALE_LABELS.crisp}
              />
            </div>
            <div className="onboarding-field">
              <AxisLabel text="Flat vs. Sparkling" info={AXIS_INFO.mouthfeelFlatSparkling} />
              <SliderInput
                value={preferences.mouthfeelFlatSparkling}
                onChange={(v) => setPreferences((p) => ({ ...p, mouthfeelFlatSparkling: v }))}
                labels={SCALE_LABELS.flat}
              />
            </div>
            <div className="onboarding-field">
              <AxisLabel text="Clear vs. Creamy" info={AXIS_INFO.mouthfeelClearCreamy} />
              <SliderInput
                value={preferences.mouthfeelClearCreamy}
                onChange={(v) => setPreferences((p) => ({ ...p, mouthfeelClearCreamy: v }))}
                labels={SCALE_LABELS.clear}
              />
            </div>
          </div>
          <button type="button" className="customer-btn-continue" onClick={() => setStep(7)}>
            Next
          </button>
        </div>
      </CustomerLayout>
    )
  }

  if (step === 7) {
    return (
      <CustomerLayout variant="minimal">
        <div className="onboarding-screen">
          {showBack && <button type="button" className="onboarding-back" onClick={() => setStep(step - 1)}>← Back</button>}
          <StepProgress />
          <h2 className="onboarding-title">Adventurousness</h2>
          <div className="onboarding-form">
            <AxisLabel text="Classic ←→ Experimental" info={AXIS_INFO.adventurous} />
            <SliderInput
              value={preferences.adventurous}
              onChange={(v) => setPreferences((p) => ({ ...p, adventurous: v }))}
              labels={SCALE_LABELS.adventurous}
            />
          </div>
          <button type="button" className="customer-btn-continue" onClick={() => setStep(8)}>
            Next
          </button>
        </div>
      </CustomerLayout>
    )
  }

  if (step === 8) {
    return (
      <CustomerLayout variant="minimal">
        <div className="onboarding-screen">
          {showBack && <button type="button" className="onboarding-back" onClick={() => setStep(step - 1)}>← Back</button>}
          <StepProgress />
          <h2 className="onboarding-title">Anything else we should know?</h2>
          <textarea
            className="onboarding-textarea"
            placeholder="e.g., avoid cilantro, allergies, prefer low sugar, surprise me…"
            value={preferences.additionalNotes}
            onChange={(e) => setPreferences((p) => ({ ...p, additionalNotes: e.target.value }))}
            rows={4}
          />
          <button type="button" className="customer-btn-continue" onClick={() => setStep(9)}>
            Next
          </button>
        </div>
      </CustomerLayout>
    )
  }

  // Step 9: Done
  return (
    <CustomerLayout variant="minimal">
      <div className="onboarding-screen">
        <h2 className="onboarding-title">Your taste profile is ready</h2>
        {recommendationsError && (
          <>
            <p className="onboarding-error" role="alert">{recommendationsError}</p>
            <div className="onboarding-actions">
              <button type="button" className="customer-btn-continue" onClick={() => { setRecommendationsError(null); handleFinish(); }}>
                Retry
              </button>
              <button type="button" className="customer-btn-guest" onClick={saveProfileAndContinue}>
                Skip AI
              </button>
            </div>
          </>
        )}
        {!recommendationsError && (
          <button
            type="button"
            className="customer-btn-continue"
            onClick={handleFinish}
            disabled={isLoadingRecommendations}
          >
            {isLoadingRecommendations ? '…' : 'Finish — recommendations'}
          </button>
        )}
      </div>
    </CustomerLayout>
  )
}

export default CustomerOnboarding
