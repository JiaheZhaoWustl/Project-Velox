import React, { useState } from 'react'
import DragSlider from './DragSlider'

function TasteProfileSliderRow({ label, value, onChange, lowLabel, highLabel, info }) {
  const hasEndLabels = Boolean(lowLabel || highLabel)
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="taste-profile-slider-row">
      <div className="taste-profile-slider-label-row">
        <label>{label}</label>
        {info && (
          <button
            type="button"
            className="taste-profile-axis-info-btn"
            onClick={() => setShowInfo((v) => !v)}
            aria-label={`What does "${label}" mean?`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        )}
      </div>
      {showInfo && (
        <p className="taste-profile-axis-info-text">{info}</p>
      )}
      <div className="taste-profile-slider-wrap taste-profile">
        <DragSlider
          value={value}
          onChange={onChange}
          min={0}
          max={10}
          step={1}
          labels={
            hasEndLabels
              ? { low: lowLabel || '', high: highLabel || '' }
              : { low: 'Low', high: 'High' }
          }
        />
      </div>
      {hasEndLabels && (
        <div className="taste-profile-slider-end-labels">
          {lowLabel && <span>{lowLabel}</span>}
          {highLabel && <span>{highLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default TasteProfileSliderRow
