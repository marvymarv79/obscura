import { useState } from 'react'

export default function PlansHistory({
  plans,
  loading,
  onViewPlan,
  onClonePlan,
  onDeletePlan,
  onRefresh
}) {
  const [expandedPlan, setExpandedPlan] = useState(null)

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getMoonEmoji = (phase) => {
    if (!phase) return '🌙'
    const p = phase.toLowerCase()
    if (p.includes('new')) return '🌑'
    if (p.includes('waxing crescent')) return '🌒'
    if (p.includes('first quarter')) return '🌓'
    if (p.includes('waxing gibbous')) return '🌔'
    if (p.includes('full')) return '🌕'
    if (p.includes('waning gibbous')) return '🌖'
    if (p.includes('last quarter') || p.includes('third quarter')) return '🌗'
    if (p.includes('waning crescent')) return '🌘'
    return '🌙'
  }

  const getConditionsColor = (seeing, cloudCover) => {
    if (seeing >= 4 && cloudCover <= 20) return '#4ade80'
    if (seeing >= 3 && cloudCover <= 40) return '#ffd60a'
    return '#ff5400'
  }

  if (loading) {
    return (
      <div className="plans-history">
        <div className="plans-loading">Loading saved plans...</div>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="plans-history">
        <div className="plans-empty">
          <div className="empty-icon">📋</div>
          <h3>No Saved Plans</h3>
          <p>Create a plan in the "Tonight" tab and save it to see it here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="plans-history">
      <div className="plans-header">
        <h3>📋 Saved Imaging Plans</h3>
        <button className="refresh-button" onClick={onRefresh} title="Refresh">↻</button>
      </div>

      <div className="plans-list">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`plan-card ${expandedPlan === plan.id ? 'expanded' : ''}`}
          >
            <div
              className="plan-card-header"
              onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
            >
              <div className="plan-card-main">
                <div className="plan-card-title">
                  <span className="plan-moon">{getMoonEmoji(plan.moonPhase)}</span>
                  <span className="plan-name">{plan.name}</span>
                </div>
                <div className="plan-card-date">{formatDate(plan.planDate)}</div>
              </div>
              <div className="plan-card-meta">
                {plan.locationName && (
                  <span className="plan-location">📍 {plan.locationName}</span>
                )}
                {plan.seeing && (
                  <span
                    className="plan-conditions"
                    style={{ color: getConditionsColor(plan.seeing, plan.cloudCover) }}
                  >
                    Seeing: {plan.seeing}/5
                  </span>
                )}
              </div>
              <div className="plan-card-chevron">
                {expandedPlan === plan.id ? '▼' : '▶'}
              </div>
            </div>

            {expandedPlan === plan.id && (
              <div className="plan-card-details">
                <div className="plan-conditions-grid">
                  {plan.moonIllumination !== null && (
                    <div className="condition-item">
                      <span className="condition-label">Moon</span>
                      <span className="condition-value">{plan.moonIllumination}%</span>
                    </div>
                  )}
                  {plan.seeing && (
                    <div className="condition-item">
                      <span className="condition-label">Seeing</span>
                      <span className="condition-value">{plan.seeing}/5</span>
                    </div>
                  )}
                  {plan.transparency && (
                    <div className="condition-item">
                      <span className="condition-label">Transp</span>
                      <span className="condition-value">{plan.transparency}</span>
                    </div>
                  )}
                  {plan.cloudCover !== null && (
                    <div className="condition-item">
                      <span className="condition-label">Clouds</span>
                      <span className="condition-value">{plan.cloudCover}%</span>
                    </div>
                  )}
                </div>

                {plan.notes && (
                  <div className="plan-notes">
                    <strong>Notes:</strong> {plan.notes}
                  </div>
                )}

                <div className="plan-card-actions">
                  <button
                    className="plan-action-button view"
                    onClick={(e) => { e.stopPropagation(); onViewPlan(plan) }}
                  >
                    View Details
                  </button>
                  <button
                    className="plan-action-button clone"
                    onClick={(e) => { e.stopPropagation(); onClonePlan(plan) }}
                  >
                    Clone for New Session
                  </button>
                  <button
                    className="plan-action-button delete"
                    onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id) }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
