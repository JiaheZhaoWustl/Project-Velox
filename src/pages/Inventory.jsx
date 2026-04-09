import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { IconSearch, IconFilter, IconUpload } from '../components/Icons'
import UploadModal from '../components/UploadModal'
import { getInventoryIcon } from '../components/InventoryIcons'

function Inventory({ onLogout }) {
  const [search, setSearch] = useState('')
  const [allItems, setAllItems] = useState([])
  const [availableColumns, setAvailableColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [inventoryFileUrl, setInventoryFileUrl] = useState(null)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterQuantity, setFilterQuantity] = useState('')
  const [visibleColumns, setVisibleColumns] = useState([
    'Ingredient', 'Category', 'Unit Price', 'Vendor', 'On Hand (pkgs)', 'Par (pkgs)'])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: '1',
      pageSize: '10000', // Load all items
      ...(search.trim() && { search: search.trim() }),
    })

    fetch(`/api/inventory?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load inventory')
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
            const standardCols = ['Ingredient', 'Item Name', 'Item name', 'Item', 'Product', 'Name', 'Ingredient Name']
            const categoryCols = ['Category', 'Type', 'Category/Type', 'Liquor Type', 'Ingredient Type', 'Group']
            const qtyCols = ['Quantity', 'Qty', 'Stock', 'Units', 'In Stock', 'Available', 'Amount']
            const priceCols = ['Unit Price', 'Price', 'Unit Price ($)', 'Cost', 'Unit Cost', 'Price per Unit', 'Cost per Unit']
            const supplierCols = ['Supplier', 'Vendor', 'Distributor', 'Source']
            const skuCols = ['SKU', 'Item Code', 'Product Code', 'Item ID']
            const parCols = ['Par Level', 'Par', 'Min Stock', 'Minimum', 'Reorder Point', 'Min Qty']
            
            // Find important columns
            const nameCol = data.columns.find(c => standardCols.includes(c)) || data.columns[0]
            const catCol = data.columns.find(c => categoryCols.includes(c))
            const qtyCol = data.columns.find(c => qtyCols.includes(c))
            const priceCol = data.columns.find(c => priceCols.includes(c))
            const supplierCol = data.columns.find(c => supplierCols.includes(c))
            const skuCol = data.columns.find(c => skuCols.includes(c))
            const parCol = data.columns.find(c => parCols.includes(c))
            
            // Build defaults: name, category, quantity, price, then supplier/SKU/par if available
            const defaults = [nameCol, catCol, qtyCol, priceCol, supplierCol, skuCol, parCol].filter(Boolean)
            
            // Only update if we're using the initial default values (first load)
            if (defaults.length > 0 && visibleColumns.length <= 5 && (visibleColumns[0] === 'Item Name' || visibleColumns[0] === 'Ingredient')) {
              setVisibleColumns(defaults)
            } else if (defaults.length > 0 && visibleColumns.length === 0) {
              // If no columns are visible yet, set defaults
              setVisibleColumns(defaults)
            }
          }
        } else {
          setError(data.error || 'Failed to load inventory')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load inventory')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [search])

  // Pre-fetch inventory file URL for immediate opening
  useEffect(() => {
    let cancelled = false
    
    fetch('/api/inventory/files')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.files && data.files.length > 0) {
          setInventoryFileUrl(data.files[0].url)
        }
      })
      .catch(() => {
        // Silently fail - will show error when user clicks
      })
    
    return () => { cancelled = true }
  }, [])

  // Extract unique categories from items
  const categories = useMemo(() => {
    const cats = new Set()
    allItems.forEach((item) => {
      if (item.category) {
        cats.add(item.category)
      }
    })
    return Array.from(cats).sort()
  }, [allItems])

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    let filtered = allItems
    
    // Apply search filter - search across all columns
    const q = search.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((i) => {
        // Search in standard fields
        if ((i.name && i.name.toLowerCase().includes(q)) ||
            (i.category && i.category.toLowerCase().includes(q))) {
          return true
        }
        // Search in all raw data columns
        if (i.rawData) {
          return Object.values(i.rawData).some((val) => {
            const strVal = String(val).toLowerCase()
            return strVal.includes(q)
          })
        }
        return false
      })
    }
    
    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter((i) => i.category === filterCategory)
    }
    
    // Apply quantity filter - prioritize important stock statuses
    if (filterQuantity) {
      if (filterQuantity === 'low') {
        // Low stock but not completely out
        filtered = filtered.filter(
          (i) => i.quantity !== undefined && i.quantity > 0 && i.quantity < 10
        )
      } else if (filterQuantity === 'out') {
        filtered = filtered.filter((i) => i.quantity !== undefined && i.quantity === 0)
      } else if (filterQuantity === 'in-stock') {
        filtered = filtered.filter((i) => i.quantity !== undefined && i.quantity > 0)
      } else if (filterQuantity === 'medium') {
        filtered = filtered.filter(
          (i) => i.quantity !== undefined && i.quantity >= 10 && i.quantity < 30
        )
      } else if (filterQuantity === 'good') {
        filtered = filtered.filter(
          (i) => i.quantity !== undefined && i.quantity >= 30
        )
      }
    }
    
    return filtered
  }, [search, allItems, filterCategory, filterQuantity])

  const applyFilter = () => {
    setFilterOpen(false)
  }

  const clearFilter = () => {
    setFilterCategory('')
    setFilterQuantity('')
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
    // Check standard fields first - prioritize ingredient column names
    if (columnName === 'Ingredient' || columnName === 'Ingredient Name' || columnName === 'Item Name' || columnName === 'Item name' || columnName === 'Item' || columnName === 'Product' || columnName === 'Name') {
      return item.name || '—'
    }
    if (columnName === 'Category' || columnName === 'Type' || columnName === 'Category/Type' || columnName === 'Liquor Type' || columnName === 'Ingredient Type' || columnName === 'Group') {
      return item.category || '—'
    }
    if (columnName === 'Quantity' || columnName === 'Qty' || columnName === 'Stock' || columnName === 'Units' || columnName === 'In Stock' || columnName === 'Available' || columnName === 'Amount') {
      return item.quantity !== undefined ? item.quantity : '—'
    }
    if (columnName === 'Unit Price' || columnName === 'Price' || columnName === 'Unit Price ($)' || columnName === 'Cost' || columnName === 'Unit Cost' || columnName === 'Price per Unit' || columnName === 'Cost per Unit') {
      return item.unitPrice !== undefined ? `$${item.unitPrice.toFixed(2)}` : '—'
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

  const getItemImage = (item) => {
    // Check for image URL in rawData (common column names: Image, Image URL, Photo, Picture, etc.)
    if (item.rawData) {
      const imageKeys = ['Image', 'Image URL', 'Photo', 'Picture', 'Img', 'ImageUrl', 'Image Path', 'Thumbnail', 'Image URL', 'ImageUrl']
      for (const key of imageKeys) {
        if (item.rawData[key] && typeof item.rawData[key] === 'string') {
          const imgUrl = item.rawData[key].trim()
          // Check if it's a valid URL or file path
          if (imgUrl && (imgUrl.startsWith('http') || imgUrl.startsWith('/') || imgUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/i))) {
            return imgUrl
          }
        }
      }
    }
    return null
  }

  const getQuantityStatus = (quantity) => {
    if (quantity === 0) return 'out'
    if (quantity < 10) return 'low'
    if (quantity < 30) return 'medium'
    return 'good'
  }

  const handleViewInventoryFile = () => {
    if (inventoryFileUrl) {
      // If we have the URL pre-fetched, open it immediately (works on iPad Safari)
      const link = document.createElement('a')
      link.href = inventoryFileUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // Fallback: fetch and open
      setInventoryLoading(true)
      fetch('/api/inventory/files')
        .then((res) => res.json())
        .then((data) => {
          setInventoryLoading(false)
          if (data.success && data.files && data.files.length > 0) {
            const url = data.files[0].url
            setInventoryFileUrl(url)
            const link = document.createElement('a')
            link.href = url
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          } else {
            alert('No inventory files found. Please upload a file.')
          }
        })
        .catch((err) => {
          setInventoryLoading(false)
          alert('Failed to load inventory file. Make sure the backend is running: npm run server')
        })
    }
  }

  return (
    <Layout onLogout={onLogout}>
      <div className="inventory-page">
        <div className="inventory-page-head">
          <div className="inventory-page-head-content">
            <div className="inventory-page-head-row">
              <h1 className="inventory-page-title">Inventory</h1>
              <div className="inventory-head-actions">
                <button 
                  type="button" 
                  className="btn-menu btn-menu--secondary"
                  onClick={handleViewInventoryFile}
                  disabled={inventoryLoading}
                >
                  <span>{inventoryLoading ? 'Loading...' : 'View Inventory File'}</span>
                </button>
                <button 
                  type="button" 
                  className="btn-menu btn-menu--primary"
                  onClick={() => setUploadModalOpen(true)}
                >
                  <IconUpload />
                  <span>Upload</span>
                </button>
              </div>
            </div>
            <p className="inventory-page-subtitle">Manage and track your bar stock and supplies.</p>
          </div>
        </div>

        {loading && (
          <div className="inventory-loading">Loading inventory…</div>
        )}
        {error && (
          <div className="inventory-error">
            {error}. Make sure the backend is running: <code>npm run server</code>
          </div>
        )}

        <div className="inventory-content-grid">
          <div className="inventory-items-card inventory-items-card--full">
            <div className="inventory-items-card-bar">
              <div className="inventory-search-wrap">
                <span className="inventory-search-icon">
                  <IconSearch />
                </span>
                <input
                  type="text"
                  className="inventory-search-input"
                  placeholder="Search inventory…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="inventory-items-actions">
                <span className="inventory-item-count">
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                </span>
                <div className="inventory-filter-wrap">
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
                    <div className="inventory-filter-dropdown">
                      <div className="inventory-filter-content">
                        <div className="inventory-filter-section">
                          <h4 className="inventory-filter-section-title">Filter by</h4>
                          <div className="inventory-filter-grid">
                            <div className="inventory-filter-row">
                              <label htmlFor="inventory-filter-category">Category</label>
                              <select
                                id="inventory-filter-category"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                              >
                                <option value="">All categories</option>
                                {categories.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            <div className="inventory-filter-row">
                              <label htmlFor="inventory-filter-quantity">Quantity / Stock Status</label>
                              <select
                                id="inventory-filter-quantity"
                                value={filterQuantity}
                                onChange={(e) => setFilterQuantity(e.target.value)}
                              >
                                <option value="">All quantities</option>
                                <option value="out">Out of stock</option>
                                <option value="low">Low stock (1–9)</option>
                                <option value="medium">Medium stock (10–29)</option>
                                <option value="good">Well stocked (30+)</option>
                                <option value="in-stock">Any in-stock (&gt;0)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        {availableColumns.length > 0 && (
                          <div className="inventory-filter-section">
                            <h4 className="inventory-filter-section-title">Show columns</h4>
                            <div className="inventory-column-checkboxes">
                              {availableColumns
                                .filter((col) => {
                                  const colLower = col.toLowerCase()
                                  return !colLower.includes('unit price') && 
                                         !colLower.includes('tax') && 
                                         !colLower.includes('is first line') && 
                                         !colLower.includes('discount')
                                })
                                .map((col) => (
                                  <label key={col} className="inventory-column-checkbox">
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
                      <div className="inventory-filter-actions">
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

            <div className="inventory-table-wrap">
              {!loading && !error && (
                <table className="inventory-table">
                  <thead>
                    <tr>
                      {visibleColumns.map((col) => {
                        const isQtyCol = col === 'Quantity' || col === 'Qty' || col === 'Stock' || col === 'Units'
                        return (
                          <th key={col} className={isQtyCol ? 'inventory-header-quantity' : ''}>
                            {col.toUpperCase()}
                          </th>
                        )
                      })}
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="inventory-empty">
                          No items found. Add a spreadsheet to userUploads or clear the search/filters.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id}>
                          {visibleColumns.map((col) => {
                            const value = getColumnValue(item, col)
                            const isNameCol = col === 'Ingredient' || col === 'Ingredient Name' || col === 'Item Name' || col === 'Item name' || col === 'Item' || col === 'Product' || col === 'Name'
                            const isQtyCol = col === 'Quantity' || col === 'Qty' || col === 'Stock' || col === 'Units' || col === 'In Stock' || col === 'Available' || col === 'Amount'
                            return (
                              <td key={col} className={isQtyCol ? 'inventory-cell-quantity' : ''}>
                                {isNameCol ? (
                                  <div className="inventory-cell-item">
                                    {getItemImage(item) ? (
                                      <img 
                                        src={getItemImage(item)} 
                                        alt={item.name || ''}
                                        className="inventory-item-image"
                                        onError={(e) => {
                                          // Fallback to icon if image fails to load
                                          e.target.style.display = 'none'
                                          const icon = e.target.parentElement.querySelector('.inventory-item-icon')
                                          if (icon) icon.style.display = 'flex'
                                        }}
                                      />
                                    ) : (
                                      <div className="inventory-item-icon" aria-hidden>
                                        {React.createElement(getInventoryIcon(item))}
                                      </div>
                                    )}
                                    <span>{value}</span>
                                  </div>
                                ) : isQtyCol && typeof value === 'number' ? (
                                  <>
                                    <span className={`inventory-quantity inventory-quantity--${getQuantityStatus(value)}`}>{value}</span>
                                    <span className="inventory-quantity-unit"> units</span>
                                  </>
                                ) : (
                                  <span>{value}</span>
                                )}
                              </td>
                            )
                          })}
                          <td>
                            <div className="inventory-cell-actions">
                              <button type="button" className="inventory-action-btn" aria-label="Edit" title="Edit">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button type="button" className="inventory-action-btn" aria-label="Delete" title="Delete">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        <UploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onUpload={async (file) => {
            // Simulate upload
            await new Promise(resolve => setTimeout(resolve, 1500))
            alert('Inventory file uploaded successfully!')
            // Reload inventory after upload
            setSearch('')
          }}
          title="Upload Inventory"
          description="Upload a CSV or Excel file to update your inventory. Supported formats: CSV, XLS, XLSX"
          accept=".csv,.xls,.xlsx"
          maxSizeMB={10}
        />
      </div>
    </Layout>
  )
}

export default Inventory
