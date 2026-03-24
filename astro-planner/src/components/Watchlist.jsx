import { useState, useEffect, useCallback } from 'react'
import { getImagingWindow, getFilterSequence, getTransitTime } from '../targetEngine.js'
import './Watchlist.css'

const TYPE_COLORS = {
  'EN': 'var(--accent-crimson)', 'RN': '#3b82f6', 'Galaxy': '#8b5cf6',
  'GGroup': '#8b5cf6', 'GCl': '#f59e0b', 'OCl': 'var(--accent-green)',
  'PN': '#06b6d4', 'SNR': 'var(--accent-ember)'
}
const TYPE_LABELS = {
  'EN': 'Emission Nebula', 'RN': 'Reflection Nebula', 'Galaxy': 'Galaxy',
  'GGroup': 'Galaxy Group', 'GCl': 'Globular Cluster', 'OCl': 'Open Cluster',
  'PN': 'Planetary Nebula', 'SNR': 'Supernova Remnant'
}
const FILTER_COLORS = {
  'L': '#888', 'R': '#ef4444', 'G': '#22c55e', 'B': '#3b82f6',
  'Ha': 'var(--accent-crimson)', 'SII': '#f59e0b', 'OIII': '#06b6d4',
  'OSC': 'var(--accent-ember)'
}

function getPreviewUrl(targetId, raDeg, decDeg) {
  if (targetId) return `/api/obscura/preview-proxy?targetId=${targetId}`
  if (raDeg && decDeg) return `/api/obscura/preview-proxy?ra=${raDeg}&dec=${decDeg}`
  return null
}

function getScoreColor(score) {
  if (score >= 75) return 'var(--accent-green)'
  if (score >= 50) return 'var(--accent-ember)'
  return 'var(--accent-crimson)'
}

function VisibilityCalendar({ raDeg, decDeg, lat, lng, minAlt }) {
  const [days, setDays] = useState([])

  useEffect(() => {
    const ra = parseFloat(raDeg)
    const dec = parseFloat(decDeg)
    if (isNaN(ra) || isNaN(dec) || !lat || !lng) return

    const result = []
    const today = new Date()
    for (let d = 0; d < 30; d++) {
      const date = new Date(today)
      date.setDate(date.getDate() + d)
      const w = getImagingWindow(ra, dec, lat, lng, date, minAlt || 25)
      result.push({
        date,
        duration: w ? w.duration_minutes : 0,
        isToday: d === 0
      })
    }
    setDays(result)
  }, [raDeg, decDeg, lat, lng, minAlt])

  const getColor = (dur) => {
    if (dur >= 360) return '#10b95a'
    if (dur >= 180) return '#10b95a80'
    if (dur > 0) return '#10b95a30'
    return '#1d2230'
  }

  return (
    <div className="vis-calendar">
      <div className="vis-label">Visibility next 30 nights (geometry only beyond forecast window)</div>
      <div className="vis-grid">
        {days.map((d, i) => (
          <div key={i} className={`vis-cell ${d.isToday ? 'today' : ''}`}
            style={{ background: getColor(d.duration) }}
            title={`${d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${d.duration > 0 ? Math.round(d.duration / 60) + 'h' : 'not visible'}`} />
        ))}
      </div>
      <div className="vis-legend">
        <span><span className="vis-dot" style={{ background: '#10b95a' }} /> Good</span>
        <span><span className="vis-dot" style={{ background: '#10b95a80' }} /> Marginal</span>
        <span><span className="vis-dot" style={{ background: '#10b95a30' }} /> Poor</span>
        <span><span className="vis-dot vis-today-dot" /> Today</span>
      </div>
    </div>
  )
}

/*
 * IMPORTANT: Buttons inside clickable parent cards
 * MUST call e.stopPropagation() on their onClick handler.
 * Without it, the parent card's click handler fires
 * instead of the button's, causing silent failures.
 *
 * Correct pattern:
 * <button onClick={(e) => {
 *   e.stopPropagation();
 *   handleAction();
 * }}>
 *
 * This has been a recurring bug — always add
 * stopPropagation() to any button inside a
 * clickable container.
 */
export default function Watchlist({ get, post, coords, utcOffsetMinutes, forecastScore, onAddToPlan, onPlanCreated }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [qualifying, setQualifying] = useState([])
  const [toast, setToast] = useState(null)
  const [showBrowser, setShowBrowser] = useState(false)
  const [browserTargets, setBrowserTargets] = useState([])
  const [browserLoading, setBrowserLoading] = useState(false)
  const [browserSearch, setBrowserSearch] = useState('')
  const [browserType, setBrowserType] = useState('all')
  const [browserOffset, setBrowserOffset] = useState(0)
  const [browserHasMore, setBrowserHasMore] = useState(false)
  const [searchTimer, setSearchTimer] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const loadWatchlist = useCallback(async () => {
    setLoading(true)
    try {
      const data = await get('/api/watchlist')
      setEntries(Array.isArray(data) ? data : [])
    } catch {
      setEntries([])
    }
    setLoading(false)
  }, [get])

  const checkAlerts = useCallback(async () => {
    if (!coords) return
    try {
      const params = new URLSearchParams({
        lat: coords.latitude, lng: coords.longitude,
        forecastScore: forecastScore || 0
      })
      const data = await get(`/api/watchlist/check?${params}`)
      setQualifying(Array.isArray(data) ? data : [])
    } catch {
      setQualifying([])
    }
  }, [get, coords, forecastScore])

  useEffect(() => { loadWatchlist() }, [loadWatchlist])
  useEffect(() => { checkAlerts() }, [checkAlerts])

  const addToWatchlist = async (targetId) => {
    try {
      await post('/api/watchlist', { targetId })
      showToast('Added to watchlist')
      loadWatchlist()
      setShowBrowser(false)
    } catch (e) {
      if (e.message?.includes('409')) showToast('Already in watchlist')
      else showToast('Could not add to watchlist')
    }
  }

  const removeFromWatchlist = async (watchlistId) => {
    try {
      await post('/api/watchlist/delete', { watchlistId })
      setEntries(prev => prev.filter(e => e.id !== watchlistId))
      if (selected?.id === watchlistId) setSelected(null)
      showToast('Removed from watchlist')
    } catch {
      showToast('Could not remove')
    }
  }

  const toggleAlert = async (entry) => {
    try {
      const updated = await post('/api/watchlist/update', {
        watchlistId: entry.id,
        alertsEnabled: !entry.alerts_enabled
      })
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, alerts_enabled: updated.alerts_enabled } : e))
      if (selected?.id === entry.id) setSelected(prev => ({ ...prev, alerts_enabled: updated.alerts_enabled }))
    } catch {
      showToast('Could not update alert')
    }
  }

  const updatePlannedNights = async (entry, nights) => {
    try {
      const updated = await post('/api/watchlist/update', {
        watchlistId: entry.id,
        plannedNights: nights
      })
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, planned_nights: updated.planned_nights } : e))
      if (selected?.id === entry.id) setSelected(prev => ({ ...prev, planned_nights: updated.planned_nights }))
    } catch {
      showToast('Could not update')
    }
  }

  const fetchCatalog = useCallback(async (search, type, offset = 0, append = false) => {
    setBrowserLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', offset: String(offset) })
      if (search) params.set('search', search)
      if (type && type !== 'all') params.set('type', type)
      const resp = await fetch(`/api/obscura/catalog?${params}`)
      if (resp.ok) {
        const data = await resp.json()
        if (append) {
          setBrowserTargets(prev => [...prev, ...data])
        } else {
          setBrowserTargets(data)
        }
        setBrowserHasMore(data.length === 50)
        setBrowserOffset(offset + data.length)
      }
    } catch {
      if (!append) setBrowserTargets([])
    }
    setBrowserLoading(false)
  }, [])

  const openBrowser = () => {
    setShowBrowser(true)
    setBrowserSearch('')
    setBrowserType('all')
    setBrowserOffset(0)
    fetchCatalog('', 'all', 0)
  }

  const handleBrowserSearch = (value) => {
    setBrowserSearch(value)
    if (searchTimer) clearTimeout(searchTimer)
    setSearchTimer(setTimeout(() => {
      setBrowserOffset(0)
      fetchCatalog(value, browserType, 0)
    }, 300))
  }

  const handleBrowserTypeFilter = (type) => {
    setBrowserType(type)
    setBrowserOffset(0)
    fetchCatalog(browserSearch, type, 0)
  }

  const loadMoreCatalog = () => {
    fetchCatalog(browserSearch, browserType, browserOffset, true)
  }

  const handleAddToPlan = async (entry) => {
    if (!coords) {
      showToast('Load a location first')
      return
    }
    if (!onAddToPlan) {
      showToast('Could not add to plan — not signed in')
      return
    }
    const tonight = new Date().toISOString().split('T')[0]
    try {
      const planData = {
        name: `Session ${tonight}`,
        planDate: tonight,
        locationName: coords.locationName || 'Unknown',
        latitude: coords.latitude,
        longitude: coords.longitude,
        targets: [{
          targetId: entry.ngc_ic_id,
          targetName: entry.common_name || entry.ngc_ic_id,
          priority: 1,
          visibilityScore: null,
          notes: null
        }]
      }
      await onAddToPlan(planData)
      showToast('Added to tonight\'s plan')
      if (onPlanCreated) onPlanCreated()
    } catch (err) {
      showToast('Could not add to plan — ' + (err?.message || 'try again'))
    }
  }

  // Compute tonight's data for selected target
  const getSelectedNightData = () => {
    if (!selected || !coords) return null
    const ra = parseFloat(selected.ra_deg)
    const dec = parseFloat(selected.dec_deg)
    const lat = coords.latitude
    const lng = coords.longitude
    const offset = utcOffsetMinutes || 0

    const nights = []
    for (let d = 0; d < 3; d++) {
      const date = new Date()
      date.setDate(date.getDate() + d)
      const w = getImagingWindow(ra, dec, lat, lng, date, 25)
      const transit = getTransitTime(ra, lat, lng, date)
      const cameraType = selected.best_imaging_type === 'narrowband' ? 'Mono' : 'OSC'
      const filters = w ? getFilterSequence({ best_imaging_type: selected.best_imaging_type }, w, transit, cameraType, offset) : []

      nights.push({
        date,
        label: d === 0 ? 'Tonight' : d === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        window: w,
        transit,
        filters,
        meetsThreshold: w && w.duration_minutes >= 360
      })
    }
    return nights
  }

  // Multi-night plan for selected target
  const getMultiNightPlan = () => {
    if (!selected || !coords) return []
    const ra = parseFloat(selected.ra_deg)
    const dec = parseFloat(selected.dec_deg)
    const lat = coords.latitude
    const lng = coords.longitude
    const offset = utcOffsetMinutes || 0
    const plannedNights = selected.planned_nights || 1

    const plan = []
    let nightsFound = 0
    for (let d = 0; d < 30 && nightsFound < plannedNights; d++) {
      const date = new Date()
      date.setDate(date.getDate() + d)
      const w = getImagingWindow(ra, dec, lat, lng, date, 25)
      if (!w || w.duration_minutes < 60) continue

      const transit = getTransitTime(ra, lat, lng, date)
      const cameraType = selected.best_imaging_type === 'narrowband' ? 'Mono' : 'OSC'
      const filters = getFilterSequence({ best_imaging_type: selected.best_imaging_type }, w, transit, cameraType, offset)
      const totalSubs = filters.reduce((s, b) => s + b.estimatedSubs, 0)

      plan.push({
        night: nightsFound + 1,
        date,
        label: d <= 2
          ? (d === 0 ? 'Tonight' : d === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
          : 'Next good night',
        duration: w.duration_minutes,
        filters,
        totalSubs,
        inForecast: d <= 2
      })
      nightsFound++
    }
    return plan
  }

  const selectedNights = selected ? getSelectedNightData() : null
  const multiNightPlan = selected ? getMultiNightPlan() : null

  const isQualifying = (targetId) => qualifying.some(q => q.targetId === targetId)

  return (
    <div className="watchlist-container">
      {toast && <div className="watchlist-toast">{toast}</div>}

      {/* Alert banner */}
      {qualifying.length > 0 && (
        <div className="watchlist-alert-banner">
          {qualifying.length} watchlisted target{qualifying.length !== 1 ? 's' : ''} meet{qualifying.length === 1 ? 's' : ''} your threshold tonight
        </div>
      )}

      <div className="watchlist-panels">
        {/* Left panel */}
        <div className="watchlist-left">
          <div className="wl-header">
            <span className="wl-title">Watchlist</span>
            <button className="wl-add-btn" onClick={(e) => { e.stopPropagation(); openBrowser() }}>+ Add</button>
          </div>

          {loading ? (
            <div className="wl-skeleton">
              {[1, 2, 3].map(i => <div key={i} className="wl-skeleton-card" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="wl-empty">
              <p>Your watchlist is empty.</p>
              <p>Add targets from the Targets tab to get notified when conditions are right.</p>
              <button className="wl-add-first" onClick={(e) => { e.stopPropagation(); openBrowser() }}>+ Add your first target</button>
            </div>
          ) : (
            <div className="wl-list">
              {entries.map(entry => (
                <div key={entry.id}
                  className={`wl-item ${selected?.id === entry.id ? 'selected' : ''} ${isQualifying(entry.target_id) ? 'qualifying' : ''}`}
                  onClick={() => setSelected(entry)}>
                  <img
                    className="wl-thumb"
                    src={getPreviewUrl(entry.target_id, entry.ra_deg, entry.dec_deg)}
                    alt="" loading="lazy" />
                  <div className="wl-item-info">
                    <div className="wl-item-name">{entry.messier_number ? `M${entry.messier_number} · ${entry.ngc_ic_id}` : entry.ngc_ic_id}</div>
                    {entry.common_name && <div className="wl-item-common">{entry.common_name}</div>}
                    <div className="wl-item-meta">
                      <span className="wl-type-badge" style={{ background: TYPE_COLORS[entry.object_type] || '#666' }}>
                        {TYPE_LABELS[entry.object_type] || entry.object_type}
                      </span>
                      {isQualifying(entry.target_id) && <span className="wl-shootable-pill">Shootable</span>}
                    </div>
                  </div>
                  <div className="wl-item-actions">
                    <button className={`wl-alert-toggle ${entry.alerts_enabled ? 'on' : 'off'}`}
                      onClick={(e) => { e.stopPropagation(); toggleAlert(entry) }}
                      title={entry.alerts_enabled ? 'Alerts on' : 'Alerts off'}>
                      {entry.alerts_enabled ? '🔔' : '🔕'}
                    </button>
                    <button className="wl-remove-btn"
                      onClick={(e) => { e.stopPropagation(); removeFromWatchlist(entry.id) }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="watchlist-right">
          {!selected ? (
            <div className="wr-empty">Select a target from your watchlist</div>
          ) : (
            <div className="wr-detail">
              {/* Header */}
              <div className="wr-header">
                <img className="wr-dss-img"
                  src={getPreviewUrl(selected.target_id, selected.ra_deg, selected.dec_deg)}
                  alt="" loading="lazy" />
                <div className="wr-header-info">
                  <div className="wr-target-name">{selected.messier_number ? `M${selected.messier_number} · ${selected.ngc_ic_id}` : selected.ngc_ic_id}</div>
                  {selected.common_name && <div className="wr-common-name">{selected.common_name}</div>}
                  <div className="wr-coords">RA {parseFloat(selected.ra_deg).toFixed(2)}° · Dec {parseFloat(selected.dec_deg).toFixed(2)}°</div>
                  <div className="wr-badges">
                    <span className="wr-type-badge" style={{ background: TYPE_COLORS[selected.object_type] || '#666' }}>
                      {TYPE_LABELS[selected.object_type] || selected.object_type}
                    </span>
                    <span className="wr-imaging-badge">{selected.best_imaging_type}</span>
                    <button className={`wl-alert-toggle ${selected.alerts_enabled ? 'on' : 'off'}`}
                      onClick={(e) => { e.stopPropagation(); toggleAlert(selected) }}>
                      {selected.alerts_enabled ? '🔔 Alerts on' : '🔕 Alerts off'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upcoming forecast */}
              <div className="wr-section">
                <div className="wr-section-title">Upcoming Forecast</div>
                {selectedNights && selectedNights.map((night, i) => (
                  <div key={i} className="wr-night-row">
                    <span className="wr-night-label">{night.label}</span>
                    <div className="wr-night-bar-wrap">
                      {night.window ? (
                        <>
                          <div className="wr-night-bar" style={{
                            width: `${Math.min(100, night.window.duration_minutes / 480 * 100)}%`,
                            background: night.meetsThreshold ? 'var(--accent-green)' : 'var(--accent-ember)'
                          }} />
                          <span className="wr-night-dur">{Math.floor(night.window.duration_minutes / 60)}h {night.window.duration_minutes % 60}m</span>
                        </>
                      ) : (
                        <span className="wr-night-none">Not visible</span>
                      )}
                    </div>
                    <span className="wr-night-check">{night.meetsThreshold ? '✓' : '✗'}</span>
                  </div>
                ))}

                {/* 30-day calendar */}
                {coords && (
                  <VisibilityCalendar
                    raDeg={selected.ra_deg} decDeg={selected.dec_deg}
                    lat={coords.latitude} lng={coords.longitude} minAlt={25} />
                )}
              </div>

              {/* Multi-night plan */}
              <div className="wr-section">
                <div className="wr-section-title">Multi-Night Plan</div>
                <div className="wr-stepper">
                  <span>Planned nights:</span>
                  <button onClick={(e) => { e.stopPropagation(); updatePlannedNights(selected, Math.max(1, (selected.planned_nights || 1) - 1)) }}>−</button>
                  <span className="wr-stepper-val">{selected.planned_nights || 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); updatePlannedNights(selected, Math.min(7, (selected.planned_nights || 1) + 1)) }}>+</button>
                </div>
                <div className="wr-plan-list">
                  {multiNightPlan && multiNightPlan.map((night, i) => (
                    <div key={i} className="wr-plan-night">
                      <span className="wr-plan-n">Night {night.night}</span>
                      <div className="wr-plan-filters">
                        {night.filters.map((f, j) => (
                          <span key={j} className="wr-filter-pill" style={{ background: FILTER_COLORS[f.filter] || '#666' }}>
                            {f.filter}
                          </span>
                        ))}
                      </div>
                      <span className="wr-plan-dur">
                        {night.inForecast
                          ? `${Math.floor(night.duration / 60)}h ${night.duration % 60}m · ${night.totalSubs} subs`
                          : night.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert settings */}
              <div className="wr-section">
                <div className="wr-section-title">Alert Settings</div>
                <div className="wr-alert-info">
                  <div>Alerts: {selected.alerts_enabled ? 'Enabled' : 'Disabled'}</div>
                  <div>Min forecast score: ≥ 70</div>
                  <div>Min target score: ≥ 70</div>
                  <div>Min window: ≥ 6 hours</div>
                  <div>Alert time: 09:00 CST daily</div>
                  <div>Email: m.clark.church@gmail.com</div>
                </div>
              </div>

              {/* Actions */}
              <div className="wr-actions">
                <button className="wr-add-plan-btn" onClick={(e) => { e.stopPropagation(); handleAddToPlan(selected) }}>
                  Add to plan →
                </button>
                <button className="wr-remove-btn" onClick={(e) => { e.stopPropagation(); removeFromWatchlist(selected.id) }}>
                  Remove from watchlist
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Target catalog browser modal */}
      {showBrowser && (
        <div className="wl-browser-overlay" onClick={() => setShowBrowser(false)}>
          <div className="wl-browser" onClick={(e) => e.stopPropagation()}>
            <div className="wl-browser-header">
              <h4>Add to Watchlist</h4>
              <button onClick={(e) => { e.stopPropagation(); setShowBrowser(false) }}>×</button>
            </div>
            <div className="wl-browser-search">
              <input type="text" placeholder="Search by name, catalog number..."
                value={browserSearch}
                onChange={(e) => handleBrowserSearch(e.target.value)} />
            </div>
            <div className="wl-browser-types">
              {['all', 'EN', 'Galaxy', 'GCl', 'OCl', 'RN', 'SNR', 'PN'].map(t => (
                <button key={t}
                  className={`wl-type-btn ${browserType === t ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleBrowserTypeFilter(t) }}>
                  {t === 'all' ? 'All' : TYPE_LABELS[t] || t}
                </button>
              ))}
            </div>
            {browserLoading && browserTargets.length === 0 ? (
              <div className="wl-browser-loading">Loading catalog...</div>
            ) : browserTargets.length === 0 ? (
              <div className="wl-browser-empty">No targets match your search.</div>
            ) : (
              <div className="wl-browser-list">
                {browserTargets.map(t => {
                  const watched = entries.some(e => e.target_id === t.id)
                  const displayName = t.messier_number ? `M${t.messier_number} · ${t.ngc_ic_id}` : t.ngc_ic_id
                  return (
                    <div key={t.id} className={`wl-browser-item ${watched ? 'watched' : ''}`}
                      onClick={(e) => { e.stopPropagation(); if (!watched) addToWatchlist(t.id) }}>
                      <img className="wl-browser-thumb" loading="lazy"
                        src={getPreviewUrl(t.id, t.ra_deg, t.dec_deg)}
                        alt="" />
                      <div className="wl-browser-info">
                        <span className="wl-browser-name">{displayName}</span>
                        {t.common_name && <span className="wl-browser-common">{t.common_name}</span>}
                      </div>
                      <span className="wl-browser-type" style={{ background: TYPE_COLORS[t.object_type] || '#666' }}>
                        {TYPE_LABELS[t.object_type] || t.object_type}
                      </span>
                      {t.magnitude && <span className="wl-browser-mag">mag {parseFloat(t.magnitude).toFixed(1)}</span>}
                      {watched && <span className="wl-browser-watched">Watchlisted ✓</span>}
                    </div>
                  )
                })}
                {browserHasMore && (
                  <button className="wl-load-more" onClick={(e) => { e.stopPropagation(); loadMoreCatalog() }}>
                    {browserLoading ? 'Loading...' : 'Load more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
