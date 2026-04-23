import React, { useState, useEffect, useCallback } from 'react'
import CustomerLayout from '../components/CustomerLayout'
import { customerApi } from '../services/api'

function CustomerOrderHistory() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await customerApi.getOrders()
      setOrders(data.orders || [])
    } catch (err) {
      setError(err.message || 'Could not load')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addDemo = async () => {
    setDemoLoading(true)
    setError(null)
    try {
      const data = await customerApi.addDemoOrder()
      if (data.order) setOrders((prev) => [data.order, ...prev])
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setDemoLoading(false)
    }
  }

  const clearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    setClearing(true)
    setError(null)
    try {
      await customerApi.clearOrders()
      setOrders([])
      setConfirmClear(false)
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setClearing(false)
    }
  }

  return (
    <CustomerLayout>
      <div className="customer-order-history-page">
        <div className="customer-order-head">
          <h2 className="customer-page-title">Orders</h2>
          <p className="customer-page-muted customer-order-disclaimer">Demo data — not a live POS.</p>
          <div className="customer-order-actions">
            <button
              type="button"
              className="customer-order-demo-btn"
              onClick={addDemo}
              disabled={demoLoading || clearing}
            >
              {demoLoading ? '…' : 'Simulate order'}
            </button>
            <button
              type="button"
              className={`customer-order-clear-btn${confirmClear ? ' customer-order-clear-btn--confirm' : ''}`}
              onClick={clearAll}
              disabled={clearing || demoLoading || orders.length === 0}
            >
              {clearing ? '…' : confirmClear ? 'Confirm clear' : 'Clear all'}
            </button>
            {confirmClear && !clearing && (
              <button
                type="button"
                className="customer-order-cancel-btn"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {loading && <p className="customer-page-muted">Loading…</p>}
        {error && (
          <p className="customer-page-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && orders.length === 0 && (
          <p className="customer-page-placeholder">No orders yet. Simulate one above.</p>
        )}

        {!loading && orders.length > 0 && (
          <ul className="customer-order-list">
            {orders.map((o) => (
              <li key={o.id} className="customer-order-card">
                {o.imageUrl ? (
                  <div className="customer-order-card-media">
                    <img src={o.imageUrl} alt="" className="customer-order-card-img" />
                  </div>
                ) : (
                  <div
                    className="customer-order-card-media customer-order-card-media--placeholder"
                    role="img"
                    aria-label="Order image placeholder"
                  />
                )}
                <div className="customer-order-card-body">
                  <div className="customer-order-card-top">
                    <span className="customer-order-number">{o.orderNumber}</span>
                    <span className={`customer-order-status customer-order-status--${String(o.status || '').toLowerCase()}`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="customer-order-summary">{o.summary}</p>
                  <div className="customer-order-card-bottom">
                    <span className="customer-order-total">
                      ${Number(o.total || 0).toFixed(2)} {o.currency || 'USD'}
                    </span>
                    <span className="customer-order-date">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  {Array.isArray(o.items) && o.items.length > 0 && (
                    <ul className="customer-order-items">
                      {o.items.map((it, i) => (
                        <li key={i}>
                          {it.qty}× {it.name} — ${Number(it.price || 0).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CustomerLayout>
  )
}

export default CustomerOrderHistory
