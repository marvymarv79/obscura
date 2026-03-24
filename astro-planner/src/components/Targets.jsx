import { useState, useEffect, useCallback } from 'react'

const TYPE_COLORS = {
  'EN': 'var(--accent-crimson)',
  'RN': '#3b82f6',
  'Galaxy': '#8b5cf6',
  'GGroup': '#8b5cf6',
  'GCl': '#f59e0b',
  'OCl': 'var(--accent-green)',
  'PN': '#06b6d4',
  'SNR': 'var(--accent-ember)'
}

const TYPE_LABELS = {
  'EN': 'Emission Nebula',
  'RN': 'Reflection Nebula',
  'Galaxy': 'Galaxy',
  'GGroup': 'Galaxy Group',
  'GCl': 'Globular Cluster',
  'OCl': 'Open Cluster',
  'PN': 'Planetary Nebula',
  'SNR': 'Supernova Remnant'
}

const FILTER_COLORS = {
  'L': '#888', 'R': '#ef4444', 'G': '#22c55e', 'B': '#3b82f6',
  'Ha': 'var(--accent-crimson)', 'SII': '#f59e0b', 'OIII': '#06b6d4',
  'OSC': 'var(--accent-ember)'
}

function formatTime(isoStr) {
  if (!isoStr) return '--:--'
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function getScoreColor(score) {
  if (score >= 75) return 'var(--accent-green)'
  if (score >= 50) return 'var(--accent-ember)'
  return 'var(--accent-crimson)'
}

function AltitudeChart({ altitudeCurve, imagingWindow, filterSequence, minAlt }) {
  if (!altitudeCurve || altitudeCurve.length === 0) return null

  const width = 480
  const height = 160
  const padding = { top: 10, right: 10, bottom: 25, left: 35 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const times = altitudeCurve.map(p => new Date(p.time).getTime())
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  const altMax = 90

  const x = (t) => padding.left + ((t - tMin) / (tMax - tMin)) * chartW
  const y = (alt) => padding.top + chartH - (Math.max(0, alt) / altMax) * chartH

  // Build path
  const points = altitudeCurve.map(p => {
    const t = new Date(p.time).getTime()
    return `${x(t).toFixed(1)},${y(p.altitude).toFixed(1)}`
  }).join(' ')

  // Imaging window shading
  let windowRect = null
  if (imagingWindow) {
    const ws = new Date(imagingWindow.start).getTime()
    const we = new Date(imagingWindow.end).getTime()
    windowRect = { x: x(ws), width: x(we) - x(ws) }
  }

  // Time labels (every 2 hours)
  const timeLabels = []
  const step = 2 * 3600000
  const firstHour = Math.ceil(tMin / step) * step
  for (let t = firstHour; t <= tMax; t += step) {
    const d = new Date(t)
    timeLabels.push({
      x: x(t),
      label: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    })
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="altitude-chart">
      {/* Darkness window */}
      {windowRect && (
        <rect x={windowRect.x} y={padding.top} width={windowRect.width} height={chartH}
          fill="rgba(232, 99, 10, 0.08)" />
      )}

      {/* Filter blocks on timeline */}
      {filterSequence && filterSequence.map((block, i) => {
        // Parse HH:MM times relative to the curve
        // These are UTC times from the API
        const blockStartH = parseInt(block.start.split(':')[0])
        const blockStartM = parseInt(block.start.split(':')[1])
        const blockEndH = parseInt(block.end.split(':')[0])
        const blockEndM = parseInt(block.end.split(':')[1])

        // Find closest curve points
        const curveDate = new Date(altitudeCurve[0].time)
        const bsDate = new Date(curveDate)
        bsDate.setUTCHours(blockStartH, blockStartM, 0, 0)
        if (bsDate.getTime() < tMin) bsDate.setDate(bsDate.getDate() + 1)
        const beDate = new Date(curveDate)
        beDate.setUTCHours(blockEndH, blockEndM, 0, 0)
        if (beDate.getTime() < bsDate.getTime()) beDate.setDate(beDate.getDate() + 1)

        const bx = x(bsDate.getTime())
        const bw = x(beDate.getTime()) - bx
        if (bw <= 0) return null

        return (
          <rect key={i} x={bx} y={chartH + padding.top - 8}
            width={Math.max(bw, 2)} height={6} rx={2}
            fill={FILTER_COLORS[block.filter] || '#666'}
            opacity={0.7} />
        )
      })}

      {/* Min altitude line */}
      <line x1={padding.left} y1={y(minAlt || 25)} x2={padding.left + chartW} y2={y(minAlt || 25)}
        stroke="var(--accent-crimson)" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
      <text x={padding.left + 2} y={y(minAlt || 25) - 3}
        fill="var(--accent-crimson)" fontSize={8} opacity={0.6}>{minAlt || 25}°</text>

      {/* Altitude curve */}
      <polyline points={points} fill="none" stroke="var(--accent-ember)" strokeWidth={2} />

      {/* Y-axis labels */}
      {[0, 30, 60, 90].map(alt => (
        <text key={alt} x={padding.left - 4} y={y(alt) + 3}
          fill="var(--text-muted)" fontSize={9} textAnchor="end">{alt}°</text>
      ))}

      {/* X-axis time labels */}
      {timeLabels.map((tl, i) => (
        <text key={i} x={tl.x} y={height - 3}
          fill="var(--text-muted)" fontSize={8} textAnchor="middle">{tl.label}</text>
      ))}
    </svg>
  )
}

export default function Targets({ coords, moon, selectedTargets, onSelectTarget, locationName, onPlanCreated, onAddToPlan }) {
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [trainFilter, setTrainFilter] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0])
  const [detailTarget, setDetailTarget] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const [imagingTrains, setImagingTrains] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetch('/api/apertura/profiles')
      .then(r => r.ok ? r.json() : [])
      .then(data => setImagingTrains(Array.isArray(data) ? data : []))
      .catch(() => setImagingTrains([]))
  }, [])

  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 3)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  const fetchTargets = useCallback(async () => {
    if (!coords) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        lat: coords.latitude,
        lng: coords.longitude,
        date: targetDate,
        minAlt: '25',
        minScore: '40',
        type: typeFilter
      })
      if (trainFilter) params.set('trainId', trainFilter)
      const resp = await fetch(`/api/obscura/targets?${params}`)
      if (!resp.ok) throw new Error('Failed to fetch targets')
      const data = await resp.json()
      setTargets(data)
    } catch (e) {
      setError('Could not load targets — check your connection.')
      setTargets([])
    }
    setLoading(false)
  }, [coords, targetDate, typeFilter, trainFilter])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  const fetchDetail = async (target) => {
    if (detailTarget?.id === target.id) {
      setDetailTarget(null)
      setDetailData(null)
      return
    }
    setDetailTarget(target)
    setDetailLoading(true)
    try {
      const params = new URLSearchParams({
        targetId: target.id,
        lat: coords.latitude,
        lng: coords.longitude,
        date: targetDate
      })
      if (target.bestTrainId) params.set('trainId', target.bestTrainId)
      const resp = await fetch(`/api/obscura/target-detail?${params}`)
      if (!resp.ok) throw new Error('Failed to fetch detail')
      const data = await resp.json()
      setDetailData(data)
    } catch (e) {
      setDetailData(null)
    }
    setDetailLoading(false)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const addToPlan = async (target, detail) => {
    if (!coords || !onAddToPlan) {
      showToast('Could not add to plan — try again')
      return
    }
    const tonight = new Date().toISOString().split('T')[0]
    try {
      const planData = {
        name: `Session ${tonight}`,
        planDate: tonight,
        locationName: locationName || 'Unknown',
        latitude: coords.latitude,
        longitude: coords.longitude,
        targets: [{
          targetId: target.ngc_ic_id,
          targetName: target.common_name || target.ngc_ic_id,
          priority: 1,
          visibilityScore: detail.score,
          defaultSetupId: detail.bestTrainId ? String(detail.bestTrainId) : null,
          transitTime: detail.transitTime || null,
          moonSeparation: detail.moonSeparation || null,
          notes: detail.bestTrainName || null
        }]
      }
      await onAddToPlan(planData)
      showToast('Added to tonight\'s plan')
      if (onPlanCreated) onPlanCreated()
    } catch (e) {
      showToast('Could not add to plan — try again')
    }
  }

  const sortedTargets = [...targets].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score
    if (sortBy === 'window') {
      const aStart = a.imagingWindow?.start ? new Date(a.imagingWindow.start).getTime() : Infinity
      const bStart = b.imagingWindow?.start ? new Date(b.imagingWindow.start).getTime() : Infinity
      return aStart - bStart
    }
    return 0
  })

  if (!coords) {
    return (
      <div className="targets-empty">
        <p>Load a location from the Tonight tab to see target recommendations.</p>
      </div>
    )
  }

  return (
    <div className="targets-tab">
      {/* Header */}
      <div className="targets-tab-header">
        <h3>Targets</h3>
        <div className="targets-controls">
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]} max={maxDateStr}
            className="targets-date-picker" />
          <div className="targets-type-filter">
            {['all', 'narrowband', 'broadband', 'lrgb'].map(t => (
              <button key={t} className={`type-pill ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}>
                {t === 'all' ? 'All' : t === 'lrgb' ? 'LRGB' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <select className="targets-train-filter" value={trainFilter}
            onChange={(e) => setTrainFilter(e.target.value)}>
            <option value="">Any train</option>
            {imagingTrains.map(train => (
              <option key={train.id} value={train.id}>{train.profile_name}</option>
            ))}
          </select>
          <button className={`sort-toggle ${sortBy === 'window' ? 'alt' : ''}`}
            onClick={() => setSortBy(sortBy === 'score' ? 'window' : 'score')}>
            {sortBy === 'score' ? 'By Score' : 'By Window'}
          </button>
          <span className="targets-location-indicator">
            {coords ? `${locationName || `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`}` : 'No location — select one on Tonight tab'}
          </span>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="targets-toast">{toast}</div>}

      {/* Error */}
      {error && <div className="targets-error">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="targets-grid-new">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="target-card-new skeleton">
              <div className="skel-line w60" /><div className="skel-line w40" />
              <div className="skel-line w80" /><div className="skel-line w50" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sortedTargets.length === 0 && (
        <div className="targets-empty">
          <p>No targets meet the current criteria. Try adjusting the filters or selecting a different date.</p>
        </div>
      )}

      {/* Target cards */}
      {!loading && sortedTargets.length > 0 && (
        <div className="targets-grid-new">
          {sortedTargets.map(target => {
            const isExpanded = detailTarget?.id === target.id
            return (
              <div key={target.id}>
                <div className={`target-card-new ${isExpanded ? 'expanded' : ''}`}>
                  <div className="tc-left">
                    <div className="tc-designation">{target.ngc_ic_id}</div>
                    {target.common_name && <div className="tc-common">{target.common_name}</div>}
                    <span className="tc-type-badge" style={{ background: TYPE_COLORS[target.object_type] || '#666' }}>
                      {TYPE_LABELS[target.object_type] || target.object_type}
                    </span>
                  </div>
                  <div className="tc-center">
                    <div className="tc-score" style={{ color: getScoreColor(target.score) }}>
                      {target.score}
                    </div>
                    {target.imagingWindow && (
                      <>
                        <div className="tc-window">
                          {formatTime(target.imagingWindow.start)} — {formatTime(target.imagingWindow.end)}
                          {' '}({formatDuration(target.imagingWindow.duration_minutes)})
                        </div>
                        <div className="tc-transit">
                          Transits {formatTime(target.transitTime)} at {target.maxAltitude}°
                        </div>
                      </>
                    )}
                    <div className="tc-moon">
                      Moon {target.moonSeparation}° away
                    </div>
                  </div>
                  <div className="tc-right">
                    {target.bestTrainName && (
                      <div className="tc-train">{target.bestTrainName}</div>
                    )}
                    {target.maj_axis_arcmin && (
                      <div className="tc-size">{parseFloat(target.maj_axis_arcmin).toFixed(1)}′
                        {target.min_axis_arcmin ? ` × ${parseFloat(target.min_axis_arcmin).toFixed(1)}′` : ''}
                      </div>
                    )}
                    <button className="tc-plan-btn" onClick={() => fetchDetail(target)}>
                      {isExpanded ? 'Close' : 'Plan →'}
                    </button>
                  </div>
                </div>

                {/* Detail panel */}
                {isExpanded && (
                  <div className="target-detail-panel">
                    {detailLoading ? (
                      <div className="detail-loading">Loading target details...</div>
                    ) : detailData ? (
                      <>
                        {/* Section 1: Overview */}
                        <div className="detail-section">
                          <div className="detail-section-title">Overview</div>
                          <div className="detail-overview-meta">
                            <span className="tc-type-badge" style={{ background: TYPE_COLORS[target.object_type] || '#666' }}>
                              {TYPE_LABELS[target.object_type] || target.object_type}
                            </span>
                            {target.maj_axis_arcmin && (
                              <span className="detail-size">Size: {parseFloat(target.maj_axis_arcmin).toFixed(1)}′
                                {target.min_axis_arcmin ? ` × ${parseFloat(target.min_axis_arcmin).toFixed(1)}′` : ''}
                              </span>
                            )}
                          </div>
                          <div className="detail-coords">
                            RA {parseFloat(target.ra_deg).toFixed(2)}° / Dec {parseFloat(target.dec_deg).toFixed(2)}°
                            {target.magnitude && <span> · mag {parseFloat(target.magnitude).toFixed(1)}</span>}
                          </div>
                          <div className="score-breakdown">
                            {detailData.components && Object.entries(detailData.components).map(([key, val]) => (
                              <div key={key} className="score-component">
                                <span className="sc-label">{key}</span>
                                <div className="sc-bar-track">
                                  <div className="sc-bar-fill" style={{
                                    width: `${val * 100}%`,
                                    background: val >= 0.7 ? 'var(--accent-green)' : val >= 0.4 ? 'var(--accent-ember)' : 'var(--accent-crimson)'
                                  }} />
                                </div>
                                <span className="sc-value">{Math.round(val * 100)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Section 2: Tonight's Window */}
                        <div className="detail-section">
                          <div className="detail-section-title">Tonight's Window</div>
                          {detailData.imagingWindow && (
                            <div className="detail-window-info">
                              <span>{formatTime(detailData.imagingWindow.start)} — {formatTime(detailData.imagingWindow.end)}</span>
                              <span>{formatDuration(detailData.imagingWindow.duration_minutes)}</span>
                              <span>Transit {formatTime(detailData.transitTime)} at {detailData.maxAltitude}°</span>
                              <span>Moon {detailData.moonSeparation}° away{moon ? ` · ${Math.round(moon.illumination || 0)}% illuminated` : ''}</span>
                            </div>
                          )}
                          <AltitudeChart
                            altitudeCurve={detailData.altitudeCurve}
                            imagingWindow={detailData.imagingWindow}
                            filterSequence={detailData.filterSequence}
                            minAlt={25}
                          />
                        </div>

                        {/* Section 3: Filter Sequence (mono only) */}
                        {detailData.cameraType === 'Mono' && detailData.filterSequence && detailData.filterSequence.length > 0 && (
                          <div className="detail-section">
                            <div className="detail-section-title">Filter Sequence</div>
                            <div className="filter-table">
                              <div className="filter-table-header">
                                <span>Filter</span><span>Start</span><span>End</span>
                                <span>Subs</span><span>Sub ″</span><span>Total</span>
                              </div>
                              {detailData.filterSequence.map((block, i) => (
                                <div key={i} className="filter-table-row">
                                  <span className="ft-filter" style={{ color: FILTER_COLORS[block.filter] || '#666' }}>
                                    {block.filter}
                                  </span>
                                  <span>{block.start}</span>
                                  <span>{block.end}</span>
                                  <span>{block.estimatedSubs}</span>
                                  <span>{block.recommendedSubExposure || block.subLength}s</span>
                                  <span>{Math.round(block.estimatedSubs * (block.recommendedSubExposure || block.subLength) / 60)}m</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section 4: Exposure Summary */}
                        <div className="detail-section">
                          <div className="detail-section-title">Exposure Summary</div>
                          {detailData.filterSequence && (
                            <div className="exposure-summary">
                              <div className="exp-total">
                                Total integration: {Math.round(detailData.filterSequence.reduce((sum, b) =>
                                  sum + b.estimatedSubs * (b.recommendedSubExposure || b.subLength), 0) / 60)}m
                              </div>
                              {detailData.hdr && (
                                <div className="hdr-warning">
                                  HDR recommended: bright core may clip at standard exposure. Add 30s subs during L window.
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Section 5: Add to Plan */}
                        <div className="detail-section">
                          <button className="add-to-plan-btn"
                            onClick={() => addToPlan(target, detailData)}>
                            Add to Tonight's Plan
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="detail-error">Could not load target details.</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
