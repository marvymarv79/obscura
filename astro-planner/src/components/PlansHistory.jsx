/*
 * IMPORTANT: Buttons inside clickable parent cards
 * MUST call e.stopPropagation() on their onClick handler.
 * Without it, the parent card's click handler fires
 * instead of the button's, causing silent failures.
 */
import { useState, useEffect, useCallback } from 'react'

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
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

function formatTime(isoStr) {
  if (!isoStr) return '--:--'
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(minutes) {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

function getScoreColor(score) {
  if (score >= 70) return 'var(--accent-green)'
  if (score >= 40) return 'var(--accent-ember)'
  return 'var(--accent-crimson)'
}

function targetDisplayName(t) {
  if (t.messierNumber) return `M${t.messierNumber} · ${t.ngcIcId || t.ngc_ic_id || t.targetId}`
  return t.ngcIcId || t.ngc_ic_id || t.targetName || t.targetId
}

function snapshotTargetSummary(plan) {
  const snap = plan.planSnapshot || plan.plan_snapshot
  const targets = snap?.targets || plan.targets || []
  if (targets.length === 0) return 'No targets'
  const names = targets.map(t => {
    if (t.messierNumber) return `M${t.messierNumber}`
    if (t.commonName || t.common_name) return t.commonName || t.common_name
    return t.ngcIcId || t.ngc_ic_id || t.targetName || t.targetId
  })
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} + ${names.length - 2} more`
}

export default function PlansHistory({
  plans,
  loading,
  onSavePlan,
  onClonePlan,
  onDeletePlan,
  onRefresh,
  savedLocations,
  coords,
  onSwitchTab,
  onPrefillJournal,
  forecastScore
}) {
  const [creating, setCreating] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [slideInPlan, setSlideInPlan] = useState(null)
  const [snapshotBuilding, setSnapshotBuilding] = useState(false)
  const [journalPrompt, setJournalPrompt] = useState(null)

  // New plan state
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split('T')[0])
  const [planLocationIdx, setPlanLocationIdx] = useState('')
  const [planNotes, setPlanNotes] = useState('')
  const [planTargets, setPlanTargets] = useState([])
  const [saving, setSaving] = useState(false)

  // Target browser
  const [showBrowser, setShowBrowser] = useState(false)
  const [browserTargets, setBrowserTargets] = useState([])
  const [browserLoading, setBrowserLoading] = useState(false)

  // Imaging trains
  const [imagingTrains, setImagingTrains] = useState([])

  useEffect(() => {
    fetch('/api/apertura/profiles')
      .then(r => r.ok ? r.json() : [])
      .then(data => setImagingTrains(Array.isArray(data) ? data : []))
      .catch(() => setImagingTrains([]))
  }, [])

  // Build snapshot for a plan if it doesn't have one
  const buildSnapshot = useCallback(async (plan) => {
    if (plan.planSnapshot || plan.plan_snapshot) return plan
    setSnapshotBuilding(true)
    try {
      const res = await fetch('/api/plans/build-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, forecastScore: forecastScore || 0, utcOffsetMinutes: -300 })
      })
      if (!res.ok) { setSnapshotBuilding(false); return plan }
      const data = await res.json()
      setSnapshotBuilding(false)
      return data
    } catch {
      setSnapshotBuilding(false)
      return plan
    }
  }, [forecastScore])

  const openSlideIn = async (plan) => {
    // Show panel immediately with whatever data we have
    setSlideInPlan(plan)
    // If no snapshot, compute one
    if (!plan.planSnapshot && !plan.plan_snapshot) {
      const enriched = await buildSnapshot(plan)
      setSlideInPlan(enriched)
    }
  }

  const handleMarkComplete = async () => {
    if (!slideInPlan) return
    try {
      const res = await fetch('/api/plans/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slideInPlan.id })
      })
      if (!res.ok) { const text = await res.text(); throw new Error('API error ' + res.status + ': ' + text) }
      const updated = await res.json()
      setSlideInPlan(prev => ({ ...prev, completedAt: updated.completedAt || updated.completed_at }))
      // Show journal prompt
      setJournalPrompt(slideInPlan)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Mark complete failed:', err)
    }
  }

  const handleJournalCreate = () => {
    if (!journalPrompt) return
    const snap = journalPrompt.planSnapshot || journalPrompt.plan_snapshot
    const targetNames = (snap?.targets || journalPrompt.targets || [])
      .map(t => targetDisplayName(t)).join(', ')

    if (onPrefillJournal) {
      onPrefillJournal({
        entryDate: journalPrompt.planDate,
        title: `Session ${formatDate(journalPrompt.planDate)} — ${journalPrompt.locationName || ''}`,
        content: `Location: ${journalPrompt.locationName || 'Unknown'}\nTargets: ${targetNames}\nForecast score: ${snap?.forecastScore || '—'}\n\nNotes:\n`,
        imagingPlanId: journalPrompt.id,
        planId: journalPrompt.id
      })
    }
    if (onSwitchTab) onSwitchTab('journal')
    setJournalPrompt(null)
    setSlideInPlan(null)
  }

  const handleDeletePlan = async (planId) => {
    await onDeletePlan(planId)
    setSlideInPlan(null)
    setConfirmDeleteId(null)
  }

  // ── New plan creation helpers ──
  const getSelectedLocation = () => {
    if (planLocationIdx !== '' && savedLocations) return savedLocations[parseInt(planLocationIdx)]
    return coords ? { name: 'Current', latitude: coords.latitude, longitude: coords.longitude } : null
  }

  const fetchBrowserTargets = useCallback(async () => {
    const loc = getSelectedLocation()
    if (!loc) return
    setBrowserLoading(true)
    try {
      const params = new URLSearchParams({
        lat: loc.latitude, lng: loc.longitude,
        date: planDate, minAlt: '25', minScore: '30', type: 'all'
      })
      const resp = await fetch(`/api/obscura/targets?${params}`)
      if (resp.ok) {
        const data = await resp.json()
        const addedIds = new Set(planTargets.map(t => t.id))
        setBrowserTargets(data.filter(t => !addedIds.has(t.id)))
      }
    } catch { setBrowserTargets([]) }
    setBrowserLoading(false)
  }, [planDate, planLocationIdx, coords, savedLocations, planTargets])

  const addTarget = (target) => {
    setPlanTargets(prev => [...prev, {
      ...target,
      assignedTrainId: target.bestTrainId || null,
      assignedTrainName: target.bestTrainName || null
    }])
    setBrowserTargets(prev => prev.filter(t => t.id !== target.id))
  }

  const removeTarget = (targetId) => setPlanTargets(prev => prev.filter(t => t.id !== targetId))

  const updateTrainAssignment = (targetId, trainId) => {
    const train = imagingTrains.find(t => t.id === parseInt(trainId))
    setPlanTargets(prev => prev.map(t =>
      t.id === targetId ? { ...t, assignedTrainId: trainId ? parseInt(trainId) : null, assignedTrainName: train?.profile_name || null } : t
    ))
  }

  const getTotalTime = () => planTargets.reduce((sum, t) => sum + (t.imagingWindow?.duration_minutes || 0), 0)

  const getOverlapWarning = () => {
    if (planTargets.length < 2) return null
    const windows = planTargets.filter(t => t.imagingWindow?.start && t.imagingWindow?.end)
      .map(t => ({ name: t.ngc_ic_id, start: new Date(t.imagingWindow.start).getTime(), end: new Date(t.imagingWindow.end).getTime() }))
      .sort((a, b) => a.start - b.start)
    for (let i = 0; i < windows.length - 1; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        if (windows[i].end > windows[j].start) {
          const overlapMin = Math.round((windows[i].end - windows[j].start) / 60000)
          return `${windows[i].name} and ${windows[j].name} overlap by ${overlapMin} minutes`
        }
      }
    }
    return null
  }

  const handleSave = async () => {
    const loc = getSelectedLocation()
    if (!loc) return
    setSaving(true)
    try {
      await onSavePlan({
        name: `Session ${planDate}`,
        planDate,
        locationName: loc.name || 'Unknown',
        latitude: loc.latitude,
        longitude: loc.longitude,
        notes: planNotes || null,
        targets: planTargets.map((t, i) => ({
          targetId: String(t.id || t.ngc_ic_id),
          targetName: t.common_name || t.ngc_ic_id,
          priority: i + 1,
          visibilityScore: t.score,
          defaultSetupId: t.assignedTrainId ? String(t.assignedTrainId) : null,
          transitTime: t.transitTime || null,
          moonSeparation: t.moonSeparation || null,
          notes: t.assignedTrainName || null
        }))
      })
      setCreating(false)
      setPlanTargets([])
      setPlanNotes('')
    } catch (e) { alert('Failed to save plan: ' + e.message) }
    setSaving(false)
  }

  const startNew = () => {
    setCreating(true)
    setPlanTargets([])
    setPlanNotes('')
    setPlanDate(new Date().toISOString().split('T')[0])
    setPlanLocationIdx('')
    setShowBrowser(false)
  }

  if (loading) {
    return <div className="plans-history"><div className="plans-loading">Loading plans...</div></div>
  }

  // Get snapshot targets for the slide-in panel
  const snapTargets = slideInPlan ? (slideInPlan.planSnapshot || slideInPlan.plan_snapshot)?.targets || [] : []

  return (
    <div className="plans-history" style={{ position: 'relative' }}>
      <div className="plans-header">
        <h3>Plans</h3>
        <div className="plans-header-actions">
          <button className="refresh-button" onClick={(e) => { e.stopPropagation(); onRefresh() }} title="Refresh">↻</button>
          <button className="new-plan-button" onClick={(e) => { e.stopPropagation(); startNew() }}>+ New Plan</button>
        </div>
      </div>

      {/* New Plan Creator */}
      {creating && (
        <div className="plan-creator">
          <div className="plan-creator-header">
            <div className="pc-fields">
              <div className="pc-field">
                <label>Date</label>
                <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
              </div>
              <div className="pc-field">
                <label>Location</label>
                <select value={planLocationIdx} onChange={(e) => setPlanLocationIdx(e.target.value)}>
                  <option value="">{coords ? `Current (${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)})` : '— Select —'}</option>
                  {savedLocations && savedLocations.map((loc, i) => (
                    <option key={i} value={i}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div className="pc-field pc-notes">
                <label>Notes</label>
                <textarea value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} placeholder="Session notes..." rows={2} />
              </div>
            </div>
          </div>

          <div className="plan-target-list">
            {planTargets.length === 0 ? (
              <div className="plan-targets-empty">No targets added yet. Click "Add Target" to browse.</div>
            ) : planTargets.map(target => (
              <div key={target.id} className="plan-target-item">
                <div className="pti-info">
                  <span className="pti-name">{target.ngc_ic_id}</span>
                  {target.common_name && <span className="pti-common">{target.common_name}</span>}
                  <span className="pti-type" style={{ background: TYPE_COLORS[target.object_type] || '#666' }}>
                    {TYPE_LABELS[target.object_type] || target.object_type}
                  </span>
                </div>
                <div className="pti-details">
                  <select className="pti-train-select" value={target.assignedTrainId || ''}
                    onChange={(e) => updateTrainAssignment(target.id, e.target.value)}>
                    <option value="">Auto</option>
                    {imagingTrains.map(train => (<option key={train.id} value={train.id}>{train.profile_name}</option>))}
                  </select>
                  {target.imagingWindow && (
                    <span className="pti-window">
                      {formatTime(target.imagingWindow.start)} — {formatTime(target.imagingWindow.end)}
                      {' '}({formatDuration(target.imagingWindow.duration_minutes)})
                    </span>
                  )}
                  <span className="pti-score" style={{ color: getScoreColor(target.score) }}>{target.score}</span>
                </div>
                <button className="pti-remove" onClick={(e) => { e.stopPropagation(); removeTarget(target.id) }}>×</button>
              </div>
            ))}
          </div>

          {planTargets.length > 0 && (
            <div className="plan-night-summary">
              <span>Total imaging time: {formatDuration(getTotalTime())}</span>
              <span>Targets: {planTargets.length}</span>
              {getOverlapWarning() && <span className="overlap-warning">Overlap: {getOverlapWarning()}</span>}
            </div>
          )}

          <div className="plan-creator-actions">
            <button className="add-target-btn" onClick={(e) => { e.stopPropagation(); setShowBrowser(true); fetchBrowserTargets() }}>+ Add Target</button>
            <div className="pca-right">
              <button className="cancel-plan-btn" onClick={(e) => { e.stopPropagation(); setCreating(false) }}>Cancel</button>
              <button className="save-plan-btn" onClick={(e) => { e.stopPropagation(); handleSave() }} disabled={saving || planTargets.length === 0}>
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>

          {showBrowser && (
            <div className="target-browser-overlay" onClick={(e) => { e.stopPropagation(); setShowBrowser(false) }}>
              <div className="target-browser" onClick={(e) => e.stopPropagation()}>
                <div className="tb-header">
                  <h4>Add Target</h4>
                  <button className="close-button" onClick={(e) => { e.stopPropagation(); setShowBrowser(false) }}>×</button>
                </div>
                {browserLoading ? (
                  <div className="tb-loading">Scoring targets...</div>
                ) : browserTargets.length === 0 ? (
                  <div className="tb-empty">No targets available for this date and location.</div>
                ) : (
                  <div className="tb-list">
                    {browserTargets.slice(0, 15).map(target => (
                      <div key={target.id} className="tb-item" onClick={(e) => { e.stopPropagation(); addTarget(target); setShowBrowser(false) }}>
                        <div className="tb-item-left">
                          <span className="tb-name">{target.ngc_ic_id}</span>
                          {target.common_name && <span className="tb-common">{target.common_name}</span>}
                          <span className="tb-type" style={{ background: TYPE_COLORS[target.object_type] || '#666' }}>
                            {TYPE_LABELS[target.object_type] || target.object_type}
                          </span>
                        </div>
                        <div className="tb-item-right">
                          <span className="tb-score" style={{ color: getScoreColor(target.score) }}>{target.score}</span>
                          {target.imagingWindow && (
                            <span className="tb-window">{formatTime(target.imagingWindow.start)} — {formatTime(target.imagingWindow.end)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved plans list */}
      {plans.length === 0 && !creating ? (
        <div className="plans-empty">
          <h3>No Plans</h3>
          <p>Start from the Targets tab or click New Plan above.</p>
        </div>
      ) : (
        <div className="plans-list">
          {plans.map(plan => {
            const snap = plan.planSnapshot || plan.plan_snapshot
            const fScore = snap?.forecastScore
            const isComplete = !!(plan.completedAt || plan.completed_at)
            return (
              <div key={plan.id} className="plan-card" onClick={() => openSlideIn(plan)}>
                <div className="plan-card-header">
                  <div className="plan-card-main">
                    <div className="plan-card-date">{formatDate(plan.planDate)}</div>
                    {plan.locationName && <div className="plan-card-loc">{plan.locationName}</div>}
                    <div className="plan-card-targets-summary">{snapshotTargetSummary(plan)}</div>
                  </div>
                  <div className="plan-card-badges">
                    {fScore != null && (
                      <span className="plan-forecast-badge" style={{ color: getScoreColor(fScore) }}>{fScore}</span>
                    )}
                    {isComplete && <span className="plan-complete-pill">✓ Complete</span>}
                  </div>
                </div>
                <span className="plan-card-chevron">▶</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Slide-in Detail Panel ── */}
      {slideInPlan && (
        <div className="plan-slidein-overlay" onClick={(e) => { e.stopPropagation(); setSlideInPlan(null) }}>
          <div className="plan-slidein" onClick={(e) => e.stopPropagation()}>
            {/* Panel Header */}
            <div className="psi-header">
              <div>
                <div className="psi-date">{formatDate(slideInPlan.planDate)}</div>
                {slideInPlan.locationName && <div className="psi-location">{slideInPlan.locationName}</div>}
              </div>
              <div className="psi-header-actions">
                {(slideInPlan.planSnapshot || slideInPlan.plan_snapshot)?.forecastScore != null && (
                  <span className="psi-forecast" style={{
                    color: getScoreColor((slideInPlan.planSnapshot || slideInPlan.plan_snapshot).forecastScore)
                  }}>
                    {(slideInPlan.planSnapshot || slideInPlan.plan_snapshot).forecastScore}
                  </span>
                )}
                {!(slideInPlan.completedAt || slideInPlan.completed_at) && (
                  <button className="psi-complete-btn" onClick={(e) => { e.stopPropagation(); handleMarkComplete() }}>
                    Mark complete
                  </button>
                )}
                {(slideInPlan.completedAt || slideInPlan.completed_at) && (
                  <span className="plan-complete-pill">✓ Complete</span>
                )}
                <button className="psi-close" onClick={(e) => { e.stopPropagation(); setSlideInPlan(null) }}>×</button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="psi-body">
              {slideInPlan.notes && <div className="psi-notes">{slideInPlan.notes}</div>}

              {snapshotBuilding && <div className="psi-loading">Computing snapshot...</div>}

              {snapTargets.length > 0 ? snapTargets.map((t, i) => (
                <div key={i} className="psi-target">
                  {/* DSS Image */}
                  {t.targetId && (
                    <div className="psi-dss-wrap">
                      <img src={`/api/obscura/preview-proxy?targetId=${t.targetId}`}
                        alt={t.ngcIcId} className="psi-dss-img" loading="lazy" />
                      <span className="psi-dss-label">DSS2 · CDS Strasbourg</span>
                    </div>
                  )}

                  {/* Target Header */}
                  <div className="psi-target-header">
                    <span className="psi-target-name">{targetDisplayName(t)}</span>
                    {t.commonName && <span className="psi-target-common">{t.commonName}</span>}
                    {t.objectType && (
                      <span className="psi-type-badge" style={{ background: TYPE_COLORS[t.objectType] || '#666' }}>
                        {TYPE_LABELS[t.objectType] || t.objectType}
                      </span>
                    )}
                    {t.score > 0 && (
                      <span className="psi-score-badge" style={{ color: getScoreColor(t.score) }}>{t.score}</span>
                    )}
                    {t.imagingTrainName && <span className="psi-train-badge">{t.imagingTrainName}</span>}
                  </div>

                  {/* Info Row */}
                  {t.imagingWindow && (
                    <div className="psi-info-row">
                      <span>Window · {t.imagingWindow.start} — {t.imagingWindow.end} ({formatDuration(t.imagingWindow.durationMinutes)})</span>
                    </div>
                  )}
                  {t.transitTime && (
                    <div className="psi-info-row">
                      <span>Transit · {t.transitTime}{t.transitAltitude ? ` at ${Math.round(t.transitAltitude)}°` : ''}</span>
                      {t.moonSeparation && <span> · Moon {Math.round(t.moonSeparation)}° away</span>}
                      {t.moonIllumination != null && <span> · {Math.round(t.moonIllumination)}%</span>}
                      {t.moonPhase && <span> · {t.moonPhase}</span>}
                    </div>
                  )}

                  {/* Score Breakdown */}
                  {t.scoreComponents && (
                    <div className="psi-scores-grid">
                      {['altitude', 'moon', 'window', 'fov'].map(key => {
                        const val = Math.round((t.scoreComponents[key] || 0) * 100)
                        return (
                          <div key={key} className="psi-score-tile">
                            <span className="psi-score-label">{key}</span>
                            <div className="psi-score-bar">
                              <div className="psi-score-fill" style={{ width: `${val}%`, background: getScoreColor(val) }} />
                            </div>
                            <span className="psi-score-val" style={{ color: getScoreColor(val) }}>{val}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Filter Sequence Table */}
                  {t.filterSequence && t.filterSequence.length > 0 && (
                    <div className="psi-filter-table">
                      <div className="psi-ft-header">
                        <span>Filter</span><span>Start</span><span>End</span>
                        <span>Subs</span><span>Sub len</span><span>Total</span>
                      </div>
                      {t.filterSequence.map((f, fi) => (
                        <div key={fi} className="psi-ft-row">
                          <span className="psi-filter-pill" style={{ background: FILTER_COLORS[f.filter] || '#666' }}>{f.filter}</span>
                          <span>{f.start}</span><span>{f.end}</span>
                          <span>{f.estimatedSubs}</span><span>{f.subLength}s</span>
                          <span>{f.totalMinutes}m</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* HDR Warning */}
                  {t.hdr && (
                    <div className="psi-hdr-warning">
                      ⚠ HDR recommended — add 30s subs during L window
                    </div>
                  )}

                  {/* Exposure Summary */}
                  {t.totalIntegrationMinutes > 0 && (
                    <div className="psi-exposure">
                      Total integration: {formatDuration(t.totalIntegrationMinutes)}
                      {t.filterSequence && t.filterSequence.length > 1 && (
                        <span className="psi-per-filter">
                          {' · '}{t.filterSequence.map(f => `${f.filter}: ${f.totalMinutes}m`).join(' · ')}
                        </span>
                      )}
                    </div>
                  )}

                  {i < snapTargets.length - 1 && <div className="psi-divider" />}
                </div>
              )) : (
                !snapshotBuilding && (slideInPlan.targets || []).length > 0 ? (
                  (slideInPlan.targets || []).map((t, i) => (
                    <div key={i} className="psi-target">
                      <div className="psi-target-header">
                        <span className="psi-target-name">{t.targetName || t.targetId}</span>
                        {t.visibilityScore && (
                          <span className="psi-score-badge" style={{ color: getScoreColor(t.visibilityScore) }}>{t.visibilityScore}</span>
                        )}
                      </div>
                      {t.notes && <div className="psi-info-row"><span>{t.notes}</span></div>}
                    </div>
                  ))
                ) : !snapshotBuilding && <div className="psi-empty">No targets in this plan.</div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="psi-footer">
              {slideInPlan.journalEntryId || slideInPlan.journal_entry_id ? (
                <button className="plan-action-button view" onClick={(e) => {
                  e.stopPropagation()
                  if (onSwitchTab) onSwitchTab('journal')
                  setSlideInPlan(null)
                }}>View journal entry →</button>
              ) : null}

              {confirmDeleteId === slideInPlan.id ? (
                <>
                  <button className="plan-action-button delete" onClick={(e) => { e.stopPropagation(); handleDeletePlan(slideInPlan.id) }}>
                    Delete?
                  </button>
                  <button className="plan-action-button cancel" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="plan-action-button delete" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(slideInPlan.id) }}>
                  Delete plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Journal Prompt Modal ── */}
      {journalPrompt && (
        <div className="plan-journal-overlay" onClick={(e) => { e.stopPropagation(); setJournalPrompt(null) }}>
          <div className="plan-journal-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Plan complete — log your session?</h4>
            <p className="pjm-desc">Create a journal entry for this imaging session to capture notes and track your progress.</p>

            <div className="pjm-preview">
              <div><strong>Date:</strong> {formatDate(journalPrompt.planDate)}</div>
              <div><strong>Location:</strong> {journalPrompt.locationName || 'Unknown'}</div>
              <div><strong>Targets:</strong> {snapshotTargetSummary(journalPrompt)}</div>
              <div><strong>Forecast:</strong> Score {(journalPrompt.planSnapshot || journalPrompt.plan_snapshot)?.forecastScore || '—'}</div>
              <div style={{ color: 'var(--text-dim)', marginTop: '4px' }}><em>Notes: (you'll fill this in)</em></div>
            </div>

            <div className="pjm-actions">
              <button className="pjm-create" onClick={(e) => { e.stopPropagation(); handleJournalCreate() }}>
                Create journal entry →
              </button>
              <button className="pjm-skip" onClick={(e) => { e.stopPropagation(); setJournalPrompt(null) }}>
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
