import React, { forwardRef } from 'react'

const CARD_WIDTH = 600
const CARD_HEIGHT = 900

const CocktailPrintCard = forwardRef(function CocktailPrintCard(
  {
    name,
    imageUrl,
    quote,
    ingredientsLine,
    titleFontSize,
    titleLetterSpacing,
    quoteFontSize,
    quoteLetterSpacing,
    ingredientsFontSize,
  },
  ref
) {
  return (
    <div
      ref={ref}
      className="print-card-export-shell"
    >
      <div
        className="print-card"
        style={{ width: CARD_WIDTH, minHeight: CARD_HEIGHT }}
      >
        <h1
          className="print-card-title"
          style={{
            ...(titleFontSize ? { fontSize: `${titleFontSize}px` } : {}),
            ...(titleLetterSpacing != null ? { letterSpacing: `${titleLetterSpacing}em` } : {}),
          }}
        >
          {name}
        </h1>
        <div className="print-card-image-wrap">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="print-card-image"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="print-card-image print-card-image--placeholder" aria-hidden="true" />
          )}
        </div>
        <p
          className="print-card-quote"
          style={{
            ...(quoteFontSize ? { fontSize: `${quoteFontSize}px` } : {}),
            ...(quoteLetterSpacing != null ? { letterSpacing: `${quoteLetterSpacing}em` } : {}),
          }}
        >
          {quote}
        </p>
        <p className="print-card-ingredients" style={ingredientsFontSize ? { fontSize: `${ingredientsFontSize}px` } : undefined}>{ingredientsLine}</p>
      </div>
    </div>
  )
})

export default CocktailPrintCard
