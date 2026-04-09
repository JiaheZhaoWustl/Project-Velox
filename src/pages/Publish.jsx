import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const PUBLISH_STAGES = [
  { id: 'inventory', label: 'Inventory', path: '/inventory', syncedAt: 'Jan 20 at 10:39 AM', complete: true },
  { id: 'menu', label: 'Menu', path: '/menu', syncedAt: 'Jan 20 at 10:39 AM', complete: true },
  { id: 'pos', label: 'POS – Toast', path: null, syncedAt: 'Jan 20 at 10:39 AM', complete: true },
]

function Publish({ onLogout }) {
  const [launching, setLaunching] = useState(false)
  const navigate = useNavigate()

  const handleLaunch = () => {
    setLaunching(true)
    setTimeout(() => {
      setLaunching(false)
      navigate('/customer')
    }, 1200)
  }

  return (
    <Layout onLogout={onLogout}>
      <div className="publish-page">
        <div className="publish-head">
          <h1 className="publish-title">Publish</h1>
          <p className="publish-subtitle">Sync and launch your bar system. All branches must be synced before deploy.</p>
        </div>

        <div className="publish-content">
          <div className="publish-tree-section">
            <h3 className="publish-tree-title">Sync status</h3>
            <div className="publish-tree-wrap">
              {/* GitHub-inspired branch/tree diagram */}
              <svg className="publish-tree-svg" viewBox="0 0 280 260" preserveAspectRatio="xMidYMid meet">
                {/* Main trunk */}
                <path d="M 140 24 L 140 200" fill="none" stroke="var(--hf-border)" strokeWidth="2" strokeDasharray="5 3" />
                {/* Branch: Inventory (left) */}
                <path d="M 140 50 Q 90 50 60 70 L 60 85" fill="none" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="60" cy="92" r="14" fill="#3b82f6" stroke="#fff" strokeWidth="2.5" />
                <path d="M 54 92 L 58 96 L 66 88" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Branch: Menu (center) */}
                <circle cx="140" cy="115" r="14" fill="#3b82f6" stroke="#fff" strokeWidth="2.5" />
                <path d="M 134 115 L 138 119 L 146 111" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Branch: POS (right) */}
                <path d="M 140 140 Q 190 140 220 160 L 220 175" fill="none" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="220" cy="182" r="14" fill="#3b82f6" stroke="#fff" strokeWidth="2.5" />
                <path d="M 214 182 L 218 186 L 226 178" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Merge node */}
                <circle cx="140" cy="170" r="8" fill="#22c55e" stroke="#fff" strokeWidth="2" />
                {/* Launch node */}
                <rect x="100" y="215" width="80" height="32" rx="6" fill="#111827" />
                <text x="140" y="235" textAnchor="middle" fill="#fff" fontSize="12" fontFamily="Poppins, sans-serif" fontWeight="600">Launch</text>
              </svg>
              <div className="publish-tree-legend">
                <span className="publish-tree-legend-item"><span className="publish-tree-dot publish-tree-dot--inventory" />Inventory</span>
                <span className="publish-tree-legend-item"><span className="publish-tree-dot publish-tree-dot--menu" />Menu</span>
                <span className="publish-tree-legend-item"><span className="publish-tree-dot publish-tree-dot--pos" />POS – Toast</span>
              </div>
            </div>
          </div>

          <div className="publish-checklist-section">
            <h3 className="publish-checklist-title">Ready to deploy</h3>
            <div className="publish-checklist">
              {PUBLISH_STAGES.map((stage) => (
                <div key={stage.id} className="publish-checklist-item">
                  <div className={`publish-checklist-checkbox ${stage.complete ? 'complete' : ''}`}>
                    {stage.complete && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="publish-checklist-body">
                    {stage.path ? (
                      <Link to={stage.path} className="publish-checklist-label">
                        {stage.label}
                      </Link>
                    ) : (
                      <span className="publish-checklist-label">{stage.label}</span>
                    )}
                    <span className="publish-checklist-time">{stage.syncedAt}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="publish-launch-btn"
              onClick={handleLaunch}
              disabled={launching}
            >
              {launching ? (
                <>
                  <span className="publish-launch-spinner" />
                  Launching…
                </>
              ) : (
                'Launch bar system'
              )}
            </button>

            <p className="publish-disclaimer">
              Ensure all items are synced with POS before launching customer-facing menu.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Publish
