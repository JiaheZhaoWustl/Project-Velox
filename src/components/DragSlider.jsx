import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react'

/**
 * Draggable value slider using explicit pointer/mouse/touch listeners (window-level move/end).
 * Matches the classic pressed + clientX pattern for reliable dragging inside scrollable parents.
 */
function DragSlider({ value, onChange, min = 0, max = 10, step = 1, labels, className = '' }) {
  const trackRef = useRef(null)
  const pressedRef = useRef(false)
  const removeWindowListenersRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const [isDragging, setIsDragging] = useState(false)
  const [liveValue, setLiveValue] = useState(value)

  const displayValue = isDragging ? liveValue : value

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!isDragging) setLiveValue(value)
  }, [value, isDragging])

  useEffect(
    () => () => {
      removeWindowListenersRef.current?.()
      removeWindowListenersRef.current = null
      pressedRef.current = false
    },
    []
  )

  const valueToPercent = (v) => ((v - min) / (max - min)) * 100

  const valueFromClientX = useCallback(
    (clientX) => {
      const track = trackRef.current
      if (!track) return min
      const rect = track.getBoundingClientRect()
      if (rect.width <= 0) return min
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      let v = min + (pct / 100) * (max - min)
      if (step > 0) v = Math.round(v / step) * step
      return Math.max(min, Math.min(max, Math.round(v)))
    },
    [min, max, step]
  )

  const applyClientX = useCallback(
    (clientX) => {
      const v = valueFromClientX(clientX)
      setLiveValue(v)
      onChangeRef.current(v)
    },
    [valueFromClientX]
  )

  const getClientX = (e) => {
    if (e.touches && e.touches.length > 0) return e.touches[0].clientX
    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX
    return e.clientX
  }

  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return

    const usePointer = typeof window !== 'undefined' && typeof window.PointerEvent !== 'undefined'

    const onDown = (e) => {
      if (e.type === 'mousedown' && e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()

      removeWindowListenersRef.current?.()
      pressedRef.current = true
      setIsDragging(true)
      applyClientX(getClientX(e))

      const onMove = (ev) => {
        if (!pressedRef.current) return
        if (ev.cancelable) ev.preventDefault()
        applyClientX(getClientX(ev))
      }

      const onUp = () => {
        pressedRef.current = false
        setIsDragging(false)
        if (usePointer) {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          window.removeEventListener('pointercancel', onUp)
        } else {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
          window.removeEventListener('touchmove', onMove)
          window.removeEventListener('touchend', onUp)
          window.removeEventListener('touchcancel', onUp)
        }
        removeWindowListenersRef.current = null
      }

      if (usePointer) {
        window.addEventListener('pointermove', onMove, { passive: false })
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
      } else {
        window.addEventListener('mousemove', onMove, { passive: false })
        window.addEventListener('mouseup', onUp)
        window.addEventListener('touchmove', onMove, { passive: false })
        window.addEventListener('touchend', onUp)
        window.addEventListener('touchcancel', onUp)
      }

      removeWindowListenersRef.current = onUp
    }

    if (usePointer) {
      el.addEventListener('pointerdown', onDown, { passive: false })
    } else {
      el.addEventListener('mousedown', onDown, { passive: false })
      el.addEventListener('touchstart', onDown, { passive: false })
    }

    return () => {
      if (usePointer) {
        el.removeEventListener('pointerdown', onDown)
      } else {
        el.removeEventListener('mousedown', onDown)
        el.removeEventListener('touchstart', onDown)
      }
      removeWindowListenersRef.current?.()
      removeWindowListenersRef.current = null
    }
  }, [applyClientX])

  const percent = valueToPercent(displayValue)

  return (
    <div className={`drag-slider-wrap ${className}`}>
      <div
        ref={trackRef}
        className={`drag-slider-track${isDragging ? ' drag-slider-track--dragging' : ''}`}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={displayValue}
        tabIndex={0}
        onKeyDown={(e) => {
          const delta =
            e.key === 'ArrowRight' || e.key === 'ArrowUp'
              ? step
              : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
                ? -step
                : 0
          if (delta) {
            e.preventDefault()
            onChange(Math.max(min, Math.min(max, displayValue + delta)))
          }
        }}
      >
        <div className="drag-slider-fill" style={{ width: `${percent}%` }} />
        <div className="drag-slider-thumb" style={{ left: `${percent}%` }} />
      </div>
      {labels && (
        <div className="drag-slider-labels">
          <span>{labels.low}</span>
          <span>{Math.round(displayValue)}/10</span>
          <span>{labels.high}</span>
        </div>
      )}
    </div>
  )
}

export default DragSlider
