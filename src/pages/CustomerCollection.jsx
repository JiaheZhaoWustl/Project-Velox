import React, { useState, useEffect, useCallback } from 'react'
import CustomerLayout from '../components/CustomerLayout'
import { customerApi } from '../services/api'

function CustomerCollection() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await customerApi.getCollection()
      setItems(data.items || [])
    } catch (err) {
      setError(err.message || 'Could not load')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (id) => {
    try {
      await customerApi.removeCollectionItem(id)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch (err) {
      setError(err.message || 'Remove failed')
    }
  }

  return (
    <CustomerLayout>
      <div className="customer-collection-page">
        <h2 className="customer-page-title">Saved</h2>
        {loading && <p className="customer-page-muted">Loading…</p>}
        {error && (
          <p className="customer-page-error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="customer-page-placeholder">Nothing saved yet. Save a pick from Profile.</p>
        )}
        {!loading && items.length > 0 && (
          <ul className="customer-collection-list">
            {items.map((row) => (
              <li key={row.id} className="customer-collection-row">
                <div>
                  <span className="customer-collection-name">{row.name}</span>
                  {row.notes ? <span className="customer-collection-notes">{row.notes}</span> : null}
                  <span className="customer-collection-meta">
                    {row.savedAt ? new Date(row.savedAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <button type="button" className="customer-collection-remove" onClick={() => remove(row.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CustomerLayout>
  )
}

export default CustomerCollection
