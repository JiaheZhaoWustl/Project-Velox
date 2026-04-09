import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clearCustomerSession } from '../utils/customerSession'

const CUSTOMER_NAV = [
  { path: '/customer/menu', label: 'Menu' },
  { path: '/customer/taste-profile', label: 'Profile' },
  { path: '/customer/collection', label: 'Saved' },
  { path: '/customer/order-history', label: 'Orders' },
]

function CustomerLayout({ children, variant = 'full' }) {
  const location = useLocation()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    clearCustomerSession()
    window.location.href = '/customer'
  }

  if (variant === 'minimal') {
    return (
      <div className="customer-layout">
        <header className="customer-header">
          <Link to="/customer" className="customer-brand">
            <span>Project Velox</span>
          </Link>
        </header>
        <main className="customer-main">{children}</main>
      </div>
    )
  }

  return (
    <div className="customer-layout">
      <header className="customer-header customer-header--nav">
        <div className="customer-header-left">
          <Link to="/customer/taste-profile" className="customer-brand">
            <span className="customer-brand-text">Project Velox</span>
          </Link>
          <nav className="customer-nav">
            {CUSTOMER_NAV.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`customer-nav-link ${isActive(path) ? 'active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="customer-header-right">
          <div className="customer-lang-wrap" ref={langRef}>
            <button
              type="button"
              className="customer-lang-btn"
              onClick={() => setLangOpen((o) => !o)}
              aria-expanded={langOpen}
            >
              English
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5l3 3 3-3" />
              </svg>
            </button>
            {langOpen && (
              <div className="customer-lang-dropdown">
                <button type="button" className="customer-lang-option" onClick={() => setLangOpen(false)}>English</button>
                <button type="button" className="customer-lang-option" onClick={() => setLangOpen(false)}>Español</button>
                <button type="button" className="customer-lang-option" onClick={() => setLangOpen(false)}>中文</button>
              </div>
            )}
          </div>
          <button type="button" className="customer-logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="customer-main">
        {children}
      </main>
    </div>
  )
}

export default CustomerLayout
