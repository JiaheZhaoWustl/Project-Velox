import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import coverImage from '../../assets/midj_cover.png'

const EXIT_DURATION_MS = 580
const EXIT_DURATION_REDUCED_MS = 80

function SplashScreen() {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)
  const navigatedRef = useRef(false)

  const handleContinue = useCallback(() => {
    if (exiting) return
    setExiting(true)

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ms = reduced ? EXIT_DURATION_REDUCED_MS : EXIT_DURATION_MS

    window.setTimeout(() => {
      if (navigatedRef.current) return
      navigatedRef.current = true
      navigate('/customer', { replace: true, state: { fromSplash: true } })
    }, ms)
  }, [exiting, navigate])

  return (
    <div className={`splash-screen${exiting ? ' splash-screen--exiting' : ''}`}>
      <div className="splash-screen__bg" aria-hidden="true">
        <img src={coverImage} alt="" className="splash-screen__img" />
      </div>
      <div className="splash-screen__scrim" aria-hidden="true" />
      <div className="splash-screen__content">
        <h1 className="splash-screen__title">PRoJECT VELoX</h1>
        <p className="splash-screen__description">
          a multi-modal cocktail experience ordering system powered by AI to translate your
          feeling into flavors.
        </p>
        <button
          type="button"
          className="splash-screen__cta"
          onClick={handleContinue}
        >
          Tap to continue
        </button>
      </div>
    </div>
  )
}

export default SplashScreen
