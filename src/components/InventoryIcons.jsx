import React from 'react'

// Bottle icon for liquor/alcohol items
export function IconBottle() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2h8v4H8z" />
      <path d="M7 6h10v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6z" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}

// Box icon for packaged items
export function IconBox() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

// Can icon for canned items
export function IconCan() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="8" y="2" width="8" height="18" rx="1" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="18" x2="16" y2="18" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  )
}

// Jar icon for jarred items
export function IconJar() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2h4v3h-4z" />
      <path d="M8 5h8v15a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V5z" />
      <line x1="10" y1="9" x2="14" y2="9" />
      <line x1="10" y1="13" x2="14" y2="13" />
    </svg>
  )
}

// Package icon for general items
export function IconPackage() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="13" rx="1" />
      <path d="M3 8l9-5 9 5" />
      <line x1="12" y1="3" x2="12" y2="8" />
    </svg>
  )
}

// Default icon for items without specific type
export function IconInventoryDefault() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  )
}

// Get icon component based on item category or name
export function getInventoryIcon(item) {
  const category = (item.category || '').toLowerCase()
  const name = (item.name || '').toLowerCase()
  
  // Check category first
  if (category.includes('vodka') || category.includes('whiskey') || category.includes('whisky') || 
      category.includes('rum') || category.includes('gin') || category.includes('tequila') ||
      category.includes('bourbon') || category.includes('scotch') || category.includes('brandy') ||
      category.includes('mezcal') || category.includes('cognac')) {
    return IconBottle
  }
  
  // Check name for alcohol-related keywords
  if (name.includes('vodka') || name.includes('whiskey') || name.includes('whisky') ||
      name.includes('rum') || name.includes('gin') || name.includes('tequila') ||
      name.includes('bourbon') || name.includes('scotch') || name.includes('brandy') ||
      name.includes('mezcal') || name.includes('cognac') || name.includes('liquor')) {
    return IconBottle
  }
  
  // Check for other item types
  if (category.includes('can') || name.includes('can')) {
    return IconCan
  }
  
  if (category.includes('jar') || name.includes('jar')) {
    return IconJar
  }
  
  if (category.includes('box') || name.includes('box') || category.includes('package')) {
    return IconBox
  }
  
  // Default icon
  return IconInventoryDefault
}
