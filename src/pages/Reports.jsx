import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'

function Reports({ onLogout }) {
  const [salesReport, setSalesReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch('/api/reports/sales')
      .then((r) => (r.ok ? r.json() : { success: false }))
      .then((salesRes) => {
        if (cancelled) return
        if (salesRes.success) setSalesReport(salesRes)
        else setSalesReport({ summary: {}, byChannel: [], byCategory: [], byBartender: [] })
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load reports')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const s = salesReport?.summary || {}

  return (
    <Layout onLogout={onLogout}>
      <div className="reports-page">
        <div className="reports-head">
          <div>
            <h1 className="reports-title">Reports</h1>
            <p className="reports-subtitle">Sales data analysis at a glance.</p>
          </div>
        </div>

        {error && (
          <div className="reports-error">
            {error}. Ensure the backend is running: <code>npm run server</code>
          </div>
        )}

        {loading && !error && <div className="reports-loading">Loading reports…</div>}

        {!loading && !error && (
          <>
            {/* Sales report */}
            <section className="report-section">
              <h2 className="report-section-title">Sales report</h2>
              <p className="report-section-desc">
                Based on the first 100 sales entries from your upload. Data from: <strong>{salesReport.sourceFile}</strong>
              </p>
              <div className="report-kpis report-kpis--sales">
                <div className="report-kpi">
                  <span className="report-kpi-label">Total revenue</span>
                  <span className="report-kpi-value">${(s.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="report-kpi">
                  <span className="report-kpi-label">Orders</span>
                  <span className="report-kpi-value">{(s.orderCount || 0).toLocaleString()}</span>
                </div>
                <div className="report-kpi">
                  <span className="report-kpi-label">Avg. order value</span>
                  <span className="report-kpi-value">${(s.avgOrderValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="report-kpi">
                  <span className="report-kpi-label">Line items</span>
                  <span className="report-kpi-value">{(s.lineItemCount || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="report-tables-row">
                <div className="report-table-card">
                  <h3 className="report-table-title">By channel</h3>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Channel</th>
                          <th>Revenue</th>
                          <th>Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(salesReport?.byChannel || []).slice(0, 8).map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.channel}</td>
                            <td>${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td>{row.orders}</td>
                          </tr>
                        ))}
                        {(!salesReport?.byChannel || salesReport.byChannel.length === 0) && (
                          <tr><td colSpan={3} className="report-table-empty">No data</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="report-table-card">
                  <h3 className="report-table-title">By category</h3>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Revenue</th>
                          <th>Qty sold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(salesReport?.byCategory || []).slice(0, 8).map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.category}</td>
                            <td>${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td>{row.qty}</td>
                          </tr>
                        ))}
                        {(!salesReport?.byCategory || salesReport.byCategory.length === 0) && (
                          <tr><td colSpan={3} className="report-table-empty">No data</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="report-table-card report-table-card--wide">
                <h3 className="report-table-title">Top bartenders (by revenue)</h3>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Bartender</th>
                        <th>Revenue</th>
                        <th>Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(salesReport?.byBartender || []).slice(0, 10).map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.bartender}</td>
                          <td>${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td>{row.orders}</td>
                        </tr>
                      ))}
                      {(!salesReport?.byBartender || salesReport.byBartender.length === 0) && (
                        <tr><td colSpan={3} className="report-table-empty">No data</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}

export default Reports
