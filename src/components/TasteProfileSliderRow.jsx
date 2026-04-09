import React from 'react'
import DragSlider from './DragSlider'

/**
 * Label + DragSlider row for taste profile forms (Synesthesia-style spacing via parent CSS).
 */
function TasteProfileSliderRow({ label, value, onChange, lowLabel, highLabel }) {
  const hasEndLabels = Boolean(lowLabel || highLabel)

  return (
    <div className="taste-profile-slider-row">
      <label>{label}</label>
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
