import { useState } from 'react'

export default function SavePlanModal({
  coords,
  moon,
  astropheric,
  selectedTargets,
  onSave,
  onClose
}) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a plan name')
      return
    }

    setSaving(true)
    try {
      const planData = {
        name: name.trim(),
        planDate: today,
        locationName: coords.locationName || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        moonPhase: moon?.phase || null,
        moonIllumination: moon?.illumination || null,
        seeing: astropheric?.Astrospheric_Seeing?.[0]?.Value?.ActualValue || null,
        transparency: astropheric?.Astrospheric_Transparency?.[0]?.Value?.ActualValue || null,
        cloudCover: Math.round(astropheric?.RDPS_CloudCover?.[0]?.Value?.ActualValue || 0),
        temperature: astropheric?.RDPS_Temperature?.[0]?.Value?.ActualValue
          ? Math.round((astropheric.RDPS_Temperature[0].Value.ActualValue - 273.15) * 9/5 + 32)
          : null,
        notes: notes.trim() || null,
        targets: selectedTargets.map((t, i) => ({
          targetId: t.target.id,
          targetName: t.target.name,
          priority: t.priority || i + 1,
          visibilityScore: t.score || null,
          gearScore: t.gearScore || null,
          defaultSetupId: t.bestSetup?.setup?.id || null,
          hoursAbove30: t.hoursAbove30 || null,
          moonSeparation: t.moonSeparation || null
        }))
      }

      await onSave(planData)
      onClose()
    } catch (error) {
      alert('Failed to save plan: ' + error.message)
    }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content save-plan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Save Imaging Plan</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="plan-preview">
            <div className="preview-item">
              <span className="preview-label">Date:</span>
              <span className="preview-value">{new Date(today).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Location:</span>
              <span className="preview-value">{coords.locationName || `${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°`}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Targets:</span>
              <span className="preview-value">{selectedTargets.length} target{selectedTargets.length !== 1 ? 's' : ''}</span>
            </div>
            {moon && (
              <div className="preview-item">
                <span className="preview-label">Moon:</span>
                <span className="preview-value">{moon.phase} ({moon.illumination}%)</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Plan Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., New Moon Galaxies Session"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this session..."
              rows={3}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button
            className="save-button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
