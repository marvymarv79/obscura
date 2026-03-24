/*
 * IMPORTANT: Buttons inside clickable parent cards
 * MUST call e.stopPropagation() on their onClick handler.
 *
 * IMPORTANT: All authenticated API calls MUST use the get()/post()
 * functions from useApi() hook — NOT bare fetch(). The useApi hook
 * attaches Clerk's Bearer token. Without it, all API calls return 401.
 * Only use bare fetch() for unauthenticated endpoints (e.g. catalog).
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useUser, UserButton, SignedIn, SignedOut } from '@clerk/clerk-react'
import { useApi } from './hooks/useApi'
import './Mensura.css'

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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatDuration(min) {
  if (!min) return '0m'
  return `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`
}
function getScoreColor(s) {
  if (s >= 70) return 'var(--accent-green)'
  if (s >= 40) return 'var(--accent-ember)'
  return 'var(--accent-crimson)'
}
function targetName(t) {
  const m = t.messier_number || t.messierNumber
  const ngc = t.ngc_ic_id || t.ngcIcId || ''
  return m ? `M${m} · ${ngc}` : ngc
}

// apiFetch removed — use get/post from useApi hook for authenticated calls
// For unauthenticated calls (catalog), use plain fetch

export default function Mensura() {
  const { user, isSignedIn } = useUser()
  const { get, post } = useApi()
  const [plans, setPlans] = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [planDetail, setPlanDetail] = useState(null)
  const [planTargets, setPlanTargets] = useState([])
  const [expandedTarget, setExpandedTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [journalPrompt, setJournalPrompt] = useState(null)
  const [planName, setPlanName] = useState('')
  const [imagingTrains, setImagingTrains] = useState([])
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null)

  // Catalog browser state
  const [catalogResults, setCatalogResults] = useState([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogType, setCatalogType] = useState('all')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogOffset, setCatalogOffset] = useState(0)
  const searchTimer = useRef(null)

  // Load plans — uses get() from useApi for Clerk auth
  const loadPlans = useCallback(async () => {
    try {
      const data = await get('/api/mensura/plans')
      setPlans(Array.isArray(data) ? data : [])
    } catch { setPlans([]) }
    setLoading(false)
  }, [get])

  useEffect(() => { if (isSignedIn) loadPlans() }, [isSignedIn, loadPlans])

  // Load imaging trains
  useEffect(() => {
    fetch('/api/apertura/profiles').then(r => r.ok ? r.json() : [])
      .then(d => setImagingTrains(Array.isArray(d) ? d : []))
      .catch(() => setImagingTrains([]))
  }, [])

  // Load plan detail
  const loadPlanDetail = useCallback(async (planId) => {
    try {
      const data = await get(`/api/mensura/plans/${planId}`)
      setPlanDetail(data.plan || data)
      setPlanTargets(data.targets || [])
      setPlanName(data.plan?.name || data.name || `Session ${data.plan?.plan_date || data.plan_date || ''}`)
    } catch (err) { console.error('Load plan detail error:', err) }
  }, [get])

  const selectPlan = (plan) => {
    setSelectedPlanId(plan.id)
    loadPlanDetail(plan.id)
    setExpandedTarget(null)
  }

  // Create new plan
  const handleNewPlan = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const data = await post('/api/mensura/plans', {
          plan_date: today,
          location_name: 'Home - Midland',
          latitude: 32.04,
          longitude: -102.14,
          utc_offset_minutes: -300
      })
      await loadPlans()
      selectPlan(data)
      showToast('Plan created')
    } catch (err) { console.error('Create plan error:', err) }
  }

  // Save snapshot
  const handleSave = async () => {
    if (!planDetail) return
    setSaving(true)
    try {
      await post('/api/mensura/plans/save-snapshot', { id: planDetail.id })
      await loadPlanDetail(planDetail.id)
      await loadPlans()
      showToast('Plan saved')
    } catch (err) { console.error('Save error:', err) }
    setSaving(false)
  }

  // Mark complete
  const handleComplete = async () => {
    if (!planDetail) return
    try {
      await post('/api/mensura/plans/complete', { id: planDetail.id })
      setJournalPrompt(planDetail)
      await loadPlanDetail(planDetail.id)
      await loadPlans()
    } catch (err) { console.error('Complete error:', err) }
  }

  // Edit (clear snapshot, return to draft)
  const handleEdit = async () => {
    if (!planDetail) return
    try {
      await post('/api/mensura/plans/update', { id: planDetail.id, status: 'draft' })
      await loadPlanDetail(planDetail.id)
      await loadPlans()
    } catch (err) { console.error('Edit error:', err) }
  }

  // Update plan name
  const handleNameBlur = async () => {
    if (!planDetail || planName === planDetail.name) return
    try {
      await post('/api/mensura/plans/update', { id: planDetail.id, name: planName })
      await loadPlans()
    } catch {}
  }

  // Delete plan
  const handleDeletePlan = async () => {
    if (!planDetail) return
    try {
      await post('/api/mensura/plans/delete', { id: planDetail.id })
      setPlanDetail(null)
      setPlanTargets([])
      setSelectedPlanId(null)
      await loadPlans()
      showToast('Plan deleted')
    } catch (err) { console.error('Delete error:', err) }
  }

  // Add target from catalog
  const handleAddTarget = async (target) => {
    if (!planDetail) return
    setShowCatalog(false)
    try {
      await post('/api/mensura/plan-targets', { plan_id: planDetail.id, target_id: target.id })
      await loadPlanDetail(planDetail.id)
      showToast('Target added')
    } catch (err) { console.error('Add target error:', err) }
  }

  // Remove target
  const handleRemoveTarget = async (ptId) => {
    try {
      await post('/api/mensura/plan-targets/delete', { id: ptId })
      setConfirmDeleteTarget(null)
      await loadPlanDetail(planDetail.id)
    } catch (err) { console.error('Remove target error:', err) }
  }

  // Recompute target
  const handleRecompute = async (pt) => {
    try {
      await post('/api/mensura/plan-targets/update', { id: pt.id, window_start: pt.window_start, window_end: pt.window_end, imaging_train_id: pt.imaging_train_id })
      await loadPlanDetail(planDetail.id)
      showToast('Recomputed')
    } catch (err) { console.error('Recompute error:', err) }
  }

  // Catalog browser
  const searchCatalog = useCallback(async (search, type, offset = 0) => {
    setCatalogLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', offset: String(offset) })
      if (search) params.set('search', search)
      if (type && type !== 'all') params.set('type', type)
      const res = await fetch(`/api/obscura/catalog?${params}`)
      const data = res.ok ? await res.json() : []
      if (offset === 0) setCatalogResults(data)
      else setCatalogResults(prev => [...prev, ...data])
    } catch { setCatalogResults([]) }
    setCatalogLoading(false)
  }, [])

  const openCatalog = () => {
    setShowCatalog(true)
    setCatalogSearch('')
    setCatalogType('all')
    setCatalogOffset(0)
    searchCatalog('', 'all', 0)
  }

  const handleCatalogSearch = (val) => {
    setCatalogSearch(val)
    setCatalogOffset(0)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => searchCatalog(val, catalogType, 0), 300)
  }

  const handleCatalogType = (type) => {
    setCatalogType(type)
    setCatalogOffset(0)
    searchCatalog(catalogSearch, type, 0)
  }

  // Journal prompt
  const handleJournalCreate = () => {
    // Navigate to Obscura journal with prefill data
    const targetNames = planTargets.map(pt => targetName(pt)).join(', ')
    const prefill = encodeURIComponent(JSON.stringify({
      title: `Session ${formatDate(planDetail?.plan_date || '')} — ${planDetail?.location_name || ''}`,
      content: `Location: ${planDetail?.location_name}\nTargets: ${targetNames}\n\nNotes:\n`,
      entryDate: planDetail?.plan_date
    }))
    window.location.href = `/obscura?tab=journal&prefill=${prefill}`
    setJournalPrompt(null)
  }

  // Toast
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // Overlap detection
  const getOverlaps = () => {
    const overlaps = []
    const sorted = [...planTargets].sort((a, b) => {
      const aStart = a.snapshot?.imagingWindow?.start || a.window_start || ''
      const bStart = b.snapshot?.imagingWindow?.start || b.window_start || ''
      return aStart.localeCompare(bStart)
    })
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1]
      const aEnd = a.snapshot?.imagingWindow?.end || a.window_end
      const bStart = b.snapshot?.imagingWindow?.start || b.window_start
      if (aEnd && bStart && aEnd > bStart) {
        overlaps.push({ a: targetName(a), b: targetName(b) })
      }
    }
    return overlaps
  }

  const totalTime = planTargets.reduce((sum, pt) => {
    return sum + (pt.snapshot?.imagingWindow?.durationMinutes || pt.snapshot?.totalIntegrationMinutes || 0)
  }, 0)

  const isDraft = !planDetail?.status || planDetail.status === 'draft'
  const isComplete = planDetail?.status === 'complete'
  const overlaps = planDetail ? getOverlaps() : []

  return (
    <div className="mensura">
      {/* Nav */}
      <nav className="mensura-nav">
        <div className="mensura-nav-left">
          <Link to="/" className="mensura-hub-link">← Hub</Link>
          <Link to="/mensura" className="mensura-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" stroke="var(--accent-crimson)" />
              <path d="M12 6v6l4 2" stroke="var(--text-primary)" />
            </svg>
            <span className="mensura-wordmark">Men<span>sura</span></span>
          </Link>
        </div>
        <div className="mensura-nav-right">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut><div className="mensura-avatar" /></SignedOut>
        </div>
      </nav>

      <div className="mensura-content">
        {/* Sidebar */}
        <aside className="mensura-sidebar">
          <div className="ms-header">
            <h3>Plans</h3>
            <button className="ms-new-btn" onClick={(e) => { e.stopPropagation(); handleNewPlan() }}>+ New</button>
          </div>
          <div className="ms-plan-list">
            {loading ? <div style={{ padding: 16, color: 'var(--text-dim)' }}>Loading...</div> :
              plans.length === 0 ? <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 12 }}>No plans yet</div> :
              plans.map(plan => (
                <div key={plan.id}
                  className={`ms-plan-card ${selectedPlanId === plan.id ? 'selected' : ''}`}
                  onClick={() => selectPlan(plan)}>
                  <div className="ms-plan-date">{formatDate(plan.plan_date)}</div>
                  <div className="ms-plan-location">{plan.location_name}</div>
                  {plan.target_names && plan.target_names.length > 0 && (
                    <div className="ms-plan-targets">
                      {plan.target_names.slice(0, 3).join(', ')}
                      {plan.target_count > 3 ? ` + ${plan.target_count - 3} more` : ''}
                    </div>
                  )}
                  <div className="ms-plan-footer">
                    {plan.forecast_score != null && (
                      <span className="ms-forecast-badge" style={{ color: getScoreColor(plan.forecast_score) }}>
                        {plan.forecast_score}
                      </span>
                    )}
                    {plan.status === 'complete' && <span className="ms-complete-pill">✓ Complete</span>}
                  </div>
                </div>
              ))
            }
          </div>
        </aside>

        {/* Workspace */}
        <main className="mensura-workspace">
          {!planDetail ? (
            <div className="ms-empty">
              <h3>No plan selected</h3>
              <p>Select a plan from the list or create a new one to get started.</p>
              <button className="ms-empty-btn" onClick={(e) => { e.stopPropagation(); handleNewPlan() }}>New Plan →</button>
            </div>
          ) : (
            <>
              {/* Workspace Header */}
              <div className="mw-header">
                {isDraft ? (
                  <input className="mw-name-input" value={planName}
                    onChange={(e) => setPlanName(e.target.value)} onBlur={handleNameBlur}
                    placeholder="Plan name..." />
                ) : (
                  <div className="mw-name-input" style={{ cursor: 'default' }}>{planName}</div>
                )}
                <div className="mw-meta">
                  <span>{formatDate(planDetail.plan_date)}</span>
                  <span>{planDetail.location_name}</span>
                  {planDetail.forecast_score != null && (
                    <span style={{ color: getScoreColor(planDetail.forecast_score), fontWeight: 600 }}>
                      {planDetail.forecast_score}
                    </span>
                  )}
                </div>
                <div className="mw-actions">
                  {isDraft && (
                    <>
                      <button className="mw-save-btn" onClick={(e) => { e.stopPropagation(); handleSave() }}
                        disabled={saving}>{saving ? 'Saving...' : 'Save plan'}</button>
                    </>
                  )}
                  {!isDraft && !isComplete && (
                    <>
                      <button className="mw-ghost-btn ember" onClick={(e) => { e.stopPropagation(); handleComplete() }}>
                        Mark complete</button>
                      <button className="mw-ghost-btn" onClick={(e) => { e.stopPropagation(); handleEdit() }}>
                        Edit plan</button>
                    </>
                  )}
                  {isComplete && (
                    <button className="mw-ghost-btn" onClick={(e) => { e.stopPropagation(); handleEdit() }}>
                      Edit plan</button>
                  )}
                </div>
              </div>

              {/* Target List */}
              <div className="mw-target-list">
                {planTargets.map((pt, idx) => {
                  const snap = pt.snapshot || {}
                  const isExpanded = expandedTarget === pt.id
                  const tName = targetName(pt)

                  return (
                    <div key={pt.id} className={`mw-target ${!isDraft ? 'readonly' : ''}`}>
                      <div className="mw-target-top" onClick={() => setExpandedTarget(isExpanded ? null : pt.id)}>
                        {isDraft && <span className="mw-drag">⠿</span>}
                        <img className="mw-target-thumb" loading="lazy"
                          src={`/api/obscura/preview-proxy?targetId=${pt.target_id}`}
                          alt={tName}
                          onError={(e) => { console.warn('[DSS] Image failed to load', { src: e.target.src }) }} />
                        <div className="mw-target-info">
                          <div className="mw-target-name">
                            {tName}
                            {pt.object_type && (
                              <span className="mw-type-badge" style={{ background: TYPE_COLORS[pt.object_type] || '#666' }}>
                                {TYPE_LABELS[pt.object_type] || pt.object_type}
                              </span>
                            )}
                          </div>
                          {pt.common_name && <div className="mw-target-common">{pt.common_name}</div>}
                        </div>
                        {snap.score > 0 && (
                          <span className="mw-target-score" style={{ color: getScoreColor(snap.score) }}>{snap.score}</span>
                        )}
                        <span className="mw-expand-toggle">{isExpanded ? '▼' : '▶'}</span>
                        {isDraft && (
                          confirmDeleteTarget === pt.id ? (
                            <>
                              <button className="mw-remove-btn" style={{ color: 'var(--accent-crimson)' }}
                                onClick={(e) => { e.stopPropagation(); handleRemoveTarget(pt.id) }}>Delete?</button>
                              <button className="mw-remove-btn"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteTarget(null) }}>Cancel</button>
                            </>
                          ) : (
                            <button className="mw-remove-btn"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteTarget(pt.id) }}>×</button>
                          )
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mw-target-expanded">
                          {/* Window row */}
                          {snap.imagingWindow && (
                            <div className="mw-window-row">
                              <span>Window:</span>
                              {isDraft ? (
                                <>
                                  <input type="time" className="mw-time-input" value={pt.window_start || snap.imagingWindow.start || ''}
                                    onChange={() => {}} />
                                  <span>—</span>
                                  <input type="time" className="mw-time-input" value={pt.window_end || snap.imagingWindow.end || ''}
                                    onChange={() => {}} />
                                </>
                              ) : (
                                <span>{snap.imagingWindow.start} — {snap.imagingWindow.end}</span>
                              )}
                              <span>({formatDuration(snap.imagingWindow.durationMinutes)})</span>
                            </div>
                          )}

                          {/* Transit/Moon */}
                          {snap.transitTime && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                              Transit · {snap.transitTime}{snap.transitAltitude ? ` at ${Math.round(snap.transitAltitude)}°` : ''}
                              {snap.moonSeparation ? ` · Moon ${Math.round(snap.moonSeparation)}° away` : ''}
                            </div>
                          )}

                          {/* Score breakdown */}
                          {snap.scoreComponents && (
                            <div className="mw-scores-grid">
                              {['altitude', 'moon', 'window', 'fov'].map(key => {
                                const val = Math.round((snap.scoreComponents[key] || 0) * 100)
                                return (
                                  <div key={key} className="mw-score-tile">
                                    <span className="mw-score-label">{key}</span>
                                    <div className="mw-score-bar">
                                      <div className="mw-score-fill" style={{ width: `${val}%`, background: getScoreColor(val) }} />
                                    </div>
                                    <span className="mw-score-val" style={{ color: getScoreColor(val) }}>{val}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Filter sequence */}
                          {snap.filterSequence && snap.filterSequence.length > 0 && (
                            <div className="mw-filter-section">
                              <div className="mw-filter-header">
                                <span className="mw-filter-label">Filter Sequence</span>
                                {isDraft && (
                                  <button className="mw-recompute-btn" onClick={(e) => { e.stopPropagation(); handleRecompute(pt) }}>
                                    Recompute
                                  </button>
                                )}
                              </div>
                              <div className="mw-ft-table">
                                <div className="mw-ft-head">
                                  <span>Filter</span><span>Start</span><span>End</span>
                                  <span>Subs</span><span>Sub len</span><span>Total</span>
                                </div>
                                {snap.filterSequence.map((f, fi) => (
                                  <div key={fi} className="mw-ft-row">
                                    <span className="mw-filter-pill" style={{ background: FILTER_COLORS[f.filter] || '#666' }}>
                                      {f.filter}
                                    </span>
                                    <span>{f.start}</span><span>{f.end}</span>
                                    <span>{f.estimatedSubs}</span><span>{f.subLength}s</span>
                                    <span>{f.totalMinutes}m</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* HDR */}
                          {snap.hdr && (
                            <div className="mw-hdr-warning">⚠ HDR recommended — add 30s subs during L window</div>
                          )}

                          {/* Exposure */}
                          {snap.totalIntegrationMinutes > 0 && (
                            <div className="mw-exposure">
                              Total integration: {formatDuration(snap.totalIntegrationMinutes)}
                              {snap.filterSequence && snap.filterSequence.length > 1 && (
                                <span className="mw-per-filter">
                                  {' · '}{snap.filterSequence.map(f => `${f.filter}: ${f.totalMinutes}m`).join(' · ')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Train selector */}
                          {isDraft && (
                            <div className="mw-train-row">
                              <span>Train:</span>
                              <select className="mw-train-select" value={pt.imaging_train_id || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const newId = e.target.value || null
                                  post('/api/mensura/plan-targets/update', { id: pt.id, imaging_train_id: newId })
                                    .then(() => loadPlanDetail(planDetail.id))
                                }}>
                                <option value="">Auto</option>
                                {imagingTrains.map(t => <option key={t.id} value={t.id}>{t.profile_name}</option>)}
                              </select>
                            </div>
                          )}

                          {!isDraft && <div className="mw-recorded">Recorded on {formatDate(pt.created_at)}</div>}
                        </div>
                      )}
                    </div>
                  )
                })}

                {isDraft && (
                  <button className="mw-add-target" onClick={(e) => { e.stopPropagation(); openCatalog() }}>
                    + Add target
                  </button>
                )}
              </div>

              {/* Night Summary */}
              {planTargets.length > 0 && (
                <div className="mw-night-summary">
                  <span>Total: {formatDuration(totalTime)}</span>
                  <span>Targets: {planTargets.length}</span>
                  {overlaps.length > 0 && (
                    <span className="mw-overlap-count">⚠ {overlaps.length} overlap{overlaps.length > 1 ? 's' : ''}</span>
                  )}
                </div>
              )}
            </>
          )}

          {/* Catalog Browser */}
          {showCatalog && (
            <div className="mw-catalog-overlay" onClick={(e) => { e.stopPropagation(); setShowCatalog(false) }}>
              <div className="mw-catalog-modal" onClick={(e) => e.stopPropagation()}>
                <div className="mw-catalog-header">
                  <h4>Add Target</h4>
                  <button className="mw-catalog-close" onClick={(e) => { e.stopPropagation(); setShowCatalog(false) }}>×</button>
                </div>
                <input className="mw-catalog-search" placeholder="Search by name, catalog number..."
                  value={catalogSearch} onChange={(e) => handleCatalogSearch(e.target.value)} autoFocus />
                <div className="mw-catalog-types">
                  {['all', 'EN', 'Galaxy', 'GCl', 'OCl', 'RN', 'SNR', 'PN'].map(t => (
                    <button key={t} className={`mw-type-toggle ${catalogType === t ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); handleCatalogType(t) }}>
                      {t === 'all' ? 'All' : TYPE_LABELS[t] || t}
                    </button>
                  ))}
                </div>
                <div className="mw-catalog-list">
                  {catalogLoading && catalogResults.length === 0 ? (
                    <div className="mw-catalog-loading">Loading catalog...</div>
                  ) : catalogResults.length === 0 ? (
                    <div className="mw-catalog-empty">No targets found</div>
                  ) : (
                    <>
                      {catalogResults.map(t => {
                        const added = planTargets.some(pt => pt.target_id === t.id)
                        return (
                          <div key={t.id} className="mw-catalog-item"
                            style={added ? { opacity: 0.4 } : {}}
                            onClick={(e) => { e.stopPropagation(); if (!added) handleAddTarget(t) }}>
                            <img className="mw-catalog-thumb" loading="lazy"
                              src={`/api/obscura/preview-proxy?targetId=${t.id}`} alt=""
                              onError={(e) => { console.warn('[DSS] Image failed to load', { src: e.target.src }) }} />
                            <div>
                              <div className="mw-catalog-name">{targetName(t)}</div>
                              {t.common_name && <div className="mw-catalog-common">{t.common_name}</div>}
                            </div>
                            <span className="mw-catalog-mag">
                              {t.magnitude ? `mag ${parseFloat(t.magnitude).toFixed(1)}` : ''}
                            </span>
                          </div>
                        )
                      })}
                      {catalogResults.length >= 50 && (
                        <button className="mw-catalog-more" onClick={(e) => {
                          e.stopPropagation()
                          const newOffset = catalogOffset + 50
                          setCatalogOffset(newOffset)
                          searchCatalog(catalogSearch, catalogType, newOffset)
                        }}>Load more</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Journal Prompt */}
          {journalPrompt && (
            <div className="mw-journal-overlay" onClick={(e) => { e.stopPropagation(); setJournalPrompt(null) }}>
              <div className="mw-journal-modal" onClick={(e) => e.stopPropagation()}>
                <h4>Plan complete — log your session?</h4>
                <p className="mw-journal-desc">Create a journal entry to capture notes and track progress.</p>
                <div className="mw-journal-preview">
                  <div><strong>Date:</strong> {formatDate(planDetail?.plan_date || '')}</div>
                  <div><strong>Location:</strong> {planDetail?.location_name || 'Unknown'}</div>
                  <div><strong>Targets:</strong> {planTargets.map(pt => targetName(pt)).join(', ')}</div>
                </div>
                <div className="mw-journal-actions">
                  <button className="mw-journal-create" onClick={(e) => { e.stopPropagation(); handleJournalCreate() }}>
                    Create journal entry →
                  </button>
                  <button className="mw-journal-skip" onClick={(e) => { e.stopPropagation(); setJournalPrompt(null) }}>
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast */}
          {toast && <div className="mw-toast">{toast}</div>}
        </main>
      </div>
    </div>
  )
}
