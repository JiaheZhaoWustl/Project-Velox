import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { IconSearch, IconFilter } from '../components/Icons'

function IconExport() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function Sales({ onLogout }) {
  const [search, setSearch] = useState('')
  const [allItems, setAllItems] = useState([])
  const [availableColumns, setAvailableColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [salesFileUrl, setSalesFileUrl] = useState(null)
  const [salesLoading, setSalesLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterChannel, setFilterChannel] = useState('')
  const [filterBartender, setFilterBartender] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('')
  const [visibleColumns, setVisibleColumns] = useState(['Order ID', 'Date', 'Channel', 'Location', 'Bartender', 'Item', 'Category', 'Qty', 'Total', 'Payment Method'])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: '1',
      pageSize: '10000', // Load all items
      ...(search.trim() && { search: search.trim() }),
    })

    fetch(`/api/sales?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load sales')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (data.success) {
          // Load all items - no pagination
          setAllItems(data.items || [])
          // Set available columns
          if (data.columns && data.columns.length > 0) {
            setAvailableColumns(data.columns)
            // Set default visible columns on first load - include important columns
            const standardCols = ['Order ID', 'OrderID', 'Order Id']
            const dateCols = ['Date']
            const channelCols = ['Channel']
            const locationCols = ['Location']
            const bartenderCols = ['Bartender']
            const itemCols = ['Item Name', 'Item name', 'Item']
            const categoryCols = ['Category']
            const qtyCols = ['Qty', 'Quantity']
            const totalCols = ['Total', 'Net Sales', 'Gross Sales']
            const paymentCols = ['Payment Method', 'Payment']
            
            // Find important columns
            const orderIdCol = data.columns.find(c => standardCols.includes(c)) || data.columns[0]
            const dateCol = data.columns.find(c => dateCols.includes(c))
            const channelCol = data.columns.find(c => channelCols.includes(c))
            const locationCol = data.columns.find(c => locationCols.includes(c))
            const bartenderCol = data.columns.find(c => bartenderCols.includes(c))
            const itemCol = data.columns.find(c => itemCols.includes(c))
            const categoryCol = data.columns.find(c => categoryCols.includes(c))
            const qtyCol = data.columns.find(c => qtyCols.includes(c))
            const totalCol = data.columns.find(c => totalCols.includes(c))
            const paymentCol = data.columns.find(c => paymentCols.includes(c))
            
            // Build defaults array with important columns
            const defaults = [orderIdCol, dateCol, channelCol, locationCol, bartenderCol, itemCol, categoryCol, qtyCol, totalCol, paymentCol].filter(Boolean)
            
            // Only update if we're using the initial default values (first load)
            if (defaults.length > 0 && visibleColumns.length === 10 && visibleColumns[0] === 'Order ID') {
              setVisibleColumns(defaults)
            } else if (defaults.length > 0 && visibleColumns.length === 0) {
              // If no columns are visible yet, set defaults
              setVisibleColumns(defaults)
            }
          }
        } else {
          setError(data.error || 'Failed to load sales')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load sales')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [search])

  // Pre-fetch sales file URL for immediate opening
  useEffect(() => {
    let cancelled = false
    
    fetch('/api/sales/files')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.files && data.files.length > 0) {
          setSalesFileUrl(data.files[0].url)
        }
      })
      .catch(() => {
        // Silently fail - will show error when user clicks
      })
    
    return () => { cancelled = true }
  }, [])

  // Extract unique channels, bartenders, locations, and payment methods from items
  const channels = useMemo(() => {
    const chans = new Set()
    allItems.forEach((item) => {
      if (item.channel) {
        chans.add(item.channel)
      }
    })
    return Array.from(chans).sort()
  }, [allItems])

  const bartenders = useMemo(() => {
    const barts = new Set()
    allItems.forEach((item) => {
      if (item.bartender) {
        barts.add(item.bartender)
      }
    })
    return Array.from(barts).sort()
  }, [allItems])

  const locations = useMemo(() => {
    const locs = new Set()
    allItems.forEach((item) => {
      if (item.location) {
        locs.add(item.location)
      }
    })
    return Array.from(locs).sort()
  }, [allItems])

  const paymentMethods = useMemo(() => {
    const methods = new Set()
    allItems.forEach((item) => {
      if (item.paymentMethod) {
        methods.add(item.paymentMethod)
      }
    })
    return Array.from(methods).sort()
  }, [allItems])

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    let filtered = allItems
    
    // Apply search filter
    const q = search.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter(
        (i) =>
          (i.orderId && i.orderId.toLowerCase().includes(q)) ||
          (i.itemName && i.itemName.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q)) ||
          (i.location && i.location.toLowerCase().includes(q)) ||
          (i.paymentMethod && i.paymentMethod.toLowerCase().includes(q)) ||
          (i.bartender && i.bartender.toLowerCase().includes(q)) ||
          (i.channel && i.channel.toLowerCase().includes(q))
      )
    }
    
    // Apply channel filter
    if (filterChannel) {
      filtered = filtered.filter((i) => i.channel === filterChannel)
    }
    
    // Apply bartender filter
    if (filterBartender) {
      filtered = filtered.filter((i) => i.bartender === filterBartender)
    }
    
    // Apply location filter
    if (filterLocation) {
      filtered = filtered.filter((i) => i.location === filterLocation)
    }
    
    // Apply payment method filter
    if (filterPaymentMethod) {
      filtered = filtered.filter((i) => i.paymentMethod === filterPaymentMethod)
    }
    
    return filtered
  }, [search, allItems, filterChannel, filterBartender, filterLocation, filterPaymentMethod])

  const applyFilter = () => {
    setFilterOpen(false)
  }

  const clearFilter = () => {
    setFilterChannel('')
    setFilterBartender('')
    setFilterLocation('')
    setFilterPaymentMethod('')
    setFilterOpen(false)
  }

  const toggleColumn = (columnName) => {
    setVisibleColumns((prev) => {
      if (prev.includes(columnName)) {
        // Don't allow removing all columns
        if (prev.length === 1) return prev
        return prev.filter((c) => c !== columnName)
      } else {
        return [...prev, columnName]
      }
    })
  }

  const getColumnValue = (item, columnName) => {
    // Check standard fields first
    const standardCols = ['Order ID', 'OrderID', 'Order Id']
    const dateCols = ['Date']
    const channelCols = ['Channel']
    const locationCols = ['Location']
    const bartenderCols = ['Bartender']
    const itemCols = ['Item Name', 'Item name', 'Item']
    const categoryCols = ['Category']
    const qtyCols = ['Qty', 'Quantity']
    const totalCols = ['Total', 'Net Sales', 'Gross Sales']
    const paymentCols = ['Payment Method', 'Payment']
    
    if (standardCols.includes(columnName)) {
      return item.orderId || '—'
    }
    if (dateCols.includes(columnName)) {
      return item.date || '—'
    }
    if (channelCols.includes(columnName)) {
      return item.channel || '—'
    }
    if (locationCols.includes(columnName)) {
      return item.location || '—'
    }
    if (bartenderCols.includes(columnName)) {
      return item.bartender || '—'
    }
    if (itemCols.includes(columnName)) {
      return item.itemName || '—'
    }
    if (categoryCols.includes(columnName)) {
      return item.category || '—'
    }
    if (qtyCols.includes(columnName)) {
      return item.qty !== undefined ? item.qty : '—'
    }
    if (totalCols.includes(columnName)) {
      return item.total !== undefined ? `$${item.total.toFixed(2)}` : '—'
    }
    if (paymentCols.includes(columnName)) {
      return item.paymentMethod || '—'
    }
    
    // Check raw data
    if (item.rawData && item.rawData[columnName] !== undefined) {
      const val = item.rawData[columnName]
      if (val === null || val === '') return '—'
      
      // Format numeric values to 2 decimal places
      if (typeof val === 'number') {
        return val.toFixed(2)
      }
      
      // Try to parse string numbers
      const numVal = parseFloat(String(val))
      if (!isNaN(numVal) && isFinite(numVal)) {
        return numVal.toFixed(2)
      }
      
      return String(val)
    }
    return '—'
  }

  const handleViewSalesFile = () => {
    if (salesFileUrl) {
      // If we have the URL pre-fetched, open it immediately (works on iPad Safari)
      const link = document.createElement('a')
      link.href = salesFileUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // Fallback: fetch and open
      setSalesLoading(true)
      fetch('/api/sales/files')
        .then((res) => res.json())
        .then((data) => {
          setSalesLoading(false)
          if (data.success && data.files && data.files.length > 0) {
            const url = data.files[0].url
            setSalesFileUrl(url)
            const link = document.createElement('a')
            link.href = url
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          } else {
            alert('No sales files found. Please upload a file.')
          }
        })
        .catch((err) => {
          setSalesLoading(false)
          alert('Failed to load sales file. Make sure the backend is running: npm run server')
        })
    }
  }

  const handleExport = () => {
    // Create CSV from filtered items
    const headers = ['Order ID', 'Date', 'Channel', 'Location', 'Bartender', 'Item', 'Category', 'Qty', 'Unit Price', 'Total', 'Payment Method']
    const csvRows = [
      headers.join(','),
      ...filteredItems.map(item => [
        item.orderId || '',
        item.date || '',
        item.channel || '',
        item.location || '',
        item.bartender || '',
        item.itemName || '',
        item.category || '',
        item.qty || '',
        item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '',
        item.total ? `$${item.total.toFixed(2)}` : '',
        item.paymentMethod || ''
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ]
    
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sales-export-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Layout onLogout={onLogout}>
      <div className="sales-page">
        <div className="sales-page-head">
          <div className="sales-page-head-content">
            <div className="sales-page-head-row">
              <h1 className="sales-page-title">Sales</h1>
              <div className="sales-head-actions">
                <button 
                  type="button" 
                  className="btn-menu btn-menu--secondary"
                  onClick={handleViewSalesFile}
                  disabled={salesLoading}
                >
                  <span>{salesLoading ? 'Loading...' : 'View Sales File'}</span>
                </button>
                <button 
                  type="button" 
                  className="btn-menu btn-menu--primary"
                  onClick={handleExport}
                >
                  <IconExport />
                  <span>Export</span>
                </button>
              </div>
            </div>
            <p className="sales-page-subtitle">View and filter sales from the last 100 entries.</p>
          </div>
        </div>

        {loading && (
          <div className="sales-loading">Loading sales…</div>
        )}
        {error && (
          <div className="sales-error">
            {error}. Make sure the backend is running: <code>npm run server</code>
          </div>
        )}
        {!loading && !error && (
          <div className="sales-content-grid">
            <div className="sales-items-card">
              <div className="sales-items-card-bar">
                <div className="sales-search-wrap">
                  <span className="sales-search-icon">
                    <IconSearch />
                  </span>
                  <input
                    type="text"
                    className="sales-search-input"
                    placeholder="Search sales..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="sales-items-actions">
                  <span className="sales-item-count">
                    {filteredItems.length} {filteredItems.length === 1 ? 'entry' : 'entries'}
                  </span>
                  <div className="sales-filter-wrap">
                    <button
                      type="button"
                      className="btn-menu btn-menu--secondary"
                      onClick={() => setFilterOpen((o) => !o)}
                      aria-expanded={filterOpen}
                    >
                      <IconFilter />
                      <span>Filter</span>
                    </button>
                    {filterOpen && (
                      <div className="sales-filter-dropdown">
                        <div className="sales-filter-content">
                          <div className="sales-filter-section">
                            <h3 className="sales-filter-section-title">Filters</h3>
                            <div className="sales-filter-grid">
                              <div className="sales-filter-row">
                                <label htmlFor="sales-filter-channel">Channel</label>
                                <select
                                  id="sales-filter-channel"
                                  value={filterChannel}
                                  onChange={(e) => setFilterChannel(e.target.value)}
                                >
                                  <option value="">All</option>
                                  {channels.map((ch) => (
                                    <option key={ch} value={ch}>
                                      {ch}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="sales-filter-row">
                                <label htmlFor="sales-filter-bartender">Bartender</label>
                                <select
                                  id="sales-filter-bartender"
                                  value={filterBartender}
                                  onChange={(e) => setFilterBartender(e.target.value)}
                                >
                                  <option value="">All</option>
                                  {bartenders.map((bart) => (
                                    <option key={bart} value={bart}>
                                      {bart}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="sales-filter-row">
                                <label htmlFor="sales-filter-location">Location</label>
                                <select
                                  id="sales-filter-location"
                                  value={filterLocation}
                                  onChange={(e) => setFilterLocation(e.target.value)}
                                >
                                  <option value="">All</option>
                                  {locations.map((loc) => (
                                    <option key={loc} value={loc}>
                                      {loc}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="sales-filter-row">
                                <label htmlFor="sales-filter-payment">Payment Method</label>
                                <select
                                  id="sales-filter-payment"
                                  value={filterPaymentMethod}
                                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                                >
                                  <option value="">All</option>
                                  {paymentMethods.map((method) => (
                                    <option key={method} value={method}>
                                      {method}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          {availableColumns.length > 0 && (
                            <div className="sales-filter-section">
                              <h3 className="sales-filter-section-title">Display Columns</h3>
                              <div className="sales-column-checkboxes">
                                {availableColumns
                                  .filter((col) => {
                                    const colLower = col.toLowerCase()
                                    return !colLower.includes('unit price') && 
                                           !colLower.includes('tax') && 
                                           !colLower.includes('is first line') && 
                                           !colLower.includes('discount')
                                  })
                                  .map((col) => (
                                    <label key={col} className="sales-column-checkbox">
                                      <input
                                        type="checkbox"
                                        checked={visibleColumns.includes(col)}
                                        onChange={() => toggleColumn(col)}
                                      />
                                      <span>{col}</span>
                                    </label>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="sales-filter-actions">
                          <button type="button" className="btn-menu btn-menu--secondary" onClick={clearFilter}>
                            Clear Filters
                          </button>
                          <button type="button" className="btn-menu btn-menu--primary" onClick={applyFilter}>
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="sales-table-wrap">
                <table className="sales-table">
                  <thead>
                    <tr>
                      {visibleColumns.map((col) => (
                        <th key={col}>
                          {col.toUpperCase()}
                        </th>
                      ))}
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="sales-empty">
                          No sales found. Check filters or add a sales spreadsheet to userUploads.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={`${item.orderId}-${item.id || Math.random()}`}>
                          {visibleColumns.map((col) => {
                            const value = getColumnValue(item, col)
                            return (
                              <td key={col}>
                                <span>{value}</span>
                              </td>
                            )
                          })}
                          <td>
                            <div className="sales-cell-actions">
                              <button type="button" className="sales-action-btn" aria-label="View" title="View">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Sales
