/*
 * IMPORTANT: Buttons inside clickable parent cards
 * MUST call e.stopPropagation() on their onClick handler.
 *
 * IMPORTANT: All authenticated API calls MUST use the get()/post()
 * functions from useApi() hook — NOT bare fetch(). The useApi hook
 * attaches Clerk's Bearer token. Without it, all API calls return 401.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { UserButton, SignedIn, SignedOut } from '@clerk/clerk-react'
import { useApi } from './hooks/useApi'
import Papa from 'papaparse'
import ToolNav from './components/ToolNav'
import './Vigilia.css'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'arms', label: 'Arms' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'general', label: 'General' },
  { key: 'locations', label: 'Locations' },
]

const ARMS_SUBS = [
  { key: 'firearms', label: 'Firearms' },
  { key: 'suppressors', label: 'Suppressors' },
  { key: 'ammo', label: 'Ammo' },
]

function Vigilia() {
  const { get, post, isSignedIn } = useApi()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── Dashboard state ──
  const [dash, setDash] = useState(null)
  const [dashLoading, setDashLoading] = useState(true)

  // ── Locations state ──
  const [locations, setLocations] = useState([])
  const [locLoading, setLocLoading] = useState(true)

  // ── Arms state ──
  const [armsSub, setArmsSub] = useState('firearms')
  const [firearms, setFirearms] = useState([])
  const [suppressors, setSuppressors] = useState([])
  const [ammo, setAmmo] = useState([])
  const [armsLoading, setArmsLoading] = useState(true)

  // ── Vehicles state ──
  const [vehicles, setVehicles] = useState([])
  const [vehLoading, setVehLoading] = useState(true)

  // ── Inventory state ──
  const [inventory, setInventory] = useState([])
  const [invLoading, setInvLoading] = useState(true)
  const [invSearch, setInvSearch] = useState('')
  const [invCategory, setInvCategory] = useState('')
  const [invLocation, setInvLocation] = useState('')

  // ── Modal state ──
  const [modal, setModal] = useState(null) // { type, mode: 'add'|'edit', data }
  const [formData, setFormData] = useState({})

  // ── Delete confirm state ──
  const [confirmDelete, setConfirmDelete] = useState(null)

  // ── Inline edit threshold ──
  const [editThreshold, setEditThreshold] = useState(null)
  const thresholdRef = useRef(null)

  // ── CSV import ──
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [csvTarget, setCsvTarget] = useState(null) // which resource to import into

  // ── Data loaders ──
  const loadDashboard = useCallback(async () => {
    try {
      setDashLoading(true)
      const data = await get('/api/vigilia/dashboard')
      setDash(data)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setDashLoading(false)
    }
  }, [get])

  const loadLocations = useCallback(async () => {
    try {
      setLocLoading(true)
      const data = await get('/api/vigilia/locations')
      setLocations(data || [])
    } catch (err) {
      console.error('Locations load error:', err)
    } finally {
      setLocLoading(false)
    }
  }, [get])

  const loadFirearms = useCallback(async () => {
    try {
      const data = await get('/api/vigilia/firearms')
      setFirearms(data || [])
    } catch (err) {
      console.error('Firearms load error:', err)
    }
  }, [get])

  const loadSuppressors = useCallback(async () => {
    try {
      const data = await get('/api/vigilia/suppressors')
      setSuppressors(data || [])
    } catch (err) {
      console.error('Suppressors load error:', err)
    }
  }, [get])

  const loadAmmo = useCallback(async () => {
    try {
      const data = await get('/api/vigilia/ammo')
      setAmmo(data || [])
    } catch (err) {
      console.error('Ammo load error:', err)
    }
  }, [get])

  const loadVehicles = useCallback(async () => {
    try {
      setVehLoading(true)
      const data = await get('/api/vigilia/vehicles')
      setVehicles(data || [])
    } catch (err) {
      console.error('Vehicles load error:', err)
    } finally {
      setVehLoading(false)
    }
  }, [get])

  const loadInventory = useCallback(async () => {
    try {
      setInvLoading(true)
      let url = '/api/vigilia/inventory'
      const params = []
      if (invCategory) params.push(`category=${encodeURIComponent(invCategory)}`)
      if (invLocation) params.push(`location_id=${encodeURIComponent(invLocation)}`)
      if (params.length) url += '?' + params.join('&')
      const data = await get(url)
      setInventory(data || [])
    } catch (err) {
      console.error('Inventory load error:', err)
    } finally {
      setInvLoading(false)
    }
  }, [get, invCategory, invLocation])

  // ── Initial data load ──
  useEffect(() => {
    if (!isSignedIn) return
    loadDashboard()
    loadLocations()
  }, [isSignedIn, loadDashboard, loadLocations])

  useEffect(() => {
    if (!isSignedIn) return
    if (activeTab === 'arms') {
      setArmsLoading(true)
      Promise.all([loadFirearms(), loadSuppressors(), loadAmmo()]).finally(() => setArmsLoading(false))
    } else if (activeTab === 'vehicles') {
      loadVehicles()
    } else if (activeTab === 'general') {
      loadInventory()
    } else if (activeTab === 'dashboard') {
      loadDashboard()
    }
  }, [isSignedIn, activeTab, loadFirearms, loadSuppressors, loadAmmo, loadVehicles, loadInventory, loadDashboard])

  // ── CRUD handlers ──
  const handleSave = async () => {
    if (!modal) return
    const { type, mode, data } = modal
    try {
      if (mode === 'edit') {
        await post(`/api/vigilia/${type}/update`, { id: data.id, ...formData })
        showToast('Updated successfully')
      } else {
        await post(`/api/vigilia/${type}`, formData)
        showToast('Created successfully')
      }
      setModal(null)
      setFormData({})
      // Reload relevant data
      if (type === 'locations') { loadLocations(); loadDashboard() }
      else if (type === 'firearms') loadFirearms()
      else if (type === 'suppressors') loadSuppressors()
      else if (type === 'ammo') loadAmmo()
      else if (type === 'vehicles') loadVehicles()
      else if (type === 'inventory') { loadInventory(); loadDashboard() }
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  const handleDelete = async (type, id) => {
    try {
      await post(`/api/vigilia/${type}/delete`, { id })
      showToast('Deleted')
      setConfirmDelete(null)
      if (type === 'locations') { loadLocations(); loadDashboard() }
      else if (type === 'firearms') loadFirearms()
      else if (type === 'suppressors') loadSuppressors()
      else if (type === 'ammo') loadAmmo()
      else if (type === 'vehicles') loadVehicles()
      else if (type === 'inventory') { loadInventory(); loadDashboard() }
    } catch (err) {
      showToast(`Error: ${err.message}`)
      setConfirmDelete(null)
    }
  }

  const openAdd = (type, defaults = {}) => {
    setModal({ type, mode: 'add', data: null })
    setFormData(defaults)
  }

  const openEdit = (type, item) => {
    setModal({ type, mode: 'edit', data: item })
    setFormData({ ...item })
  }

  // ── Inline threshold edit ──
  const handleThresholdBlur = async (item) => {
    const val = thresholdRef.current?.value
    if (val === '' || val === String(item.min_threshold)) {
      setEditThreshold(null)
      return
    }
    try {
      await post('/api/vigilia/inventory/update', { id: item.id, min_threshold: Number(val) })
      setEditThreshold(null)
      loadInventory()
      loadDashboard()
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  // ── CSV import ──
  const handleImportCSV = (target) => {
    setCsvTarget(target)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !csvTarget) return
    e.target.value = ''
    setImporting(true)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      if (parsed.errors.length > 0) {
        showToast(`CSV parse error: ${parsed.errors[0].message}`)
        return
      }
      let created = 0
      for (const row of parsed.data) {
        try {
          await post(`/api/vigilia/${csvTarget}`, row)
          created++
        } catch (err) {
          console.error('Row import error:', err)
        }
      }
      showToast(`Imported ${created} of ${parsed.data.length} rows`)
      if (csvTarget === 'firearms') loadFirearms()
      else if (csvTarget === 'suppressors') loadSuppressors()
      else if (csvTarget === 'ammo') loadAmmo()
      else if (csvTarget === 'inventory') { loadInventory(); loadDashboard() }
      else if (csvTarget === 'vehicles') loadVehicles()
    } catch (err) {
      showToast(`Import error: ${err.message}`)
    } finally {
      setImporting(false)
      setCsvTarget(null)
    }
  }

  // ── Helpers ──
  const locName = (id) => locations.find(l => l.id === id)?.name || '—'

  const foodColor = (days) => {
    if (days >= 30) return 'vig-green'
    if (days >= 8) return 'vig-ember'
    return 'vig-red'
  }

  const waterColor = (days) => {
    if (days >= 14) return 'vig-green'
    if (days >= 4) return 'vig-ember'
    return 'vig-red'
  }

  const qtyColor = (qty, threshold) => {
    if (!threshold || threshold <= 0) return ''
    if (qty >= threshold) return 'vig-green'
    if (qty >= threshold / 2) return 'vig-ember'
    return 'vig-red'
  }

  const expiryColor = (dateStr) => {
    if (!dateStr) return ''
    const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
    if (days <= 7) return 'vig-red'
    if (days <= 30) return 'vig-ember'
    return ''
  }

  const daysUntil = (dateStr) => {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString()
  }

  // ── Form field helper ──
  const field = (key, label, type = 'text', options = null) => (
    <div className="vig-field" key={key}>
      <label>{label}</label>
      {options ? (
        <select value={formData[key] || ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}>
          <option value="">— Select —</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={formData[key] || ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} rows={3} />
      ) : type === 'checkbox' ? (
        <input type="checkbox" checked={!!formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })} />
      ) : (
        <input type={type} value={formData[key] || ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
      )}
    </div>
  )

  const locationOptions = locations.map(l => ({ value: l.id, label: l.name }))

  // ── Delete confirmation inline ──
  const deleteBtn = (type, id) => (
    confirmDelete === `${type}-${id}` ? (
      <>
        <button className="vig-del-btn vig-del-confirm" onClick={(e) => { e.stopPropagation(); handleDelete(type, id) }}>Delete?</button>
        <button className="vig-del-btn" onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }}>Cancel</button>
      </>
    ) : (
      <button className="vig-del-btn" onClick={(e) => { e.stopPropagation(); setConfirmDelete(`${type}-${id}`) }}>×</button>
    )
  )

  // ── Filtered inventory for display ──
  const filteredInventory = inventory.filter(item => {
    if (invSearch && !item.name?.toLowerCase().includes(invSearch.toLowerCase())) return false
    return true
  })

  // ── Render ──
  return (
    <div className="vigilia">
      <ToolNav />
      {/* Nav */}
      <nav className="vig-nav">
        <div className="vig-nav-left">
          <Link to="/vigilia" className="vig-logo">
            <span className="vig-wordmark">Vigi<span>lia</span></span>
          </Link>
        </div>
        <div className="vig-nav-center">
          {TABS.map(tab => (
            <button key={tab.key}
              className={`vig-pill ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >{tab.label}</button>
          ))}
        </div>
        <div className="vig-nav-right">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut><div className="vig-avatar" /></SignedOut>
        </div>
      </nav>

      <div className="vig-content">
        {/* ═══ DASHBOARD ═══ */}
        {activeTab === 'dashboard' && (
          <div className="vig-dash">
            {dashLoading ? <div className="vig-loading">Loading dashboard…</div> : !dash ? <div className="vig-empty">No data yet</div> : (
              <>
                <div className="vig-metrics">
                  <div className="vig-metric-card">
                    <div className={`vig-metric-value ${foodColor(dash.foodDays || 0)}`}>{Math.round(dash.foodDays || 0)}</div>
                    <div className="vig-metric-label">Food (days)</div>
                  </div>
                  <div className="vig-metric-card">
                    <div className={`vig-metric-value ${waterColor(dash.waterDays || 0)}`}>{Math.round(dash.waterDays || 0)}</div>
                    <div className="vig-metric-label">Water (days)</div>
                  </div>
                  <div className="vig-metric-card">
                    <div className={`vig-metric-value ${(dash.expiringSoon?.length || 0) > 0 ? 'vig-ember' : 'vig-green'}`}>{dash.expiringSoon?.length || 0}</div>
                    <div className="vig-metric-label">Expiring soon</div>
                  </div>
                  <div className="vig-metric-card">
                    <div className={`vig-metric-value ${(dash.belowThreshold?.length || 0) > 0 ? 'vig-red' : 'vig-green'}`}>{dash.belowThreshold?.length || 0}</div>
                    <div className="vig-metric-label">Below threshold</div>
                  </div>
                </div>

                {dash.byLocation?.length > 0 && (
                  <>
                    <h3 className="vig-section-title">By Location</h3>
                    <div className="vig-locations-grid">
                      {dash.byLocation.map(loc => (
                        <div className="vig-loc-card" key={loc.locationName}>
                          <div className="vig-loc-card-name">{loc.locationName}</div>
                          <div className="vig-loc-card-stats">
                            <span>{loc.itemCount} items</span>
                            <span className={foodColor(loc.foodDays || 0)}>{Math.round(loc.foodDays || 0)}d food</span>
                            <span className={waterColor(loc.waterDays || 0)}>{Math.round(loc.waterDays || 0)}d water</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="vig-panels">
                  <div className="vig-panel">
                    <div className="vig-panel-title">Below Threshold</div>
                    {(dash.belowThreshold?.length || 0) === 0 ? <div className="vig-empty">All stocked</div> : (
                      dash.belowThreshold.map(item => (
                        <div className="vig-alert-item" key={item.id}>
                          <span>{item.name}</span>
                          <span className="vig-badge vig-red">{item.quantity}/{item.min_threshold}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="vig-panel">
                    <div className="vig-panel-title">Expiring Soon</div>
                    {(dash.expiringSoon?.length || 0) === 0 ? <div className="vig-empty">Nothing expiring</div> : (
                      dash.expiringSoon.map(item => (
                        <div className="vig-alert-item" key={item.id}>
                          <span>{item.name}</span>
                          <span className={`vig-badge ${expiryColor(item.expiration_date)}`}>{daysUntil(item.expiration_date)}d</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ ARMS ═══ */}
        {activeTab === 'arms' && (
          <div className="vig-arms">
            <div className="vig-sub-tabs">
              {ARMS_SUBS.map(sub => (
                <button key={sub.key}
                  className={`vig-sub-tab ${armsSub === sub.key ? 'active' : ''}`}
                  onClick={() => setArmsSub(sub.key)}
                >{sub.label}</button>
              ))}
            </div>

            {armsLoading ? <div className="vig-loading">Loading…</div> : (
              <>
                {/* FIREARMS */}
                {armsSub === 'firearms' && (
                  <>
                    <div className="vig-toolbar">
                      <button className="vig-add-btn" onClick={() => openAdd('firearms')}>+ Add Firearm</button>
                      <button className="vig-import-btn" onClick={() => handleImportCSV('firearms')} disabled={importing}>
                        {importing && csvTarget === 'firearms' ? 'Importing…' : 'Import CSV'}
                      </button>
                    </div>
                    {firearms.length === 0 ? <div className="vig-empty">No firearms added yet</div> : (
                      <table className="vig-table">
                        <thead><tr><th>Make/Model</th><th>Caliber</th><th>Optic</th><th>Location</th><th></th></tr></thead>
                        <tbody>
                          {firearms.map(f => (
                            <tr key={f.id}>
                              <td>{f.make} {f.model}</td>
                              <td>{f.caliber}</td>
                              <td>{f.has_optic ? (f.optic_type || 'Yes') : '—'}</td>
                              <td>{f.location_name || locName(f.location_id)}</td>
                              <td className="vig-actions">
                                <button className="vig-edit-btn" onClick={(e) => { e.stopPropagation(); openEdit('firearms', f) }}>Edit</button>
                                {deleteBtn('firearms', f.id)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}

                {/* SUPPRESSORS */}
                {armsSub === 'suppressors' && (
                  <>
                    <div className="vig-toolbar">
                      <button className="vig-add-btn" onClick={() => openAdd('suppressors')}>+ Add Suppressor</button>
                      <button className="vig-import-btn" onClick={() => handleImportCSV('suppressors')} disabled={importing}>
                        {importing && csvTarget === 'suppressors' ? 'Importing…' : 'Import CSV'}
                      </button>
                    </div>
                    {suppressors.length === 0 ? <div className="vig-empty">No suppressors added yet</div> : (
                      <table className="vig-table">
                        <thead><tr><th>Make/Model</th><th>Caliber</th><th>Thread Pitch</th><th>Host Firearms</th><th>Location</th><th></th></tr></thead>
                        <tbody>
                          {suppressors.map(s => (
                            <tr key={s.id}>
                              <td>{s.make} {s.model}</td>
                              <td>{s.caliber}</td>
                              <td>{s.thread_pitch || '—'}</td>
                              <td>{s.host_firearms || '—'}</td>
                              <td>{s.location_name || locName(s.location_id)}</td>
                              <td className="vig-actions">
                                <button className="vig-edit-btn" onClick={(e) => { e.stopPropagation(); openEdit('suppressors', s) }}>Edit</button>
                                {deleteBtn('suppressors', s.id)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}

                {/* AMMO */}
                {armsSub === 'ammo' && (
                  <>
                    <div className="vig-toolbar">
                      <button className="vig-add-btn" onClick={() => openAdd('ammo')}>+ Add Ammo</button>
                      <button className="vig-import-btn" onClick={() => handleImportCSV('ammo')} disabled={importing}>
                        {importing && csvTarget === 'ammo' ? 'Importing…' : 'Import CSV'}
                      </button>
                    </div>
                    {ammo.length === 0 ? <div className="vig-empty">No ammo added yet</div> : (
                      <table className="vig-table">
                        <thead><tr><th>Caliber</th><th>Brand</th><th>Load Name</th><th>Type</th><th>Qty</th><th>Location</th><th></th></tr></thead>
                        <tbody>
                          {ammo.map(a => (
                            <tr key={a.id}>
                              <td>{a.caliber}</td>
                              <td>{a.brand || '—'}</td>
                              <td>{a.load_name || '—'}</td>
                              <td>{a.ammo_type || '—'}</td>
                              <td>{a.quantity}</td>
                              <td>{a.location_name || locName(a.location_id)}</td>
                              <td className="vig-actions">
                                <button className="vig-edit-btn" onClick={(e) => { e.stopPropagation(); openEdit('ammo', a) }}>Edit</button>
                                {deleteBtn('ammo', a.id)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ VEHICLES ═══ */}
        {activeTab === 'vehicles' && (
          <div className="vig-vehicles">
            <div className="vig-toolbar">
              <button className="vig-add-btn" onClick={() => openAdd('vehicles')}>+ Add Vehicle</button>
            </div>
            {vehLoading ? <div className="vig-loading">Loading…</div> : vehicles.length === 0 ? <div className="vig-empty">No vehicles added yet</div> : (
              <div className="vig-vehicle-grid">
                {vehicles.map(v => (
                  <div className="vig-vehicle-card" key={v.id}>
                    <div className="vig-vehicle-header">
                      <div className="vig-vehicle-name">{v.name}</div>
                      <div className="vig-actions">
                        <button className="vig-edit-btn" onClick={(e) => { e.stopPropagation(); openEdit('vehicles', v) }}>Edit</button>
                        {deleteBtn('vehicles', v.id)}
                      </div>
                    </div>
                    <div className="vig-vehicle-meta">
                      {v.vehicle_type && <span>{v.vehicle_type}</span>}
                      {v.year && <span>{v.year} {v.make} {v.model}</span>}
                    </div>
                    {v.notes && <div className="vig-vehicle-notes">{v.notes}</div>}
                    <span className={`vig-pill-tag ${v.has_inventory ? '' : 'muted'}`}>
                      {v.has_inventory ? 'Has inventory' : 'No inventory'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ GENERAL (INVENTORY) ═══ */}
        {activeTab === 'general' && (
          <div className="vig-general">
            <div className="vig-toolbar">
              <button className="vig-add-btn" onClick={() => openAdd('inventory')}>+ Add Item</button>
              <button className="vig-import-btn" onClick={() => handleImportCSV('inventory')} disabled={importing}>
                {importing && csvTarget === 'inventory' ? 'Importing…' : 'Import CSV'}
              </button>
            </div>
            <div className="vig-filters">
              <input className="vig-search" placeholder="Search items…" value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)} />
              <select className="vig-select" value={invCategory} onChange={(e) => setInvCategory(e.target.value)}>
                <option value="">All categories</option>
                {[...new Set(inventory.map(i => i.category).filter(Boolean))].sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select className="vig-select" value={invLocation} onChange={(e) => setInvLocation(e.target.value)}>
                <option value="">All locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            {invLoading ? <div className="vig-loading">Loading…</div> : filteredInventory.length === 0 ? <div className="vig-empty">No items found</div> : (
              <table className="vig-table">
                <thead><tr><th>Item</th><th>Category</th><th>Unit</th><th>Qty</th><th>Min</th><th>Expires</th><th>Location</th><th></th></tr></thead>
                <tbody>
                  {filteredInventory.map(item => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.category || '—'}</td>
                      <td>{item.unit || '—'}</td>
                      <td className={qtyColor(item.quantity, item.min_threshold)}>{item.quantity}</td>
                      <td className="vig-inline-edit" onClick={(e) => { e.stopPropagation(); setEditThreshold(item.id) }}>
                        {editThreshold === item.id ? (
                          <input ref={thresholdRef} type="number" defaultValue={item.min_threshold || ''}
                            autoFocus
                            onBlur={() => handleThresholdBlur(item)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }} />
                        ) : (
                          <span>{item.min_threshold || '—'}</span>
                        )}
                      </td>
                      <td className={expiryColor(item.expiration_date)}>
                        {item.expiration_date ? formatDate(item.expiration_date) : '—'}
                      </td>
                      <td>{item.location_name || locName(item.location_id)}</td>
                      <td className="vig-actions">
                        <button className="vig-edit-btn" onClick={(e) => { e.stopPropagation(); openEdit('inventory', item) }}>Edit</button>
                        {deleteBtn('inventory', item.id)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ═══ LOCATIONS ═══ */}
        {activeTab === 'locations' && (
          <div className="vig-locations">
            <div className="vig-toolbar">
              <button className="vig-add-btn" onClick={() => openAdd('locations')}>+ Add Location</button>
            </div>
            {locLoading ? <div className="vig-loading">Loading…</div> : locations.length === 0 ? <div className="vig-empty">No locations yet</div> : (
              <div className="vig-loc-list">
                {locations.map(loc => (
                  <div className="vig-loc-item" key={loc.id}>
                    <div className="vig-loc-name">{loc.name}</div>
                    <div className="vig-actions">
                      <button className="vig-edit-btn" onClick={(e) => { e.stopPropagation(); openEdit('locations', loc) }}>Edit</button>
                      {deleteBtn('locations', loc.id)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ MODAL ═══ */}
        {modal && (
          <div className="vig-overlay" onClick={(e) => { e.stopPropagation(); setModal(null); setFormData({}) }}>
            <div className="vig-modal" onClick={(e) => e.stopPropagation()}>
              <div className="vig-modal-title">{modal.mode === 'edit' ? 'Edit' : 'Add'} {modal.type.replace(/s$/, '')}</div>
              <div className="vig-modal-body">
                {modal.type === 'firearms' && (
                  <>
                    {field('make', 'Make')}
                    {field('model', 'Model')}
                    {field('caliber', 'Caliber')}
                    {field('has_optic', 'Has Optic', 'checkbox')}
                    {formData.has_optic && field('optic_type', 'Optic Type')}
                    {field('location_id', 'Location', 'text', locationOptions)}
                    {field('notes', 'Notes', 'textarea')}
                  </>
                )}
                {modal.type === 'suppressors' && (
                  <>
                    {field('make', 'Make')}
                    {field('model', 'Model')}
                    {field('caliber', 'Caliber')}
                    {field('thread_pitch', 'Thread Pitch')}
                    {field('host_firearms', 'Host Firearms')}
                    {field('location_id', 'Location', 'text', locationOptions)}
                    {field('notes', 'Notes', 'textarea')}
                  </>
                )}
                {modal.type === 'ammo' && (
                  <>
                    {field('caliber', 'Caliber')}
                    {field('brand', 'Brand')}
                    {field('load_name', 'Load Name')}
                    {field('ammo_type', 'Type', 'text', [
                      { value: 'standard', label: 'Standard' },
                      { value: 'subsonic', label: 'Subsonic' },
                      { value: 'supersonic', label: 'Supersonic' },
                    ])}
                    {field('quantity', 'Quantity', 'number')}
                    {field('location_id', 'Location', 'text', locationOptions)}
                    {field('notes', 'Notes', 'textarea')}
                  </>
                )}
                {modal.type === 'vehicles' && (
                  <>
                    {field('name', 'Name')}
                    {field('vehicle_type', 'Type')}
                    {field('year', 'Year', 'number')}
                    {field('make', 'Make')}
                    {field('model', 'Model')}
                    {field('has_inventory', 'Has Inventory', 'checkbox')}
                    {field('notes', 'Notes', 'textarea')}
                  </>
                )}
                {modal.type === 'inventory' && (
                  <>
                    {field('name', 'Name')}
                    {field('category', 'Category')}
                    {field('quantity', 'Quantity', 'number')}
                    {field('unit', 'Unit')}
                    {field('min_threshold', 'Min Threshold', 'number')}
                    {field('expiration_date', 'Expiration Date', 'date')}
                    {field('location_id', 'Location', 'text', locationOptions)}
                    {field('notes', 'Notes', 'textarea')}
                  </>
                )}
                {modal.type === 'locations' && (
                  <>
                    {field('name', 'Name')}
                    {field('notes', 'Notes', 'textarea')}
                  </>
                )}
              </div>
              <div className="vig-modal-actions">
                <button className="vig-cancel-btn" onClick={(e) => { e.stopPropagation(); setModal(null); setFormData({}) }}>Cancel</button>
                <button className="vig-save-btn" onClick={(e) => { e.stopPropagation(); handleSave() }}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file input for CSV */}
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileSelected} />

        {/* Toast */}
        {toast && <div className="vig-toast">{toast}</div>}
      </div>
    </div>
  )
}

export default Vigilia
