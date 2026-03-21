import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser
} from '@clerk/clerk-react'
import Papa from 'papaparse'
import './Apertura.css'

const TABS = [
  { key: 'inventory', label: 'Inventory', desc: 'Manage your cameras, optics, filters, and accessories' },
  { key: 'trains', label: 'Imaging Trains', desc: 'Build and save imaging train configurations' },
  { key: 'nina', label: 'NINA Export', desc: 'Generate NINA profiles from your imaging trains' },
  { key: 'settings', label: 'Settings', desc: 'Configure Apertura preferences' },
]

const CATEGORIES = [
  { key: 'cameras', label: 'Cameras', endpoint: '/api/apertura/cameras', importEndpoint: '/api/apertura/import/cameras' },
  { key: 'optics', label: 'Optics', endpoint: '/api/apertura/optics', importEndpoint: '/api/apertura/import/optics' },
  { key: 'filters', label: 'Filters', endpoint: '/api/apertura/filters', importEndpoint: '/api/apertura/import/filters' },
  { key: 'filterwheels', label: 'Filter Wheels', endpoint: '/api/apertura/filterwheels', importEndpoint: '/api/apertura/import/filterwheels' },
  { key: 'accessories', label: 'Accessories', endpoint: '/api/apertura/accessories', importEndpoint: '/api/apertura/import/accessories' },
  { key: 'mounts', label: 'Mounts', endpoint: '/api/apertura/mounts', importEndpoint: '/api/apertura/import/mounts' },
  { key: 'focusers', label: 'Focusers', endpoint: '/api/apertura/focusers', importEndpoint: '/api/apertura/import/focusers' },
]

const FILTER_TYPE_COLORS = {
  L: '#888', R: '#e05050', G: '#50b060', B: '#5080e0',
  Ha: 'var(--accent-crimson)', SII: '#d4880a', OIII: '#40b0b0', CLS: '#9060c0',
  'Dual-band': '#b060a0', 'UV-IR': '#7070a0',
}

function SkeletonCards() {
  return (
    <>
      {[1, 2, 3].map(i => (
        <div key={i} className="apt-item-card apt-skeleton-card">
          <div className="apt-skeleton-bar" style={{ width: '70%', height: 16 }} />
          <div className="apt-skeleton-bar" style={{ width: '40%', height: 12, marginTop: 8 }} />
          <div className="apt-skeleton-bar" style={{ width: '90%', height: 12, marginTop: 8 }} />
        </div>
      ))}
    </>
  )
}

function CameraCard({ item }) {
  return (
    <div className="apt-item-card">
      <div className="apt-card-accent" />
      <h3 className="apt-card-model">{item.model}</h3>
      <span className={`apt-badge ${item.sensor_type === 'Mono' ? 'apt-badge--crimson' : 'apt-badge--ember'}`}>
        {item.sensor_type}
      </span>
      <div className="apt-card-specs">
        {item.res_x && item.res_y && <span>{item.res_x}×{item.res_y}</span>}
        {item.pixel_size_um && <span>{item.pixel_size_um}µm</span>}
        {item.bit_depth && <span>{item.bit_depth}-bit</span>}
      </div>
      {item.sensor_chip && <p className="apt-card-muted">{item.sensor_chip}</p>}
    </div>
  )
}

function OpticsCard({ item }) {
  return (
    <div className="apt-item-card">
      <div className="apt-card-accent" />
      <h3 className="apt-card-model">{item.model}</h3>
      {item.type && <span className="apt-badge apt-badge--default">{item.type}</span>}
      <div className="apt-card-specs">
        {item.focal_length_mm && <span>{item.focal_length_mm}mm</span>}
        {item.aperture_mm && <span>ø{item.aperture_mm}mm</span>}
        {item.focal_ratio && <span>f/{item.focal_ratio}</span>}
      </div>
      {item.notes && <p className="apt-card-muted">{item.notes}</p>}
    </div>
  )
}

function FilterCard({ item }) {
  const color = FILTER_TYPE_COLORS[item.filter_type] || '#888'
  return (
    <div className="apt-item-card">
      <div className="apt-card-accent" />
      <h3 className="apt-card-model">{item.model}</h3>
      <span className="apt-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
        {item.filter_type}
      </span>
      {item.bandpass_nm && (
        <div className="apt-card-specs">
          <span>{item.bandpass_width_nm}nm @ {item.bandpass_nm}nm</span>
          {item.transmission_pct && <span>{item.transmission_pct}% T</span>}
        </div>
      )}
      {item.size_description && <p className="apt-card-muted">{item.size_description}</p>}
    </div>
  )
}

function FilterWheelCard({ item }) {
  return (
    <div className="apt-item-card">
      <div className="apt-card-accent" />
      <h3 className="apt-card-model">{item.model}</h3>
      {item.slot_count && <div className="apt-card-specs"><span>{item.slot_count} slots</span></div>}
      {item.compatible_filter_sizes && <p className="apt-card-muted">{item.compatible_filter_sizes}</p>}
    </div>
  )
}

function AccessoryCard({ item }) {
  return (
    <div className="apt-item-card">
      <div className="apt-card-accent" />
      <h3 className="apt-card-model">{item.model}</h3>
      {item.category && <span className="apt-badge apt-badge--default">{item.category}</span>}
      <div className="apt-card-specs">
        {item.reduction_factor && <span>{item.reduction_factor}x</span>}
      </div>
      {item.compatible_optics && <p className="apt-card-muted">{item.compatible_optics}</p>}
    </div>
  )
}

function MountCard({ item }) {
  return (
    <div className="apt-item-card">
      <div className="apt-card-accent" />
      <h3 className="apt-card-model">{item.model}</h3>
      {item.mount_type && <span className="apt-badge apt-badge--default">{item.mount_type}</span>}
      {item.payload_kg && <div className="apt-card-specs"><span>{item.payload_kg} kg</span></div>}
    </div>
  )
}

function FocuserCard({ item }) {
  return (
    <div className="apt-item-card">
      <div className="apt-card-accent" />
      <h3 className="apt-card-model">{item.model}</h3>
      {item.connection_type && <span className="apt-badge apt-badge--default">{item.connection_type}</span>}
      <div className="apt-card-specs">
        {item.steps_per_rotation && <span>{item.steps_per_rotation} steps/rev</span>}
      </div>
    </div>
  )
}

const CARD_COMPONENTS = {
  cameras: CameraCard,
  optics: OpticsCard,
  filters: FilterCard,
  filterwheels: FilterWheelCard,
  accessories: AccessoryCard,
  mounts: MountCard,
  focusers: FocuserCard,
}

function Apertura() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('inventory')
  const [activeCategory, setActiveCategory] = useState('cameras')
  const [inventoryData, setInventoryData] = useState({})
  const [loadingCategories, setLoadingCategories] = useState({})
  const [errorCategories, setErrorCategories] = useState({})
  const [toast, setToast] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  const currentTab = TABS.find(t => t.key === activeTab)
  const currentCat = CATEGORIES.find(c => c.key === activeCategory)

  const fetchCategory = useCallback(async (cat) => {
    setLoadingCategories(prev => ({ ...prev, [cat.key]: true }))
    setErrorCategories(prev => ({ ...prev, [cat.key]: null }))
    try {
      const res = await fetch(cat.endpoint)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setInventoryData(prev => ({ ...prev, [cat.key]: data }))
    } catch (err) {
      setErrorCategories(prev => ({ ...prev, [cat.key]: err.message }))
    } finally {
      setLoadingCategories(prev => ({ ...prev, [cat.key]: false }))
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'inventory') {
      CATEGORIES.forEach(cat => {
        if (!inventoryData[cat.key] && !loadingCategories[cat.key]) {
          fetchCategory(cat)
        }
      })
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const handleImportCSV = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImporting(true)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      if (parsed.errors.length > 0) {
        showToast(`CSV parse error: ${parsed.errors[0].message}`)
        setImporting(false)
        return
      }
      const res = await fetch(currentCat.importEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed.data }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Import failed')
      showToast(`Imported ${result.imported} items, skipped ${result.skipped} duplicates`)
      fetchCategory(currentCat)
    } catch (err) {
      showToast(`Import error: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const items = inventoryData[activeCategory] || []
  const isLoading = loadingCategories[activeCategory]
  const error = errorCategories[activeCategory]
  const CardComponent = CARD_COMPONENTS[activeCategory]

  return (
    <div className="apertura">
      <SignedOut>
        <div className="apertura-signin">
          <h2>Sign in to use Apertura</h2>
          <SignInButton mode="modal">
            <button className="apertura-signin-btn">Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <nav className="apt-top-nav">
          <div className="apt-nav-left">
            <Link to="/" className="nav-hub-link">&larr; Hub</Link>
            <a className="apt-nav-home" onClick={() => navigate('/')}>
              <svg className="apt-nav-logo-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              <span className="apt-nav-wordmark">Aper<span className="apt-nav-accent">tura</span></span>
            </a>
          </div>
          <div className="apt-nav-center">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`apt-nav-pill ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="apt-nav-right">
            <div className="apt-nav-avatar">{user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}</div>
            <UserButton />
          </div>
        </nav>

        <div className="apt-content">
          {activeTab === 'inventory' ? (
            <div className="apt-inventory">
              <aside className="apt-sidebar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    className={`apt-sidebar-item ${activeCategory === cat.key ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.key)}
                  >
                    <span>{cat.label}</span>
                    <span className="apt-sidebar-count">
                      {inventoryData[cat.key] ? inventoryData[cat.key].length : '—'}
                    </span>
                  </button>
                ))}
              </aside>
              <div className="apt-inventory-content">
                <div className="apt-inventory-header">
                  <h2 className="apt-inventory-title">{currentCat.label}</h2>
                  <div className="apt-inventory-actions">
                    <button
                      className="apt-import-btn"
                      onClick={handleImportCSV}
                      disabled={importing}
                    >
                      {importing ? 'Importing…' : 'Import CSV'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={handleFileSelected}
                    />
                  </div>
                </div>
                {error ? (
                  <div className="apt-error-msg">
                    Could not load {currentCat.label.toLowerCase()} — try refreshing.
                  </div>
                ) : (
                  <div className="apt-item-grid">
                    {isLoading ? (
                      <SkeletonCards />
                    ) : items.length === 0 ? (
                      <div className="apt-empty-msg">No {currentCat.label.toLowerCase()} in inventory yet.</div>
                    ) : (
                      items.map(item => <CardComponent key={item.id} item={item} />)
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="apt-placeholder-card">
              <h2 className="apt-placeholder-heading">{currentTab.label}</h2>
              <p className="apt-placeholder-desc">{currentTab.desc}</p>
            </div>
          )}
        </div>

        {toast && <div className="apt-toast">{toast}</div>}
      </SignedIn>
    </div>
  )
}

export default Apertura
