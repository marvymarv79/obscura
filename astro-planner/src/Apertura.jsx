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

const WIZARD_STEPS = [
  { key: 'mount', label: 'Mount', required: true },
  { key: 'scope', label: 'Scope', required: true },
  { key: 'camera', label: 'Camera', required: true },
  { key: 'reducer', label: 'Reducer/Flattener', required: false },
  { key: 'filterwheel', label: 'Filter Wheel', required: false },
  { key: 'focuser', label: 'Focuser', required: false },
  { key: 'name', label: 'Name & Save', required: true },
]

// ── Inventory card components ──

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
          <span>{parseFloat(item.bandpass_width_nm)}nm @ {parseFloat(item.bandpass_nm)}nm</span>
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
        {item.reduction_factor && <span>{parseFloat(item.reduction_factor)}x</span>}
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

// ── Helpers ──

function computeSpecs(camera, optics, reducer) {
  if (!camera || !optics) return null
  const fl = parseFloat(optics.focal_length_mm)
  const rf = reducer ? parseFloat(reducer.reduction_factor) : 1
  const ps = parseFloat(camera.pixel_size_um)
  const rx = parseInt(camera.res_x)
  const ry = parseInt(camera.res_y)
  const effectiveFl = fl * rf
  const arcsecPerPixel = (ps * 206.265) / effectiveFl
  const fovW = (rx * ps / 1000.0) * 57.3 / effectiveFl
  const fovH = (ry * ps / 1000.0) * 57.3 / effectiveFl
  return { effectiveFl: Math.round(effectiveFl * 10) / 10, arcsecPerPixel: Math.round(arcsecPerPixel * 100) / 100, fovW: Math.round(fovW * 100) / 100, fovH: Math.round(fovH * 100) / 100 }
}

function isNinaUnsupported(cameraNotesOrProfileNotes) {
  return cameraNotesOrProfileNotes && cameraNotesOrProfileNotes.includes('NINA export not supported')
}

function generateNinaJson(profile, filterSetMembers) {
  const json = {
    ProfileName: profile.profile_name,
    Equipment: {
      Camera: {
        Name: profile.camera_model,
        PixelSize: parseFloat(profile.camera_pixel_size),
        Width: parseInt(profile.camera_res_x),
        Height: parseInt(profile.camera_res_y),
        BitDepth: parseInt(profile.bit_depth || 14),
        SensorType: profile.sensor_type,
        BayerPattern: profile.bayer_pattern || 'None',
      },
      Telescope: {
        FocalLength: parseFloat(profile.effective_fl),
        Aperture: parseFloat(profile.aperture_mm),
        FocalRatio: parseFloat(profile.focal_ratio),
      },
      Focuser: {
        StepSize: profile.focuser_steps ? parseInt(profile.focuser_steps) : null,
        ReverseDirection: false,
      },
    },
  }
  if (profile.filter_wheel_model && filterSetMembers && filterSetMembers.length > 0) {
    json.Equipment.FilterWheel = {
      Filters: filterSetMembers.map(m => ({
        Name: m.model,
        Slot: m.slot_number,
        Offset: 0,
      })),
    }
  }
  return json
}

// ── Main component ──

function Apertura() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('inventory')

  // Inventory state
  const [activeCategory, setActiveCategory] = useState('cameras')
  const [inventoryData, setInventoryData] = useState({})
  const [loadingCategories, setLoadingCategories] = useState({})
  const [errorCategories, setErrorCategories] = useState({})
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  // Shared
  const [toast, setToast] = useState(null)

  // Imaging Trains state
  const [profiles, setProfiles] = useState([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardSelections, setWizardSelections] = useState({
    mount: null, scope: null, camera: null,
    reducer: null, filterwheel: null, filterset: null,
    focuser: null, profileName: '',
  })
  const [filterSets, setFilterSets] = useState([])
  const [filterSetMembers, setFilterSetMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // NINA Export state
  const [selectedExportProfile, setSelectedExportProfile] = useState(null)
  const [exportFilterMembers, setExportFilterMembers] = useState([])
  const [copied, setCopied] = useState(false)

  const currentTab = TABS.find(t => t.key === activeTab)
  const currentCat = CATEGORIES.find(c => c.key === activeCategory)

  // ── Inventory data fetching ──

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

  const fetchAllInventory = useCallback(() => {
    CATEGORIES.forEach(cat => fetchCategory(cat))
  }, [fetchCategory])

  useEffect(() => {
    if (activeTab === 'inventory') {
      CATEGORIES.forEach(cat => {
        if (!inventoryData[cat.key] && !loadingCategories[cat.key]) {
          fetchCategory(cat)
        }
      })
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Profiles data ──

  const fetchProfiles = useCallback(async () => {
    setProfilesLoading(true)
    try {
      const res = await fetch('/api/apertura/profiles')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProfiles(data)
    } catch (err) {
      showToast(`Error loading profiles: ${err.message}`)
    } finally {
      setProfilesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'trains' || activeTab === 'nina') {
      fetchProfiles()
      // Also ensure inventory data is loaded for wizard
      CATEGORIES.forEach(cat => {
        if (!inventoryData[cat.key]) fetchCategory(cat)
      })
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toast ──

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // ── Inventory CSV import ──

  const handleImportCSV = () => { fileInputRef.current?.click() }

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

  // ── Wizard logic ──

  const startWizard = () => {
    setWizardSelections({ mount: null, scope: null, camera: null, reducer: null, filterwheel: null, filterset: null, focuser: null, profileName: '' })
    setWizardStep(0)
    setShowWizard(true)
    setFilterSets([])
    setFilterSetMembers([])
  }

  const wizardSelect = (key, item) => {
    setWizardSelections(prev => ({ ...prev, [key]: item }))
  }

  const wizardNext = () => {
    const nextStep = wizardStep + 1
    // Auto-skip filter wheel for OSC cameras
    if (WIZARD_STEPS[nextStep]?.key === 'filterwheel' && wizardSelections.camera?.sensor_type === 'OSC') {
      setWizardSelections(prev => ({ ...prev, filterwheel: null, filterset: null }))
      showToast('Filter wheel skipped — not needed for OSC cameras')
      setWizardStep(nextStep + 1)
      return
    }
    setWizardStep(nextStep)
  }

  const wizardBack = () => {
    const prevStep = wizardStep - 1
    if (prevStep < 0) return
    // Auto-skip filter wheel backwards for OSC cameras
    if (WIZARD_STEPS[prevStep]?.key === 'filterwheel' && wizardSelections.camera?.sensor_type === 'OSC') {
      setWizardStep(prevStep - 1)
      return
    }
    setWizardStep(prevStep)
  }

  const canProceed = () => {
    const step = WIZARD_STEPS[wizardStep]
    if (!step.required) return true
    if (step.key === 'mount') return !!wizardSelections.mount
    if (step.key === 'scope') return !!wizardSelections.scope
    if (step.key === 'camera') return !!wizardSelections.camera
    if (step.key === 'name') return wizardSelections.profileName.trim().length >= 3
    return true
  }

  const loadFilterSets = async () => {
    try {
      const [setsRes, membersRes] = await Promise.all([
        fetch('/api/apertura/filtersets'),
        fetch('/api/apertura/filtersetmembers'),
      ])
      if (setsRes.ok) setFilterSets(await setsRes.json())
      if (membersRes.ok) setFilterSetMembers(await membersRes.json())
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (showWizard && WIZARD_STEPS[wizardStep]?.key === 'filterwheel') {
      loadFilterSets()
    }
  }, [showWizard, wizardStep])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const body = {
        profile_name: wizardSelections.profileName.trim(),
        camera_id: wizardSelections.camera?.id || null,
        optics_id: wizardSelections.scope?.id || null,
        reducer_flattener_id: wizardSelections.reducer?.id || null,
        filter_wheel_id: wizardSelections.filterwheel?.id || null,
        filter_set_id: wizardSelections.filterset?.id || null,
        focuser_id: wizardSelections.focuser?.id || null,
        mount_id: wizardSelections.mount?.id || null,
      }
      const res = await fetch('/api/apertura/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      showToast('Profile saved!')
      setShowWizard(false)
      fetchProfiles()
    } catch (err) {
      showToast(`Save error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteProfile = async (id) => {
    try {
      const res = await fetch(`/api/apertura/profiles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      showToast('Profile deleted')
      setConfirmDeleteId(null)
      fetchProfiles()
    } catch (err) {
      showToast(`Delete error: ${err.message}`)
      setConfirmDeleteId(null)
    }
  }

  // ── NINA export ──

  const loadExportFilterMembers = async (filterSetId) => {
    if (!filterSetId) { setExportFilterMembers([]); return }
    try {
      const res = await fetch(`/api/apertura/filtersetmembers?set_id=${filterSetId}`)
      if (res.ok) setExportFilterMembers(await res.json())
    } catch { /* ignore */ }
  }

  const selectExportProfile = (p) => {
    setSelectedExportProfile(p)
    setCopied(false)
    loadExportFilterMembers(p.filter_set_id)
  }

  const downloadNinaJson = () => {
    if (!selectedExportProfile) return
    const json = generateNinaJson(selectedExportProfile, exportFilterMembers)
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedExportProfile.profile_name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    if (!selectedExportProfile) return
    const json = generateNinaJson(selectedExportProfile, exportFilterMembers)
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Computed values ──

  const items = inventoryData[activeCategory] || []
  const isLoading = loadingCategories[activeCategory]
  const error = errorCategories[activeCategory]
  const CardComponent = CARD_COMPONENTS[activeCategory]
  const wizardSpecs = computeSpecs(wizardSelections.camera, wizardSelections.scope, wizardSelections.reducer)
  const ninaEligibleProfiles = profiles.filter(p => !isNinaUnsupported(p.camera_notes))

  // ── Wizard step rendering ──

  const renderWizardStep = () => {
    const step = WIZARD_STEPS[wizardStep]

    if (step.key === 'mount') {
      const mounts = inventoryData.mounts || []
      return (
        <div className="apt-wizard-items">
          {mounts.map(m => (
            <div key={m.id} className={`apt-wizard-card ${wizardSelections.mount?.id === m.id ? 'selected' : ''}`} onClick={() => wizardSelect('mount', m)}>
              <h4>{m.model}</h4>
              {m.mount_type && <span className="apt-badge apt-badge--default">{m.mount_type}</span>}
              {m.payload_kg && <span className="apt-card-specs">{m.payload_kg} kg payload</span>}
            </div>
          ))}
          {mounts.length === 0 && <div className="apt-empty-msg">No mounts in inventory. Add one in the Inventory tab.</div>}
        </div>
      )
    }

    if (step.key === 'scope') {
      const scopes = (inventoryData.optics || []).filter(o => o.type !== 'Guide Scope')
      return (
        <div className="apt-wizard-items">
          {scopes.map(o => (
            <div key={o.id} className={`apt-wizard-card ${wizardSelections.scope?.id === o.id ? 'selected' : ''}`} onClick={() => wizardSelect('scope', o)}>
              <h4>{o.model}</h4>
              {o.type && <span className="apt-badge apt-badge--default">{o.type}</span>}
              <div className="apt-card-specs">
                <span>{o.focal_length_mm}mm</span>
                <span>ø{o.aperture_mm}mm</span>
                <span>f/{o.focal_ratio}</span>
              </div>
            </div>
          ))}
          {scopes.length === 0 && <div className="apt-empty-msg">No optics in inventory.</div>}
        </div>
      )
    }

    if (step.key === 'camera') {
      const cams = (inventoryData.cameras || []).filter(c => !(c.notes && c.notes.includes('Guide camera')))
      return (
        <div className="apt-wizard-items">
          {cams.map(c => (
            <div key={c.id} className={`apt-wizard-card ${wizardSelections.camera?.id === c.id ? 'selected' : ''}`} onClick={() => wizardSelect('camera', c)}>
              <h4>{c.model}</h4>
              <span className={`apt-badge ${c.sensor_type === 'Mono' ? 'apt-badge--crimson' : 'apt-badge--ember'}`}>{c.sensor_type}</span>
              <div className="apt-card-specs">
                <span>{c.res_x}×{c.res_y}</span>
                <span>{c.pixel_size_um}µm</span>
              </div>
              {isNinaUnsupported(c.notes) && <span className="apt-badge apt-badge--dim">FOV planning only</span>}
            </div>
          ))}
        </div>
      )
    }

    if (step.key === 'reducer') {
      const reducers = (inventoryData.accessories || []).filter(a => a.category === 'Reducer' || a.category === 'Flattener')
      const scopeModel = wizardSelections.scope?.model || ''
      return (
        <div className="apt-wizard-items">
          {reducers.map(r => {
            const isCompat = r.compatible_optics && scopeModel && r.compatible_optics.includes(scopeModel)
            return (
              <div key={r.id} className={`apt-wizard-card ${wizardSelections.reducer?.id === r.id ? 'selected' : ''} ${isCompat ? 'highlighted' : ''}`} onClick={() => wizardSelect('reducer', r)}>
                <h4>{r.model}</h4>
                {r.reduction_factor && <span className="apt-card-specs">{parseFloat(r.reduction_factor)}x reduction</span>}
                {isCompat && <span className="apt-badge apt-badge--green">Compatible</span>}
                {r.compatible_optics && <p className="apt-card-muted">{r.compatible_optics}</p>}
              </div>
            )
          })}
          {wizardSelections.scope && wizardSelections.reducer && (
            <div className="apt-wizard-preview">
              Effective FL: {Math.round(parseFloat(wizardSelections.scope.focal_length_mm) * parseFloat(wizardSelections.reducer.reduction_factor))}mm
              (was {wizardSelections.scope.focal_length_mm}mm)
            </div>
          )}
          {reducers.length === 0 && <div className="apt-empty-msg">No reducers/flatteners in inventory.</div>}
        </div>
      )
    }

    if (step.key === 'filterwheel') {
      const wheels = inventoryData.filterwheels || []
      return (
        <div className="apt-wizard-items">
          {wheels.map(fw => (
            <div key={fw.id} className={`apt-wizard-card ${wizardSelections.filterwheel?.id === fw.id ? 'selected' : ''}`} onClick={() => wizardSelect('filterwheel', fw)}>
              <h4>{fw.model}</h4>
              <span className="apt-card-specs">{fw.slot_count} slots</span>
            </div>
          ))}
          {wizardSelections.filterwheel && filterSets.length > 0 && (
            <div className="apt-wizard-filterset">
              <h4 className="apt-card-muted" style={{ marginBottom: 8 }}>Select filter set:</h4>
              {filterSets.map(fs => (
                <div key={fs.id} className={`apt-wizard-card ${wizardSelections.filterset?.id === fs.id ? 'selected' : ''}`} onClick={() => wizardSelect('filterset', fs)}>
                  <h4>{fs.set_name}</h4>
                  <div className="apt-card-specs">
                    {filterSetMembers.filter(m => m.set_id === fs.id).map(m => (
                      <span key={m.filter_id} style={{ color: FILTER_TYPE_COLORS[m.filter_type] || '#888' }}>{m.filter_type}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {wheels.length === 0 && <div className="apt-empty-msg">No filter wheels in inventory.</div>}
        </div>
      )
    }

    if (step.key === 'focuser') {
      const focusers = inventoryData.focusers || []
      return (
        <div className="apt-wizard-items">
          {focusers.map(f => (
            <div key={f.id} className={`apt-wizard-card ${wizardSelections.focuser?.id === f.id ? 'selected' : ''}`} onClick={() => wizardSelect('focuser', f)}>
              <h4>{f.model}</h4>
              {f.connection_type && <span className="apt-badge apt-badge--default">{f.connection_type}</span>}
              {f.steps_per_rotation && <span className="apt-card-specs">{f.steps_per_rotation} steps/rev</span>}
            </div>
          ))}
          {focusers.length === 0 && <div className="apt-empty-msg">No focusers in inventory.</div>}
        </div>
      )
    }

    if (step.key === 'name') {
      const cam = wizardSelections.camera
      const isFovOnly = isNinaUnsupported(cam?.notes)
      const workflow = cam?.sensor_type === 'Mono' && wizardSelections.filterwheel ? 'LRGB+NB' : isFovOnly ? 'FOV planning only' : 'OSC broadband'
      return (
        <div className="apt-wizard-name">
          <label className="apt-wizard-label">Profile name</label>
          <input className="apt-wizard-input" type="text" value={wizardSelections.profileName} onChange={e => setWizardSelections(prev => ({ ...prev, profileName: e.target.value }))} placeholder="e.g. Evostar 72 + ASI2600MM" />
          <div className="apt-wizard-summary">
            <h4>Summary</h4>
            <div className="apt-summary-row"><span>Mount:</span> <span>{wizardSelections.mount?.model}</span></div>
            <div className="apt-summary-row"><span>Scope:</span> <span>{wizardSelections.scope?.model}</span></div>
            <div className="apt-summary-row"><span>Camera:</span> <span>{wizardSelections.camera?.model}</span></div>
            {wizardSelections.reducer && <div className="apt-summary-row"><span>Reducer:</span> <span>{wizardSelections.reducer.model}</span></div>}
            {wizardSelections.filterwheel && <div className="apt-summary-row"><span>Filter Wheel:</span> <span>{wizardSelections.filterwheel.model}</span></div>}
            {wizardSelections.filterset && <div className="apt-summary-row"><span>Filter Set:</span> <span>{wizardSelections.filterset.set_name}</span></div>}
            {wizardSelections.focuser && <div className="apt-summary-row"><span>Focuser:</span> <span>{wizardSelections.focuser.model}</span></div>}
            {wizardSpecs && (
              <>
                <hr className="apt-summary-divider" />
                <div className="apt-summary-row"><span>Effective FL:</span> <span>{wizardSpecs.effectiveFl}mm</span></div>
                <div className="apt-summary-row"><span>Image scale:</span> <span>{wizardSpecs.arcsecPerPixel}″/px</span></div>
                <div className="apt-summary-row"><span>FOV:</span> <span>{wizardSpecs.fovW}° × {wizardSpecs.fovH}°</span></div>
                <div className="apt-summary-row"><span>Sensor:</span> <span>{cam?.sensor_type}</span></div>
                <div className="apt-summary-row"><span>Workflow:</span> <span>{workflow}</span></div>
              </>
            )}
          </div>
          <div className="apt-wizard-actions">
            <button className="apt-btn-primary" onClick={saveProfile} disabled={!canProceed() || saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
            <button className="apt-btn-ghost" onClick={() => { setShowWizard(false) }}>Start Over</button>
          </div>
        </div>
      )
    }

    return null
  }

  // ── Render ──

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
          {/* ── Inventory Tab ── */}
          {activeTab === 'inventory' && (
            <div className="apt-inventory">
              <aside className="apt-sidebar">
                {CATEGORIES.map(cat => (
                  <button key={cat.key} className={`apt-sidebar-item ${activeCategory === cat.key ? 'active' : ''}`} onClick={() => setActiveCategory(cat.key)}>
                    <span>{cat.label}</span>
                    <span className="apt-sidebar-count">{inventoryData[cat.key] ? inventoryData[cat.key].length : '—'}</span>
                  </button>
                ))}
              </aside>
              <div className="apt-inventory-content">
                <div className="apt-inventory-header">
                  <h2 className="apt-inventory-title">{currentCat.label}</h2>
                  <div className="apt-inventory-actions">
                    <button className="apt-import-btn" onClick={handleImportCSV} disabled={importing}>
                      {importing ? 'Importing…' : 'Import CSV'}
                    </button>
                    <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileSelected} />
                  </div>
                </div>
                {error ? (
                  <div className="apt-error-msg">Could not load {currentCat.label.toLowerCase()} — try refreshing.</div>
                ) : (
                  <div className="apt-item-grid">
                    {isLoading ? <SkeletonCards /> : items.length === 0 ? (
                      <div className="apt-empty-msg">No {currentCat.label.toLowerCase()} in inventory yet.</div>
                    ) : items.map(item => <CardComponent key={item.id} item={item} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Imaging Trains Tab ── */}
          {activeTab === 'trains' && (
            <div className="apt-trains">
              <div className="apt-trains-list">
                <div className="apt-trains-header">
                  <h2 className="apt-inventory-title">Imaging Trains</h2>
                  <button className="apt-btn-primary" onClick={startWizard}>New Imaging Train</button>
                </div>
                {profilesLoading ? (
                  <div className="apt-item-grid"><SkeletonCards /></div>
                ) : profiles.length === 0 ? (
                  <div className="apt-empty-msg">No imaging trains saved yet. Build your first one →</div>
                ) : (
                  <div className="apt-profile-list">
                    {profiles.map(p => (
                      <div key={p.id} className="apt-profile-item">
                        <div className="apt-profile-info">
                          <h3 className="apt-card-model">{p.profile_name}</h3>
                          <p className="apt-card-muted" style={{ fontSize: 12 }}>
                            {p.camera_model} → {p.optics_model}
                            {p.effective_fl && ` (${Math.round(parseFloat(p.effective_fl))}mm)`}
                          </p>
                          <div className="apt-card-specs" style={{ marginTop: 4 }}>
                            {p.fov_width_deg && p.fov_height_deg && (
                              <span className="apt-badge apt-badge--default">{parseFloat(p.fov_width_deg).toFixed(2)}° × {parseFloat(p.fov_height_deg).toFixed(2)}°</span>
                            )}
                            {p.arcsec_per_pixel && (
                              <span className="apt-badge apt-badge--default">{parseFloat(p.arcsec_per_pixel).toFixed(2)}″/px</span>
                            )}
                          </div>
                          {isNinaUnsupported(p.camera_notes) && (
                            <span className="apt-badge apt-badge--dim" style={{ marginTop: 4 }}>NINA export not supported</span>
                          )}
                        </div>
                        {confirmDeleteId === p.id ? (
                          <div className="apt-confirm-delete">
                            <button className="apt-confirm-yes" onClick={() => deleteProfile(p.id)}>Delete?</button>
                            <button className="apt-confirm-no" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="apt-delete-btn" onClick={() => setConfirmDeleteId(p.id)} title="Delete profile">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showWizard && (
                <div className="apt-wizard">
                  <div className="apt-wizard-progress">
                    {WIZARD_STEPS.map((s, i) => {
                      if (s.key === 'filterwheel' && wizardSelections.camera?.sensor_type === 'OSC') {
                        return <span key={s.key} className="apt-step skipped">{s.label}</span>
                      }
                      return (
                        <span key={s.key} className={`apt-step ${i === wizardStep ? 'active' : i < wizardStep ? 'done' : ''}`}>
                          {s.label}
                        </span>
                      )
                    })}
                  </div>
                  <h3 className="apt-wizard-title">{WIZARD_STEPS[wizardStep].label}</h3>
                  {renderWizardStep()}
                  {WIZARD_STEPS[wizardStep].key !== 'name' && (
                    <div className="apt-wizard-nav">
                      {wizardStep > 0 && <button className="apt-btn-ghost" onClick={wizardBack}>← Back</button>}
                      {!WIZARD_STEPS[wizardStep].required && (
                        <button className="apt-btn-ghost" onClick={() => { wizardSelect(WIZARD_STEPS[wizardStep].key, null); wizardNext() }}>Skip</button>
                      )}
                      <button className="apt-btn-primary" onClick={wizardNext} disabled={!canProceed()}>Next →</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── NINA Export Tab ── */}
          {activeTab === 'nina' && (
            <div className="apt-nina">
              <div className="apt-nina-list">
                <h2 className="apt-inventory-title">NINA Profiles</h2>
                {ninaEligibleProfiles.length === 0 ? (
                  <div className="apt-empty-msg">No NINA-eligible profiles. Create an imaging train with a supported camera first.</div>
                ) : (
                  <div className="apt-profile-list">
                    {ninaEligibleProfiles.map(p => (
                      <div key={p.id} className={`apt-profile-item clickable ${selectedExportProfile?.id === p.id ? 'selected' : ''}`} onClick={() => selectExportProfile(p)}>
                        <div className="apt-profile-info">
                          <h3 className="apt-card-model">{p.profile_name}</h3>
                          <p className="apt-card-muted" style={{ fontSize: 12 }}>
                            {p.camera_model} → {p.optics_model}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="apt-nina-preview">
                {!selectedExportProfile ? (
                  <div className="apt-empty-msg">Select a profile to preview its NINA export.</div>
                ) : (
                  <>
                    <div className="apt-nina-summary">
                      <h3>{selectedExportProfile.profile_name}</h3>
                      <div className="apt-card-specs">
                        {selectedExportProfile.effective_fl && <span>FL: {Math.round(parseFloat(selectedExportProfile.effective_fl))}mm</span>}
                        {selectedExportProfile.arcsec_per_pixel && <span>{parseFloat(selectedExportProfile.arcsec_per_pixel).toFixed(2)}″/px</span>}
                        {selectedExportProfile.fov_width_deg && <span>{parseFloat(selectedExportProfile.fov_width_deg).toFixed(2)}° × {parseFloat(selectedExportProfile.fov_height_deg).toFixed(2)}°</span>}
                      </div>
                    </div>
                    <div className="apt-nina-json">
                      <pre>{JSON.stringify(generateNinaJson(selectedExportProfile, exportFilterMembers), null, 2)}</pre>
                    </div>
                    <div className="apt-nina-actions">
                      <button className="apt-btn-primary" onClick={downloadNinaJson}>Download .json</button>
                      <button className="apt-btn-ghost" onClick={copyToClipboard}>{copied ? 'Copied!' : 'Copy to clipboard'}</button>
                    </div>
                    <div className="apt-nina-instructions">
                      <h4>To use this profile in NINA:</h4>
                      <ol>
                        <li>Download the .json file above</li>
                        <li>Open File Explorer and navigate to:<br /><code>%LocalAppData%\NINA\Profiles</code><br /><span className="apt-card-muted">(paste this path directly into the File Explorer address bar)</span></li>
                        <li>Copy the downloaded .json file into this folder</li>
                        <li>Open NINA → Options → Profiles</li>
                        <li>Your new profile will appear in the list</li>
                        <li>Select it and verify your equipment settings</li>
                      </ol>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Settings Tab (placeholder) ── */}
          {activeTab === 'settings' && (
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
