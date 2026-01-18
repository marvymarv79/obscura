import { useState, useEffect } from 'react'
import { DSO_DATABASE } from './astrocalc'
import { IMAGING_SETUPS } from './gearconfig'

function ImagingLog({ 
  coords, 
  savedLocations, 
  astropheric, 
  moon, 
  logEntries, 
  setLogEntries,
  onFetchConditions 
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterTarget, setFilterTarget] = useState('')
  const [filterGear, setFilterGear] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    locationId: null,
    locationName: '',
    targetId: '',
    setupId: '',
    gearNotes: '',
    exposures: [{ exposureTime: '', numSubs: '' }],
    notes: '',
    rating: 0,
    conditions: null
  })

  // Initialize location when coords change
  useEffect(() => {
    if (coords) {
      setFormData(prev => ({
        ...prev,
        locationName: coords.locationName,
        locationId: savedLocations.find(l => 
          l.latitude === coords.latitude && l.longitude === coords.longitude
        )?.id || null
      }))
    }
  }, [coords, savedLocations])

  // Auto-fill conditions when we have current data
  useEffect(() => {
    if (astropheric && moon && !editingId) {
      const isToday = formData.date === new Date().toISOString().split('T')[0]
      if (isToday) {
        setFormData(prev => ({
          ...prev,
          conditions: {
            seeing: astropheric.Astrospheric_Seeing[0].Value.ActualValue,
            transparency: astropheric.Astrospheric_Transparency[0].Value.ActualValue,
            cloudCover: Math.round(astropheric.RDPS_CloudCover[0].Value.ActualValue),
            temperature: kelvinToFahrenheit(astropheric.RDPS_Temperature[0].Value.ActualValue),
            dewPoint: kelvinToFahrenheit(astropheric.RDPS_DewPoint[0].Value.ActualValue),
            moonPhase: moon.phase,
            moonIllumination: moon.illumination
          }
        }))
      }
    }
  }, [astropheric, moon, formData.date, editingId])

  const kelvinToFahrenheit = (k) => Math.round((k - 273.15) * 9/5 + 32)

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      locationId: savedLocations.find(l =>
        coords && l.latitude === coords.latitude && l.longitude === coords.longitude
      )?.id || null,
      locationName: coords?.locationName || '',
      targetId: '',
      setupId: '',
      gearNotes: '',
      exposures: [{ exposureTime: '', numSubs: '' }],
      notes: '',
      rating: 0,
      conditions: null
    })
    setEditingId(null)
  }

  const addExposureRow = () => {
    setFormData(prev => ({
      ...prev,
      exposures: [...prev.exposures, { exposureTime: '', numSubs: '' }]
    }))
  }

  const removeExposureRow = (index) => {
    setFormData(prev => ({
      ...prev,
      exposures: prev.exposures.filter((_, i) => i !== index)
    }))
  }

  const updateExposureRow = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      exposures: prev.exposures.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    }))
  }

  const getTotalIntegration = (exposures) => {
    return exposures.reduce((sum, row) => {
      return sum + (parseFloat(row.exposureTime) || 0) * (parseInt(row.numSubs) || 0)
    }, 0)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.targetId || !formData.setupId) {
      alert('Please select a target and gear setup')
      return
    }

    const target = DSO_DATABASE.find(t => t.id === formData.targetId)
    const setup = IMAGING_SETUPS.find(s => s.id === formData.setupId)
    
    const exposures = formData.exposures
      .filter(row => row.exposureTime || row.numSubs)
      .map(row => ({
        exposureTime: parseFloat(row.exposureTime) || 0,
        numSubs: parseInt(row.numSubs) || 0
      }))

    const entry = {
      id: editingId || Date.now(),
      timestamp: new Date(`${formData.date}T${formData.time}`).toISOString(),
      date: formData.date,
      time: formData.time,
      locationId: formData.locationId,
      locationName: formData.locationName,
      targetId: formData.targetId,
      targetName: target.name,
      setupId: formData.setupId,
      setupName: setup.name,
      gearNotes: formData.gearNotes,
      exposures: exposures,
      totalIntegration: getTotalIntegration(formData.exposures),
      notes: formData.notes,
      rating: formData.rating,
      conditions: formData.conditions
    }

    if (editingId) {
      setLogEntries(prev => prev.map(e => e.id === editingId ? entry : e))
    } else {
      setLogEntries(prev => [entry, ...prev])
    }

    resetForm()
    setShowForm(false)
  }

  const handleEdit = (entry) => {
    // Handle legacy entries with single exposureTime/numSubs
    let exposures
    if (entry.exposures && entry.exposures.length > 0) {
      exposures = entry.exposures.map(row => ({
        exposureTime: row.exposureTime?.toString() || '',
        numSubs: row.numSubs?.toString() || ''
      }))
    } else {
      exposures = [{
        exposureTime: entry.exposureTime?.toString() || '',
        numSubs: entry.numSubs?.toString() || ''
      }]
    }

    setFormData({
      date: entry.date,
      time: entry.time,
      locationId: entry.locationId,
      locationName: entry.locationName,
      targetId: entry.targetId,
      setupId: entry.setupId,
      gearNotes: entry.gearNotes || '',
      exposures: exposures,
      notes: entry.notes || '',
      rating: entry.rating || 0,
      conditions: entry.conditions
    })
    setEditingId(entry.id)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (confirm('Delete this log entry?')) {
      setLogEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0s'
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) return `${hours}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const handleLocationChange = (locationId) => {
    if (locationId) {
      const loc = savedLocations.find(l => l.id === parseInt(locationId))
      if (loc) {
        setFormData(prev => ({
          ...prev,
          locationId: loc.id,
          locationName: loc.name
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        locationId: null,
        locationName: coords?.locationName || ''
      }))
    }
  }

  // Filter entries
  const filteredEntries = logEntries.filter(entry => {
    if (filterTarget && entry.targetId !== filterTarget) return false
    if (filterGear && entry.setupId !== filterGear) return false
    return true
  })

  // Calculate stats
  const totalSessions = logEntries.length
  const totalIntegrationTime = logEntries.reduce((sum, e) => sum + (e.totalIntegration || 0), 0)
  const uniqueTargets = [...new Set(logEntries.map(e => e.targetId))].length

  return (
    <div className="imaging-log">
      <div className="log-header">
        <h3>📸 Imaging Log</h3>
        <button 
          className="add-log-button"
          onClick={() => { resetForm(); setShowForm(!showForm) }}
        >
          {showForm ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="log-stats">
        <div className="log-stat">
          <span className="stat-value">{totalSessions}</span>
          <span className="stat-label">Sessions</span>
        </div>
        <div className="log-stat">
          <span className="stat-value">{uniqueTargets}</span>
          <span className="stat-label">Targets</span>
        </div>
        <div className="log-stat">
          <span className="stat-value">{formatDuration(totalIntegrationTime)}</span>
          <span className="stat-label">Total Integration</span>
        </div>
      </div>

      {/* Entry Form */}
      {showForm && (
        <form className="log-form" onSubmit={handleSubmit}>
          <h4>{editingId ? 'Edit Entry' : 'Log New Session'}</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input 
                type="time" 
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <select 
              value={formData.locationId || ''}
              onChange={(e) => handleLocationChange(e.target.value)}
            >
              <option value="">Current: {coords?.locationName || 'Not set'}</option>
              {savedLocations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Target *</label>
            <select 
              value={formData.targetId}
              onChange={(e) => setFormData(prev => ({ ...prev, targetId: e.target.value }))}
              required
            >
              <option value="">Select a target...</option>
              {DSO_DATABASE.map(target => (
                <option key={target.id} value={target.id}>
                  {target.name} ({target.type} in {target.constellation})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Gear Setup *</label>
            <select 
              value={formData.setupId}
              onChange={(e) => setFormData(prev => ({ ...prev, setupId: e.target.value }))}
              required
            >
              <option value="">Select gear...</option>
              {IMAGING_SETUPS.map(setup => (
                <option key={setup.id} value={setup.id}>{setup.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Gear Notes (reducer, filter, etc.)</label>
            <input 
              type="text"
              value={formData.gearNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, gearNotes: e.target.value }))}
              placeholder="e.g., +0.85x reducer, CLS filter"
            />
          </div>

          <div className="exposures-section">
            <div className="exposures-header">
              <label>Exposures</label>
              <button type="button" className="add-exposure-button" onClick={addExposureRow}>+</button>
            </div>
            {formData.exposures.map((row, index) => (
              <div className="form-row exposure-row" key={index}>
                <div className="form-group">
                  <label>Exposure (s)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={row.exposureTime}
                    onChange={(e) => updateExposureRow(index, 'exposureTime', e.target.value)}
                    placeholder="e.g., 120"
                  />
                </div>
                <div className="form-group">
                  <label>Subs</label>
                  <input
                    type="number"
                    min="0"
                    value={row.numSubs}
                    onChange={(e) => updateExposureRow(index, 'numSubs', e.target.value)}
                    placeholder="e.g., 50"
                  />
                </div>
                <div className="form-group row-total">
                  <label>Subtotal</label>
                  <div className="calculated-value">
                    {formatDuration((parseFloat(row.exposureTime) || 0) * (parseInt(row.numSubs) || 0))}
                  </div>
                </div>
                {formData.exposures.length > 1 && (
                  <button type="button" className="remove-exposure-button" onClick={() => removeExposureRow(index)}>×</button>
                )}
              </div>
            ))}
            <div className="form-group total-integration">
              <label>Total Integration</label>
              <div className="calculated-value total">
                {formatDuration(getTotalIntegration(formData.exposures))}
              </div>
            </div>
          </div>

          {formData.conditions && (
            <div className="conditions-preview">
              <label>Conditions (auto-captured)</label>
              <div className="conditions-grid">
                <span>Seeing: {formData.conditions.seeing}/5</span>
                <span>Transparency: {formData.conditions.transparency}</span>
                <span>Clouds: {formData.conditions.cloudCover}%</span>
                <span>Moon: {formData.conditions.moonIllumination}%</span>
                <span>Temp: {formData.conditions.temperature}°F</span>
                <span>Dew: {formData.conditions.dewPoint}°F</span>
              </div>
            </div>
          )}

          {!formData.conditions && formData.date !== new Date().toISOString().split('T')[0] && (
            <div className="conditions-note">
              <p>⚠️ Conditions not available for past dates</p>
            </div>
          )}

          <div className="form-group">
            <label>Rating</label>
            <div className="rating-selector">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`star-button ${formData.rating >= star ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, rating: prev.rating === star ? 0 : star }))}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea 
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="How did the session go? Any issues?"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button">
              {editingId ? 'Update Entry' : 'Save Entry'}
            </button>
            <button type="button" className="cancel-button" onClick={() => { resetForm(); setShowForm(false) }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      {logEntries.length > 0 && !showForm && (
        <div className="log-filters">
          <select 
            value={filterTarget} 
            onChange={(e) => setFilterTarget(e.target.value)}
          >
            <option value="">All Targets</option>
            {[...new Set(logEntries.map(e => e.targetId))].map(targetId => {
              const target = DSO_DATABASE.find(t => t.id === targetId)
              return (
                <option key={targetId} value={targetId}>{target?.name || targetId}</option>
              )
            })}
          </select>
          <select 
            value={filterGear} 
            onChange={(e) => setFilterGear(e.target.value)}
          >
            <option value="">All Gear</option>
            {[...new Set(logEntries.map(e => e.setupId))].map(setupId => {
              const setup = IMAGING_SETUPS.find(s => s.id === setupId)
              return (
                <option key={setupId} value={setupId}>{setup?.name || setupId}</option>
              )
            })}
          </select>
        </div>
      )}

      {/* Log Entries */}
      {!showForm && (
        <div className="log-entries">
          {filteredEntries.length === 0 ? (
            <div className="empty-log">
              <p>No imaging sessions logged yet.</p>
              <p>Click <strong>+ New Entry</strong> to log your first session!</p>
            </div>
          ) : (
            filteredEntries.map(entry => (
              <div key={entry.id} className="log-entry">
                <div className="entry-header">
                  <div className="entry-target">{entry.targetName}</div>
                  <div className="entry-date">{formatDate(entry.date)}</div>
                </div>
                
                <div className="entry-details">
                  <span className="entry-gear">{entry.setupName}{entry.gearNotes && ` (${entry.gearNotes})`}</span>
                  <span className="entry-location">📍 {entry.locationName}</span>
                </div>

                <div className="entry-stats">
                  {entry.exposures && entry.exposures.length > 0 ? (
                    <span className="exposures-list">
                      {entry.exposures.map((exp, i) => (
                        <span key={i}>
                          {exp.exposureTime}s × {exp.numSubs}
                          {i < entry.exposures.length - 1 ? ' + ' : ''}
                        </span>
                      ))}
                      {' = '}{formatDuration(entry.totalIntegration)}
                    </span>
                  ) : entry.exposureTime > 0 && (
                    <span>{entry.exposureTime}s × {entry.numSubs} = {formatDuration(entry.totalIntegration)}</span>
                  )}
                  {entry.rating > 0 && (
                    <span className="entry-rating">{'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}</span>
                  )}
                </div>

                {entry.conditions && (
                  <div className="entry-conditions">
                    <span>Seeing {entry.conditions.seeing}/5</span>
                    <span>Clouds {entry.conditions.cloudCover}%</span>
                    <span>Moon {entry.conditions.moonIllumination}%</span>
                  </div>
                )}

                {entry.notes && (
                  <div className="entry-notes">{entry.notes}</div>
                )}

                <div className="entry-actions">
                  <button onClick={() => handleEdit(entry)}>Edit</button>
                  <button onClick={() => handleDelete(entry.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default ImagingLog