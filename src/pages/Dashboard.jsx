import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import InventorySnapshotChart from '../components/InventorySnapshotChart'

function Dashboard({ onLogout }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard')
        return res.json()
      })
      .then((result) => {
        if (!cancelled && result.success) setData(result)
        else if (!cancelled) setError(result.error || 'Failed to load dashboard')
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const overview = data?.overview || {}
  const recentActivity = data?.recentActivity || []
  const hasInventory = (overview.totalItems ?? 0) > 0

  const overviewStats = [
    {
      label: 'Stock value',
      value: typeof overview.totalStockValue === 'number'
        ? `$${overview.totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : '—',
      sub: `${overview.totalItems ?? 0} SKUs on hand`,
    },
    {
      label: 'Low stock',
      value: String(overview.lowStockCount ?? 0),
      sub: 'SKUs below par',
    },
    {
      label: 'Orders',
      value: String(overview.orderCount ?? 0),
      sub: overview.totalRevenue != null
        ? `$${Number(overview.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })} revenue`
        : '—',
    },
  ]

  return (
    <Layout onLogout={onLogout}>
      <div className="dashboard-page dashboard-page--hf">
        <header className="dashboard-head">
          <div className="dashboard-head__text">
            <p className="dashboard-eyebrow">Operations</p>
            <h1 className="dashboard-title dashboard-title--hf">Dashboard</h1>
            <p className="dashboard-subtitle">
              At-a-glance stock, inventory health, and recent movement from your venue data.
            </p>
          </div>
        </header>

        {error && (
          <div className="dashboard-error">
            {error} · Run <code>npm run server</code>
          </div>
        )}

        {loading && !error && <div className="dashboard-loading">Loading…</div>}

        {!loading && !error && (
          <>
            <section className="dashboard-kpi-strip" aria-label="Key metrics">
              <div className="overview-cards overview-cards--hf">
                {overviewStats.map((stat, index) => (
                  <div key={index} className="overview-card overview-card--hf">
                    <div className="overview-card-label">{stat.label}</div>
                    <div className="overview-card-value">{stat.value}</div>
                    <div className="overview-card-sub">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="dashboard-main-grid">
              <section className="dashboard-panel dashboard-panel--inventory">
                <div className="dashboard-panel__head">
                  <h2 className="section-title section-title--hf">Inventory snapshot</h2>
                  <p className="dashboard-section-lede">
                    Category mix (illustrative). Use it to spot balance across spirits, modifiers, and garnish.
                  </p>
                </div>
                <div className="inventory-snapshot-card">
                  <InventorySnapshotChart emptyInventory={!hasInventory} />
                  <div className="inventory-snapshot-meta">
                    {hasInventory ? (
                      <>
                        <p className="inventory-snapshot-meta__line">
                          <span className="inventory-snapshot-meta__label">Total SKUs</span>
                          <span className="inventory-snapshot-meta__value">{overview.totalItems}</span>
                        </p>
                        <p className="inventory-snapshot-meta__line">
                          <span className="inventory-snapshot-meta__label">Stock value</span>
                          <span className="inventory-snapshot-meta__value">
                            ${Number(overview.totalStockValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </p>
                        <p className="inventory-snapshot-meta__note">
                          Values above come from your uploads; chart bars are a placeholder until category analytics ship.
                        </p>
                      </>
                    ) : (
                      <div className="stock-chart-placeholder stock-chart-placeholder--inline">
                        <span>No inventory rows yet</span>
                        <p>Upload inventory to <code>userUploads</code> to populate SKUs and value.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="dashboard-panel dashboard-panel--activity">
                <div className="dashboard-panel__head">
                  <h2 className="section-title section-title--hf">Recent activity</h2>
                  <p className="dashboard-section-lede">Latest signals from sales and stock.</p>
                </div>
                <div className="activity-list activity-list--hf">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="activity-item activity-item--hf">
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-type">{activity.type}</span>
                        </div>
                        <div className="activity-footer">
                          <span className="activity-value">{activity.value}</span>
                          {activity.sub && <span className="activity-sub">{activity.sub}</span>}
                          {activity.trend === 'up' && (
                            <svg className="activity-arrow activity-arrow-up" width="16" height="16" viewBox="0 0 20 20" fill="none">
                              <path d="M10 0L15 5H12V20H8V5H5L10 0Z" stroke="currentColor" strokeWidth="2" fill="currentColor" />
                            </svg>
                          )}
                          {activity.trend === 'down' && (
                            <svg className="activity-arrow activity-arrow-down" width="16" height="16" viewBox="0 0 20 20" fill="none">
                              <path d="M10 20L5 15H8V0H12V15H15L10 20Z" stroke="currentColor" strokeWidth="2" fill="currentColor" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default Dashboard
