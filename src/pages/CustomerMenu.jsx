import React, { useState, useEffect, useCallback } from 'react'
import CustomerLayout from '../components/CustomerLayout'
import { menuApi, customerApi } from '../services/api'

function CustomerMenu() {
  const [sections, setSections] = useState([])
  const [items, setItems] = useState([])
  const [activeSection, setActiveSection] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedItem, setSelectedItem] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderMsg, setOrderMsg] = useState(null)

  const closeModal = useCallback(() => {
    setSelectedItem(null)
    setDetail(null)
    setDetailError(null)
    setOrderMsg(null)
    setDetailLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    menuApi
      .getItems()
      .then((data) => {
        if (!cancelled && data.success) {
          const secs = data.sections || []
          const itms = data.items || []
          setSections(secs)
          setItems(itms)
          if (secs.length > 0 && !activeSection) {
            setActiveSection(secs[0])
          }
        } else if (!cancelled) {
          setError(data.error || 'Failed to load menu')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load menu. Make sure the backend is running.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedItem) return undefined

    let cancelled = false
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)

    menuApi
      .getItemDetail({
        name: selectedItem.name,
        description: selectedItem.description || '',
        price: typeof selectedItem.price === 'number' ? selectedItem.price : null,
        section: selectedItem.section || '',
      })
      .then((data) => {
        if (!cancelled && data.detail) setDetail(data.detail)
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err.message || 'Could not load description')
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedItem])

  useEffect(() => {
    if (!selectedItem) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [selectedItem, closeModal])

  const handleOrder = async () => {
    if (!selectedItem) return
    setOrderMsg(null)
    setOrderLoading(true)
    try {
      const price = typeof selectedItem.price === 'number' ? selectedItem.price : 0
      await customerApi.placeOrder({
        name: selectedItem.name,
        price,
        section: selectedItem.section || '',
      })
      setTimeout(() => closeModal(), 1400)
    } catch (e) {
      setOrderMsg(e.message || 'Could not place order')
    } finally {
      setOrderLoading(false)
    }
  }

  const activeItems = items.filter((i) => i.section === activeSection && i.status === 'active')

  return (
    <CustomerLayout>
      <div className="customer-menu-page">
        {loading && <div className="customer-menu-loading">Loading…</div>}
        {error && <div className="customer-menu-error">{error}</div>}
        {!loading && !error && sections.length > 0 && (
          <>
            <div className="customer-menu-tabs">
              {sections.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`customer-menu-tab ${activeSection === sec ? 'active' : ''}`}
                  onClick={() => setActiveSection(sec)}
                >
                  {sec}
                </button>
              ))}
            </div>
            <div className="customer-menu-grid">
              {activeItems.length > 0 ? (
                activeItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="customer-menu-card customer-menu-card--clickable"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="customer-menu-card-header">
                      <span className="customer-menu-card-name">{item.name}</span>
                      <span className="customer-menu-card-price">${item.price?.toFixed(2) || '0.00'}</span>
                    </div>
                    {item.description && (
                      <p className="customer-menu-card-desc">{item.description}</p>
                    )}
                    {item.happyHour && (
                      <span className="customer-menu-badge">Happy Hour</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="customer-menu-empty">Nothing here.</div>
              )}
            </div>
          </>
        )}
        {!loading && !error && sections.length === 0 && (
          <div className="customer-menu-empty">Menu unavailable.</div>
        )}

        {selectedItem && (
          <div
            className="customer-menu-modal-backdrop"
            onClick={closeModal}
            role="presentation"
          >
            <div
              className="customer-menu-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="customer-menu-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedItem.imageUrl ? (
                <div className="customer-menu-modal-hero">
                  <img src={selectedItem.imageUrl} alt="" className="customer-menu-modal-hero-img" />
                </div>
              ) : (
                <div
                  className="customer-menu-modal-hero customer-menu-modal-hero--placeholder"
                  role="img"
                  aria-label="Drink image placeholder"
                />
              )}
              <div className="customer-menu-modal-content">
                <div className="customer-menu-modal-top">
                  <div>
                    <h2 id="customer-menu-modal-title" className="customer-menu-modal-title">
                      {selectedItem.name}
                    </h2>
                    {selectedItem.section && (
                      <p className="customer-menu-modal-section">{selectedItem.section}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="customer-menu-modal-close"
                    onClick={closeModal}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <p className="customer-menu-modal-price">
                  ${typeof selectedItem.price === 'number' ? selectedItem.price.toFixed(2) : '0.00'}
                </p>

              {selectedItem.description && (
                <div className="customer-menu-modal-block">
                  <p className="customer-menu-modal-label">From the menu</p>
                  <p className="customer-menu-modal-menu-desc">{selectedItem.description}</p>
                </div>
              )}

              {detailLoading && (
                <p className="customer-menu-modal-gpt-loading">Generating tasting notes…</p>
              )}
              {detailError && !detailLoading && (
                <p className="customer-menu-modal-gpt-error" role="alert">
                  {detailError}
                </p>
              )}

              {detail && !detailLoading && (
                <div className="customer-menu-modal-gpt">
                  {detail.subtitle && (
                    <p className="customer-menu-modal-subtitle">{detail.subtitle}</p>
                  )}
                  {detail.highlights?.length > 0 && (
                    <ul className="customer-menu-modal-highlights">
                      {detail.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                  {detail.tasting_notes && (
                    <p className="customer-menu-modal-notes">{detail.tasting_notes}</p>
                  )}
                  {detail.pairing && (
                    <p className="customer-menu-modal-pairing">
                      <span className="customer-menu-modal-label">Pairs well with</span> {detail.pairing}
                    </p>
                  )}
                </div>
              )}

              <div className="customer-menu-modal-actions">
                <button
                  type="button"
                  className="customer-menu-modal-order-btn"
                  onClick={handleOrder}
                  disabled={orderLoading}
                >
                  {orderLoading ? 'Placing…' : 'Order'}
                </button>
                {orderMsg && <p className="customer-menu-modal-order-msg">{orderMsg}</p>}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}

export default CustomerMenu
