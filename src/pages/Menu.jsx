import React, { useState, useMemo, useEffect } from 'react'
import Layout from '../components/Layout'
import { IconSearch, IconUpload, IconFilter } from '../components/Icons'
import UploadModal from '../components/UploadModal'

// Preview/Eye icon for digital menu preview
function IconPreview() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function Menu({ onLogout }) {
  const [sections, setSections] = useState([])
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerItem, setDrawerItem] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', section: '', status: 'active', happyHour: false, tags: [], modifiers: [] })
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState(null)
  const [menuFileUrl, setMenuFileUrl] = useState(null)
  const [menuItemsLoading, setMenuItemsLoading] = useState(true)
  const [menuItemsError, setMenuItemsError] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterSection, setFilterSection] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewSection, setPreviewSection] = useState('')

  // Initialize preview section when modal opens
  useEffect(() => {
    if (previewModalOpen && sections.length > 0 && !previewSection) {
      setPreviewSection(sections[0])
    }
  }, [previewModalOpen, sections, previewSection])


  // Load menu items from API on mount
  useEffect(() => {
    let cancelled = false
    setMenuItemsLoading(true)
    setMenuItemsError(null)
    
    fetch('/api/menu/items')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load menu')
        return res.json()
      })
      .then((data) => {
        if (!cancelled && data.success) {
          setSections(data.sections || [])
          setItems(data.items || [])
        } else if (!cancelled) {
          setMenuItemsError(data.error || 'Failed to load menu')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMenuItemsError(err.message || 'Failed to load menu. Make sure the backend is running: npm run server')
        }
      })
      .finally(() => {
        if (!cancelled) setMenuItemsLoading(false)
      })
    
    // Pre-fetch menu file URL for immediate opening
    fetch('/api/menu/files')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.files && data.files.length > 0) {
          setMenuFileUrl(data.files[0].url)
        }
      })
      .catch(() => {
        // Silently fail - will show error when user clicks
      })
    
    return () => { cancelled = true }
  }, [])

  const filteredItems = useMemo(() => {
    let filtered = items
    
    // Apply search filter
    const q = search.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          i.section.toLowerCase().includes(q)
      )
    }
    
    // Apply section filter
    if (filterSection) {
      filtered = filtered.filter((i) => i.section === filterSection)
    }
    
    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter((i) => i.status === filterStatus)
    }
    
    return filtered
  }, [search, items, filterSection, filterStatus])

  // Get preview items for selected section
  const previewItems = useMemo(() => {
    if (!previewSection && sections.length > 0) {
      return items.filter((i) => i.section === sections[0] && i.status === 'active')
    }
    return items.filter((i) => i.section === previewSection && i.status === 'active')
  }, [previewSection, items, sections])

  const applyFilter = () => {
    setFilterOpen(false)
  }

  const clearFilter = () => {
    setFilterSection('')
    setFilterStatus('')
    setFilterOpen(false)
  }


  const openDrawer = (item) => {
    setDrawerItem(item)
    setEditForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      section: item.section,
      status: item.status,
      happyHour: item.happyHour || false,
      tags: [...(item.tags || [])],
      modifiers: [...(item.modifiers || [])],
    })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    // Save changes when closing
    if (drawerItem && editForm.name) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === drawerItem.id
            ? {
                ...i,
                name: editForm.name,
                description: editForm.description,
                price: parseFloat(editForm.price) || 0,
                section: editForm.section,
                status: editForm.status,
                happyHour: editForm.happyHour,
                tags: editForm.tags || [],
                modifiers: editForm.modifiers || [],
              }
            : i
        )
      )
    }
    setDrawerOpen(false)
    setDrawerItem(null)
  }

  const toggleUnavailable = (item) => {
    const next = item.status === 'active' ? 'unavailable' : 'active'
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: next } : i))
    )
    setDrawerItem((prev) => (prev && prev.id === item.id ? { ...prev, status: next } : prev))
  }

  const handleShowPhysicalMenu = () => {
    if (menuFileUrl) {
      // If we have the URL pre-fetched, open it immediately (works on iPad Safari)
      const link = document.createElement('a')
      link.href = menuFileUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // Fallback: fetch and open
      setMenuLoading(true)
      setMenuError(null)
      fetch('/api/menu/files')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.files && data.files.length > 0) {
            const menuUrl = data.files[0].url
            setMenuFileUrl(menuUrl) // Cache for next time
            
            const link = document.createElement('a')
            link.href = menuUrl
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          } else {
            setMenuError('No menu files found. Please upload a PDF menu to userUploads.')
            setTimeout(() => setMenuError(null), 5000)
          }
        })
        .catch((err) => {
          setMenuError('Failed to load menu. Make sure the backend is running: npm run server')
          setTimeout(() => setMenuError(null), 5000)
        })
        .finally(() => {
          setMenuLoading(false)
        })
    }
  }

  return (
    <Layout onLogout={onLogout}>
      <div className="menu-page">
        <div className="menu-page-head">
          <div className="menu-page-head-content">
            <div className="menu-page-head-row">
              <h1 className="menu-page-title">Menu</h1>
              <div className="menu-head-actions">
                <button 
                  type="button" 
                  className="btn-menu btn-menu--secondary"
                  onClick={() => setPreviewModalOpen(true)}
                >
                  <IconPreview />
                  <span>Digital Preview</span>
                </button>
                <button 
                  type="button" 
                  className="btn-menu btn-menu--secondary"
                  onClick={handleShowPhysicalMenu}
                  disabled={menuLoading}
                >
                  <span>{menuLoading ? 'Loading...' : 'View Physical Menu'}</span>
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
            <p className="menu-page-subtitle">Manage menu items, sections, and availability.</p>
          </div>
        </div>

        {menuItemsLoading && (
          <div className="menu-loading">Loading menu items…</div>
        )}
        {menuItemsError && (
          <div className="menu-error">
            {menuItemsError}
          </div>
        )}

        <div className="menu-content-grid">
          {/* Main Menu items card */}
          <div className="menu-items-card menu-items-card--full">
            <div className="menu-items-card-bar">
              <div className="menu-search-wrap">
                <span className="menu-search-icon"><IconSearch /></span>
                <input
                  type="text"
                  className="menu-search-input"
                  placeholder="Search menu…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="menu-items-actions">
                <span className="menu-item-count">
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                </span>
                <div className="menu-filter-wrap">
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
                    <div className="menu-filter-dropdown">
                      <div className="menu-filter-row">
                        <label htmlFor="menu-filter-section">Section</label>
                        <select
                          id="menu-filter-section"
                          value={filterSection}
                          onChange={(e) => setFilterSection(e.target.value)}
                        >
                          <option value="">All sections</option>
                          {sections.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="menu-filter-row">
                        <label htmlFor="menu-filter-status">Status</label>
                        <select
                          id="menu-filter-status"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="">All statuses</option>
                          <option value="active">Active</option>
                          <option value="unavailable">Unavailable</option>
                        </select>
                      </div>
                      <div className="menu-filter-actions">
                        <button type="button" className="btn-menu btn-menu--secondary" onClick={clearFilter}>
                          Clear
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
            <div className="menu-table-wrap">
              {menuItemsLoading ? (
                <div className="menu-loading">Loading menu items…</div>
              ) : menuItemsError ? (
                <div className="menu-error">{menuItemsError}</div>
              ) : filteredItems.length === 0 ? (
                <div className="menu-empty">No menu items found. {search ? 'Try a different search term.' : 'Upload a menu text file to userUploads.'}</div>
              ) : (
                <table className="menu-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Section</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="menu-cell-item">
                          <span className="menu-item-name">{item.name}</span>
                          {item.description && <span className="menu-item-desc">{item.description}</span>}
                        </div>
                      </td>
                      <td>{item.section}</td>
                      <td>${item.price.toFixed(2)}</td>
                      <td>
                        <span className={`menu-pill menu-pill--${item.status}`}>
                          {item.status === 'unavailable' ? 'Unavailable' : 'Active'}
                        </span>
                        {item.happyHour && <span className="menu-pill menu-pill--hh">HH</span>}
                      </td>
                      <td>
                        <div className="menu-cell-actions">
                          <button type="button" className="menu-action-btn" onClick={() => openDrawer(item)} aria-label="View/Edit" title="View/Edit">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button type="button" className="menu-action-btn" onClick={() => toggleUnavailable(item)} aria-label={item.status === 'unavailable' ? "Mark Available" : "Mark Unavailable"} title={item.status === 'unavailable' ? "Mark Available" : "Mark Unavailable"}>
                            {item.status === 'unavailable' ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Error message display */}
        {menuError && (
          <div className="menu-error" style={{ marginBottom: '24px' }}>
            {menuError}
          </div>
        )}

        {/* Digital Menu Preview Modal */}
        {previewModalOpen && (
          <>
            <div className="menu-preview-backdrop" onClick={() => setPreviewModalOpen(false)} role="presentation" />
            <div className="menu-preview-modal">
              <div className="menu-preview-header">
                <h3 className="menu-preview-title">Digital Menu Preview</h3>
                <button type="button" className="menu-preview-close" onClick={() => setPreviewModalOpen(false)} aria-label="Close">×</button>
              </div>
              <div className="menu-preview-body">
                {sections.length > 0 ? (
                  <>
                    <div className="menu-preview-tabs">
                      {sections.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          className={`menu-preview-tab ${(!previewSection && sec === sections[0]) || previewSection === sec ? 'active' : ''}`}
                          onClick={() => setPreviewSection(sec)}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                    <div className="menu-preview-grid">
                      {previewItems.length > 0 ? (
                        previewItems.map((item) => (
                          <div key={item.id} className="menu-preview-item-card">
                            <div className="menu-preview-item-header">
                              <span className="menu-preview-item-name">{item.name}</span>
                              <span className="menu-preview-item-price">${item.price.toFixed(2)}</span>
                            </div>
                            {item.description && (
                              <p className="menu-preview-item-desc">{item.description}</p>
                            )}
                            {item.happyHour && (
                              <span className="menu-preview-badge">Happy Hour</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="menu-preview-empty">No items in this section</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="menu-preview-empty">No menu sections available</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Upload Modal */}
        <UploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onUpload={async (file) => {
            // Simulate upload
            await new Promise(resolve => setTimeout(resolve, 1500))
            alert('Menu uploaded successfully!')
          }}
          title="Upload Menu"
          description="Upload a PDF or text file to update your menu. Supported formats: PDF, TXT"
          accept=".pdf,.txt"
          maxSizeMB={10}
        />

        {/* Right-side drawer */}
        {drawerOpen && (
          <>
            <div className="menu-drawer-backdrop" onClick={closeDrawer} role="presentation" />
            <div className="menu-drawer">
              <div className="menu-drawer-head">
                <h3 className="menu-drawer-title">{drawerItem ? 'Edit item' : 'New item'}</h3>
                <button type="button" className="menu-drawer-close" onClick={closeDrawer} aria-label="Close">×</button>
              </div>
              <div className="menu-drawer-body">
                <div className="menu-drawer-field">
                  <label htmlFor="menu-drawer-name">Name</label>
                  <input id="menu-drawer-name" type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="menu-drawer-field">
                  <label htmlFor="menu-drawer-desc">Description</label>
                  <textarea id="menu-drawer-desc" rows={2} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="menu-drawer-field">
                  <label htmlFor="menu-drawer-price">Price</label>
                  <input id="menu-drawer-price" type="text" inputMode="decimal" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="menu-drawer-field">
                  <label htmlFor="menu-drawer-section">Section</label>
                  <select id="menu-drawer-section" value={editForm.section} onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}>
                    {sections.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="menu-drawer-field">
                  <label>Status</label>
                  <div className="menu-drawer-toggle-wrap">
                    <button type="button" className={`menu-drawer-toggle-btn ${editForm.status === 'active' ? 'active' : ''}`} onClick={() => setEditForm((f) => ({ ...f, status: 'active' }))}>Active</button>
                    <button type="button" className={`menu-drawer-toggle-btn ${editForm.status === 'unavailable' ? 'active' : ''}`} onClick={() => setEditForm((f) => ({ ...f, status: 'unavailable' }))}>Unavailable</button>
                  </div>
                </div>
                <div className="menu-drawer-field">
                  <label>Tags</label>
                  <div className="menu-drawer-hh-toggle">
                    <button
                      type="button"
                      className={`menu-drawer-hh-btn ${editForm.happyHour ? 'active' : ''}`}
                      onClick={() => setEditForm((f) => ({ ...f, happyHour: !f.happyHour }))}
                    >
                      <span className="menu-drawer-hh-label">Happy Hour</span>
                      {editForm.happyHour && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="menu-drawer-chips">
                    {(editForm.tags || []).map((t, i) => (
                      <span key={i} className="menu-drawer-chip">
                        {t}
                        <button
                          type="button"
                          className="menu-drawer-chip-remove"
                          onClick={() => {
                            const newTags = [...(editForm.tags || [])]
                            newTags.splice(i, 1)
                            setEditForm((f) => ({ ...f, tags: newTags }))
                          }}
                          aria-label={`Remove ${t} tag`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="menu-drawer-tag-input-wrap">
                    <input
                      type="text"
                      className="menu-drawer-tag-input"
                      placeholder="Add a tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          e.preventDefault()
                          const newTag = e.target.value.trim()
                          if (!editForm.tags?.includes(newTag)) {
                            setEditForm((f) => ({
                              ...f,
                              tags: [...(f.tags || []), newTag],
                            }))
                          }
                          e.target.value = ''
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="menu-drawer-field">
                  <label>Modifiers</label>
                  <ul className="menu-drawer-modifiers">
                    {(editForm.modifiers || []).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default Menu
