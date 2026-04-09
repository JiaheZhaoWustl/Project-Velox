import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  IconDashboard,
  IconSales,
  IconInventory,
  IconMenu,
  IconReports,
  IconPublish,
  IconSettings,
  IconSearch,
  IconBell,
} from './Icons'

const FAKE_NOTIFICATIONS = [
  { id: 1, title: 'Low stock', message: 'Mezcal — 3 left.', time: '2m', unread: true },
  { id: 2, title: 'New order', message: '#4821 · $42.50', time: '15m', unread: true },
  { id: 3, title: 'Menu', message: 'Escape Route live.', time: '1h', unread: false },
]

function Layout({ children, onLogout }) {
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const profileRef = useRef(null)
  const notificationsRef = useRef(null)

  const isActive = (path) => location.pathname === path
  const unreadCount = FAKE_NOTIFICATIONS.filter((n) => n.unread).length

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
    { path: '/orders', label: 'Sales', Icon: IconSales },
    { path: '/inventory', label: 'Inventory', Icon: IconInventory },
    { path: '/menu', label: 'Menu', Icon: IconMenu },
    { path: '/reports', label: 'Reports', Icon: IconReports },
    { path: '/publish', label: 'Publish', Icon: IconPublish },
  ]

  return (
    <div className="main-screen main-screen--hf">
      <aside className="app-sidebar app-sidebar--hf">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="sidebar-brand-text">Project Velox</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ path, label, Icon }) => (
            <Link
              key={path}
              to={path}
              className={`sidebar-link sidebar-link--hf ${isActive(path) ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon">
                <Icon />
              </span>
              <span className="sidebar-link-label">{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header app-header--hf">
          <div className="header-search-wrap">
            <span className="header-search-icon">
              <IconSearch />
            </span>
            <input
              type="text"
              className="search-input search-input--hf"
              placeholder="Search…"
            />
          </div>
          <div className="header-actions">
            <div className="header-notifications-wrap" ref={notificationsRef}>
              <button
                type="button"
                className="header-action-btn header-action-btn--bell"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                aria-haspopup="true"
                onClick={() => setNotificationsOpen((o) => !o)}
              >
                <IconBell />
                {unreadCount > 0 && (
                  <span className="header-badge" aria-hidden>{unreadCount}</span>
                )}
              </button>
              {notificationsOpen && (
                <div className="header-notifications-dropdown">
                  <div className="header-notifications-header">
                    <span className="header-notifications-title">Notifications</span>
                  </div>
                  <div className="header-notifications-list">
                    {FAKE_NOTIFICATIONS.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`header-notification-item ${n.unread ? 'unread' : ''}`}
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <span className="header-notification-title">{n.title}</span>
                        <span className="header-notification-message">{n.message}</span>
                        <span className="header-notification-time">{n.time}</span>
                      </button>
                    ))}
                  </div>
                  <div className="header-notifications-footer">
                    <span className="header-notifications-placeholder">View all</span>
                  </div>
                </div>
              )}
            </div>
            <div className="profile-dropdown-wrap" ref={profileRef}>
              <button
                type="button"
                className="header-avatar header-avatar--btn"
                onClick={() => setProfileOpen((o) => !o)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
                aria-label="Account menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <span className="profile-dropdown-label">Account</span>
                  </div>
                  <Link
                    to="/settings"
                    className="profile-dropdown-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <IconSettings />
                    <span>Settings</span>
                  </Link>
                  {onLogout && (
                    <button
                      type="button"
                      className="profile-dropdown-item profile-dropdown-item--logout"
                      onClick={() => {
                        setProfileOpen(false)
                        onLogout()
                      }}
                    >
                      <span>Log out</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="app-content app-content--hf">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Layout
