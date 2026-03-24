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

function formatTargetSummary(targets) {
  if (!targets || targets.length === 0) return 'No targets'
  const names = targets.map(t => t.targetName || t.targetId)
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} + ${names.length - 2} more`
}

function getPreviewUrl(targetId) {
  return `/api/obscura/preview-proxy?targetId=${targetId}`
}

function formatTime(isoStr) {
  if (!isoStr) return '--:--'
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(minutes) {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function getScoreColor(score) {
  if (score >= 75) return 'var(--accent-green)'
  if (score >= 50) return 'var(--accent-ember)'
  return 'var(--accent-crimson)'
}

export default function PlansHistory({
  plans,
  loading,
  onSavePlan,
  onClonePlan,
  onDeletePlan,
  onRefresh,
  savedLocations,
  coords
}) {
  const [expandedPlan, setExpandedPlan] = useState(null)
  const [creating, setCreating] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [detailPlan, setDetailPlan] = useState(null)

  // New plan state
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split('T')[0])
  const [planLocationIdx, setPlanLocationIdx] = useState('')
  const [planNotes, setPlanNotes] = useState('')
  const [planTargets, setPlanTargets] = useState([])
  const [planTrains, setPlanTrains] = useState([])
  const [saving, setSaving] = useState(false)

  // Target browser
  const [showBrowser, setShowBrowser] = useState(false)
  const [browserTargets, setBrowserTargets] = useState([])
  const [browserLoading, setBrowserLoading] = useState(false)

  // Available imaging trains
  const [imagingTrains, setImagingTrains] = useState([])

  useEffect(() => {
    fetch('/api/apertura/profiles')
      .then(r => r.ok ? r.json() : [])
      .then(data => setImagingTrains(Array.isArray(data) ? data : []))
      .catch(() => setImagingTrains([]))
  }, [])

  const getSelectedLocation = () => {
    if (planLocationIdx !== '' && savedLocations) {
      return savedLocations[parseInt(planLocationIdx)]
    }
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
        // Filter out already-added targets
        const addedIds = new Set(planTargets.map(t => t.id))
        setBrowserTargets(data.filter(t => !addedIds.has(t.id)))
      }
    } catch (e) {
      setBrowserTargets([])
    }
    setBrowserLoading(false)
  }, [planDate, planLocationIdx, coords, savedLocations, planTargets])

  const openBrowser = () => {
    setShowBrowser(true)
    fetchBrowserTargets()
  }

  const addTarget = (target) => {
    setPlanTargets(prev => [...prev, {
      ...target,
      assignedTrainId: target.bestTrainId || null,
      assignedTrainName: target.bestTrainName || null
    }])
    setBrowserTargets(prev => prev.filter(t => t.id !== target.id))
  }

  const removeTarget = (targetId) => {
    setPlanTargets(prev => prev.filter(t => t.id !== targetId))
  }

  const updateTrainAssignment = (targetId, trainId) => {
    const train = imagingTrains.find(t => t.id === parseInt(trainId))
    setPlanTargets(prev => prev.map(t =>
      t.id === targetId
        ? { ...t, assignedTrainId: trainId ? parseInt(trainId) : null, assignedTrainName: train?.profile_name || null }
        : t
    ))
  }

  // Calculate overlap warnings
  const getOverlapWarning = () => {
    if (planTargets.length < 2) return null

    const windows = planTargets
      .filter(t => t.imagingWindow?.start && t.imagingWindow?.end)
      .map(t => ({
        name: t.ngc_ic_id,
        start: new Date(t.imagingWindow.start).getTime(),
        end: new Date(t.imagingWindow.end).getTime()
      }))
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

  const getTotalTime = () => {
    return planTargets.reduce((sum, t) => sum + (t.imagingWindow?.duration_minutes || 0), 0)
  }

  const handleSave = async () => {
    const loc = getSelectedLocation()
    if (!loc) return

    setSaving(true)
    try {
      const planData = {
        name: `Session ${planDate}`,
        planDate,
        locationName: loc.name || 'Unknown',
        latitude: loc.latitude,
        longitude: loc.longitude,
        notes: planNotes || null,
        targets: planTargets.map((t, i) => ({
          targetId: t.ngc_ic_id,
          targetName: t.common_name || t.ngc_ic_id,
          priority: i + 1,
          visibilityScore: t.score,
          defaultSetupId: t.assignedTrainId ? String(t.assignedTrainId) : null,
          transitTime: t.transitTime || null,
          moonSeparation: t.moonSeparation || null,
          notes: t.assignedTrainName || null
        }))
      }

      await onSavePlan(planData)
      setCreating(false)
      setPlanTargets([])
      setPlanNotes('')
    } catch (e) {
      alert('Failed to save plan: ' + e.message)
    }
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

  return (
    <div className="plans-history">
      <div className="plans-header">
        <h3>Plans</h3>
        <div className="plans-header-actions">
          <button className="refresh-button" onClick={onRefresh} title="Refresh">↻</button>
          <button className="new-plan-button" onClick={startNew}>+ New Plan</button>
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
                  <option value="">
                    {coords ? `Current (${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)})` : '— Select —'}
                  </option>
                  {savedLocations && savedLocations.map((loc, i) => (
                    <option key={i} value={i}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div className="pc-field pc-notes">
                <label>Notes</label>
                <textarea value={planNotes} onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="Session notes..." rows={2} />
              </div>
            </div>
          </div>

          {/* Target list */}
          <div className="plan-target-list">
            {planTargets.length === 0 ? (
              <div className="plan-targets-empty">
                No targets added yet. Click "Add Target" to browse.
              </div>
            ) : (
              planTargets.map(target => (
                <div key={target.id} className="plan-target-item">
                  <div className="pti-info">
                    <span className="pti-name">{target.ngc_ic_id}</span>
                    {target.common_name && <span className="pti-common">{target.common_name}</span>}
                    <span className="pti-type" style={{ background: TYPE_COLORS[target.object_type] || '#666' }}>
                      {TYPE_LABELS[target.object_type] || target.object_type}
                    </span>
                  </div>
                  <div className="pti-details">
                    <select className="pti-train-select"
                      value={target.assignedTrainId || ''}
                      onChange={(e) => updateTrainAssignment(target.id, e.target.value)}>
                      <option value="">Auto</option>
                      {imagingTrains.map(train => (
                        <option key={train.id} value={train.id}>{train.profile_name}</option>
                      ))}
                    </select>
                    {target.imagingWindow && (
                      <span className="pti-window">
                        {formatTime(target.imagingWindow.start)} — {formatTime(target.imagingWindow.end)}
                        {' '}({formatDuration(target.imagingWindow.duration_minutes)})
                      </span>
                    )}
                    <span className="pti-score" style={{ color: getScoreColor(target.score) }}>
                      {target.score}
                    </span>
                  </div>
                  <button className="pti-remove" onClick={() => removeTarget(target.id)}>×</button>
                </div>
              ))
            )}
          </div>

          {/* Night summary */}
          {planTargets.length > 0 && (
            <div className="plan-night-summary">
              <span>Total imaging time: {formatDuration(getTotalTime())}</span>
              <span>Targets: {planTargets.length}</span>
              {getOverlapWarning() && (
                <span className="overlap-warning">Overlap: {getOverlapWarning()}</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="plan-creator-actions">
            <button className="add-target-btn" onClick={openBrowser}>+ Add Target</button>
            <div className="pca-right">
              <button className="cancel-plan-btn" onClick={() => setCreating(false)}>Cancel</button>
              <button className="save-plan-btn" onClick={handleSave}
                disabled={saving || planTargets.length === 0}>
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>

          {/* Target browser modal */}
          {showBrowser && (
            <div className="target-browser-overlay" onClick={() => setShowBrowser(false)}>
              <div className="target-browser" onClick={(e) => e.stopPropagation()}>
                <div className="tb-header">
                  <h4>Add Target</h4>
                  <button className="close-button" onClick={() => setShowBrowser(false)}>×</button>
                </div>
                {browserLoading ? (
                  <div className="tb-loading">Scoring targets...</div>
                ) : browserTargets.length === 0 ? (
                  <div className="tb-empty">No targets available for this date and location.</div>
                ) : (
                  <div className="tb-list">
                    {browserTargets.slice(0, 15).map(target => (
                      <div key={target.id} className="tb-item" onClick={() => { addTarget(target); setShowBrowser(false) }}>
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
                            <span className="tb-window">
                              {formatTime(target.imagingWindow.start)} — {formatTime(target.imagingWindow.end)}
                            </span>
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
          {plans.map(plan => (
            <div key={plan.id} className="plan-card" onClick={() => setDetailPlan(plan)}>
              <div className="plan-card-header">
                <div className="plan-card-main">
                  <span className="plan-card-date">{formatDate(plan.planDate)}</span>
                  {plan.locationName && <span className="plan-card-loc"> · {plan.locationName}</span>}
                </div>
                <div className="plan-card-targets-summary">
                  {formatTargetSummary(plan.targets)}
                </div>
              </div>
              <span className="plan-card-chevron">▶</span>
            </div>
          ))}
        </div>
      )}

      {/* Plan Detail Modal */}
      {detailPlan && (
        <div className="plan-modal-overlay" onClick={(e) => { e.stopPropagation(); setDetailPlan(null) }}>
          <div className="plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="plan-modal-header">
              <div>
                <div className="pm-date">{formatDate(detailPlan.planDate)}</div>
                {detailPlan.locationName && <div className="pm-location">{detailPlan.locationName}</div>}
              </div>
              <button className="pm-close" onClick={(e) => { e.stopPropagation(); setDetailPlan(null) }}>×</button>
            </div>

            <div className="plan-modal-body">
              {detailPlan.notes && <div className="pm-notes">{detailPlan.notes}</div>}

              {detailPlan.targets && detailPlan.targets.length > 0 ? (
                detailPlan.targets.map((t, i) => (
                  <div key={i} className="pm-target-section">
                    <div className="pm-target-header">
                      <span className="pm-target-name">{t.targetId}</span>
                      <span className="pm-target-common">{t.targetName}</span>
                      {t.visibilityScore && (
                        <span className="pm-target-score" style={{ color: getScoreColor(t.visibilityScore) }}>
                          {t.visibilityScore}
                        </span>
                      )}
                    </div>
                    <div className="pm-target-meta">
                      {t.notes && <span className="pm-train">{t.notes}</span>}
                      {t.transitTime && <span className="pm-transit">Transit {formatTime(t.transitTime)}</span>}
                      {t.moonSeparation && <span className="pm-moon">Moon {Math.round(t.moonSeparation)}°</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="pm-empty">No targets in this plan.</div>
              )}
            </div>

            <div className="plan-modal-footer">
              <button className="plan-action-button clone"
                onClick={(e) => { e.stopPropagation(); onClonePlan(detailPlan); setDetailPlan(null) }}>
                Clone
              </button>
              {confirmDeleteId === detailPlan.id ? (
                <>
                  <button className="plan-action-button delete"
                    onClick={(e) => { e.stopPropagation(); onDeletePlan(detailPlan.id); setConfirmDeleteId(null); setDetailPlan(null) }}>
                    Delete?
                  </button>
                  <button className="plan-action-button cancel"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="plan-action-button delete"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(detailPlan.id) }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
