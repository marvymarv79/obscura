import { useState, useEffect } from 'react'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton
} from '@clerk/clerk-react'
import './App.css'
import {
  DSO_DATABASE,
  TARGET_TYPES,
  FOCAL_LENGTH,
  getRecommendedTargets,
  getCardinalDirection,
  getRiseTransitSet
} from './astrocalc'
import {
  IMAGING_SETUPS,
  calculateGearCompatibility
} from './gearconfig'
import ImagingLog from './imaginglog'
import GearEditor from './GearEditor'

const GEAR_MATCH_THRESHOLD = 60

function App() {
  const [zipCode, setZipCode] = useState('')
  const [coords, setCoords] = useState(null)
  const [weather, setWeather] = useState(null)
  const [astropheric, setAstropheric] = useState(null)
  const [moon, setMoon] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('weather')
  const [savedLocations, setSavedLocations] = useState([])
  const [locationName, setLocationName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [targets, setTargets] = useState([])
  const [targetFilters, setTargetFilters] = useState({ types: [], focalLength: null, minScore: 20, gearSetup: null })
  const [showTargetFilters, setShowTargetFilters] = useState(false)
  const [selectedTargets, setSelectedTargets] = useState([])
  const [activeSetups, setActiveSetups] = useState([])
  const [logEntries, setLogEntries] = useState([])
  const [customGear, setCustomGear] = useState({ cameras: [], optics: [], setups: [] })

  useEffect(() => {
    const saved = localStorage.getItem('astroLocations')
    if (saved) setSavedLocations(JSON.parse(saved))
    const savedTargets = localStorage.getItem('selectedTargets')
    if (savedTargets) setSelectedTargets(JSON.parse(savedTargets))
    const savedSetups = localStorage.getItem('activeSetups')
    if (savedSetups) setActiveSetups(JSON.parse(savedSetups))
    const savedLog = localStorage.getItem('imagingLog')
    if (savedLog) setLogEntries(JSON.parse(savedLog))
    const savedGear = localStorage.getItem('customGear')
    if (savedGear) setCustomGear(JSON.parse(savedGear))
  }, [])

  useEffect(() => {
    if (coords && moon) {
      const recommended = getRecommendedTargets(coords.latitude, coords.longitude, new Date(), moon, { types: targetFilters.types, focalLength: targetFilters.focalLength, minScore: targetFilters.minScore })
      const withGearScores = recommended.map(item => {
        const gearCompat = calculateGearCompatibility(item.target)
        return { ...item, gearScore: gearCompat.overallScore, bestSetup: gearCompat.bestSetup, allGearScores: gearCompat.allScores }
      })
      
      let filtered = withGearScores
      if (targetFilters.gearSetup) {
        filtered = withGearScores.filter(item => {
          const setupScore = item.allGearScores.find(s => s.setup.id === targetFilters.gearSetup)
          return setupScore && setupScore.combinedScore >= GEAR_MATCH_THRESHOLD
        }).map(item => {
          const setupScore = item.allGearScores.find(s => s.setup.id === targetFilters.gearSetup)
          return { ...item, gearScore: setupScore.combinedScore, bestSetup: setupScore }
        })
      }
      
      setTargets(filtered)
    }
  }, [coords, moon, targetFilters])
  
  useEffect(() => {
    localStorage.setItem('selectedTargets', JSON.stringify(selectedTargets))
  }, [selectedTargets])
  
  useEffect(() => {
    localStorage.setItem('activeSetups', JSON.stringify(activeSetups))
  }, [activeSetups])

  useEffect(() => {
    localStorage.setItem('imagingLog', JSON.stringify(logEntries))
  }, [logEntries])

  useEffect(() => {
    localStorage.setItem('customGear', JSON.stringify(customGear))
  }, [customGear])

  // Get last imaged date for a target
  const getLastImaged = (targetId) => {
    const entries = logEntries.filter(e => e.targetId === targetId)
    if (entries.length === 0) return null
    const sorted = entries.sort((a, b) => new Date(b.date) - new Date(a.date))
    return sorted[0].date
  }

  const formatLastImaged = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getCloudDescription = (cc) => cc < 10 ? 'Clear' : cc < 30 ? 'Mostly Clear' : cc < 50 ? 'Partly Cloudy' : cc < 70 ? 'Mostly Cloudy' : 'Overcast'
  const getSeeingDescription = (s) => ['Cloudy', 'Poor', 'Below Average', 'Average', 'Above Average', 'Excellent'][Math.round(s)] || 'Unknown'
  const getTransparencyDescription = (t) => t <= 5 ? 'Excellent' : t <= 9 ? 'Above Average' : t <= 13 ? 'Average' : t <= 23 ? 'Below Average' : t <= 27 ? 'Poor' : 'Cloudy'
  const getWindDirection = (d) => ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(d/22.5)%16]
  const getMoonColor = (i) => i < 20 ? '#ffd60a' : i < 50 ? '#ffb347' : '#ff5400'
  const getDewRisk = (tK, dK) => kelvinToFahrenheit(tK) - kelvinToFahrenheit(dK)
  const getDewRiskDescription = (d) => d <= 5 ? 'High Risk' : d <= 10 ? 'Moderate' : d <= 15 ? 'Low Risk' : 'Very Low'
  const getDewRiskColor = (d) => d <= 5 ? '#ff5400' : d <= 10 ? '#ffb347' : d <= 15 ? '#ffd60a' : '#4ade80'
  const getWindColor = (m) => m <= 8 ? '#4ade80' : m <= 15 ? '#ffd60a' : '#ff5400'
  const getCloudColor = (p) => p <= 10 ? '#4ade80' : p <= 30 ? '#ffd60a' : '#ff5400'
  const getScoreColor = (s) => s >= 70 ? '#4ade80' : s >= 40 ? '#ffd60a' : '#ff5400'
  const getMoonSeparationColor = (d) => d >= 90 ? '#4ade80' : d >= 45 ? '#ffd60a' : '#ff5400'
  const toggleTypeFilter = (type) => setTargetFilters(p => ({ ...p, types: p.types.includes(type) ? p.types.filter(t => t !== type) : [...p.types, type] }))
  const formatTimeShort = (d) => d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--'
  const kelvinToFahrenheit = (k) => Math.round((k - 273.15) * 9/5 + 32)

  const toggleActiveSetup = (setupId) => {
    setActiveSetups(prev => prev.includes(setupId) ? prev.filter(id => id !== setupId) : [...prev, setupId])
  }

  const fetchWeather = async () => {
    if (!zipCode) return
    setLoading(true)
    try {
      console.log('Fetching location for:', zipCode)
      const locationResponse = await fetch('/api/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: zipCode }) })
      console.log('Location response status:', locationResponse.status)
      if (!locationResponse.ok) {
        const errorText = await locationResponse.text()
        console.error('Location error:', errorText)
        alert('Location not found.')
        setLoading(false)
        return
      }
      const locationData = await locationResponse.json()
      console.log('Location data:', locationData)
      const { latitude, longitude, locationName } = locationData
      setCoords({ latitude, longitude, locationName })

      console.log('Fetching astropheric data...')
      const astrophericResponse = await fetch(`/api/astropheric?lat=${latitude}&lon=${longitude}`)
      console.log('Astropheric response status:', astrophericResponse.status)
      if (astrophericResponse.ok) {
        const astroData = await astrophericResponse.json()
        console.log('Astropheric data received')
        setAstropheric(astroData.data)
      } else {
        console.error('Astropheric failed:', await astrophericResponse.text())
      }

      console.log('Fetching weather data...')
      const weatherResponse = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
      console.log('Weather response status:', weatherResponse.status)
      const weatherData = await weatherResponse.json()
      console.log('Weather data:', weatherData)
      setWeather({ temperature: weatherData.current.temperature_2m, humidity: weatherData.current.relative_humidity_2m, cloudCover: weatherData.current.cloud_cover, windSpeed: weatherData.current.wind_speed_10m, windDirection: weatherData.current.wind_direction_10m })

      console.log('Fetching moon data...')
      const moonResponse = await fetch(`/api/moon?lat=${latitude}&lon=${longitude}`)
      console.log('Moon response status:', moonResponse.status)
      const moonData = await moonResponse.json()
      console.log('Moon data:', moonData)
      setMoon(moonData)

      console.log('All data fetched successfully')
    } catch (error) {
      console.error('Fetch error:', error)
      alert('Error fetching data: ' + error.message)
    }
    setLoading(false)
  }

  const loadSavedLocation = async (location) => {
    setLoading(true)
    try {
      console.log('Loading saved location:', location.name)
      setCoords({ latitude: location.latitude, longitude: location.longitude, locationName: location.name })

      const astrophericResponse = await fetch(`/api/astropheric?lat=${location.latitude}&lon=${location.longitude}`)
      console.log('Astropheric response status:', astrophericResponse.status)
      if (astrophericResponse.ok) {
        const astroData = await astrophericResponse.json()
        setAstropheric(astroData.data)
      } else {
        console.error('Astropheric failed:', await astrophericResponse.text())
      }

      const weatherResponse = await fetch(`/api/weather?lat=${location.latitude}&lon=${location.longitude}`)
      const weatherData = await weatherResponse.json()
      setWeather({ temperature: weatherData.current.temperature_2m, humidity: weatherData.current.relative_humidity_2m, cloudCover: weatherData.current.cloud_cover, windSpeed: weatherData.current.wind_speed_10m, windDirection: weatherData.current.wind_direction_10m })

      const moonResponse = await fetch(`/api/moon?lat=${location.latitude}&lon=${location.longitude}`)
      const moonData = await moonResponse.json()
      setMoon(moonData)

      console.log('Saved location loaded successfully')
    } catch (error) {
      console.error('Error:', error)
      alert('Error fetching data: ' + error.message)
    }
    setLoading(false)
  }

  const saveCurrentLocation = () => {
    if (!coords || !locationName.trim()) { alert('Please enter a name'); return }
    const newLocation = { id: Date.now(), name: locationName.trim(), latitude: coords.latitude, longitude: coords.longitude }
    const updated = [...savedLocations, newLocation]
    setSavedLocations(updated)
    localStorage.setItem('astroLocations', JSON.stringify(updated))
    setLocationName(''); setShowSaveDialog(false)
  }

  const deleteLocation = (id) => {
    if (!confirm('Delete this location?')) return
    const updated = savedLocations.filter(loc => loc.id !== id)
    setSavedLocations(updated)
    localStorage.setItem('astroLocations', JSON.stringify(updated))
  }
  
  const isTargetSelected = (targetId) => selectedTargets.some(t => t.id === targetId)
  
  const toggleTargetSelection = (targetData) => {
    if (isTargetSelected(targetData.target.id)) {
      setSelectedTargets(prev => prev.filter(t => t.id !== targetData.target.id))
    } else {
      const newSelected = { id: targetData.target.id, target: targetData.target, priority: selectedTargets.length + 1, score: targetData.score, gearScore: targetData.gearScore, bestSetup: targetData.bestSetup, allGearScores: targetData.allGearScores, transit: targetData.transit, currentAltitude: targetData.currentAltitude, moonSeparation: targetData.moonSeparation, hoursAbove30: targetData.hoursAbove30 }
      setSelectedTargets(prev => [...prev, newSelected])
    }
  }
  
  const updateTargetPriority = (targetId, newPriority) => {
    setSelectedTargets(prev => prev.map(t => t.id === targetId ? { ...t, priority: newPriority } : t).sort((a, b) => a.priority - b.priority))
  }
  
  const removeSelectedTarget = (targetId) => {
    setSelectedTargets(prev => prev.filter(t => t.id !== targetId).map((t, i) => ({ ...t, priority: i + 1 })))
  }
  
  const clearAllSelected = () => { if (confirm('Clear all?')) setSelectedTargets([]) }
  
  const getGroupedPlan = () => {
    if (!coords || selectedTargets.length === 0) return {}
    const setupsToUse = activeSetups.length > 0 ? activeSetups : [...new Set(selectedTargets.map(t => t.bestSetup?.setup?.id).filter(Boolean))]
    const groups = {}
    
    selectedTargets.forEach(item => {
      let bestActiveSetup = null
      let bestScore = 0
      
      if (item.allGearScores) {
        for (const setupId of setupsToUse) {
          const scoreData = item.allGearScores.find(s => s.setup.id === setupId)
          if (scoreData && scoreData.combinedScore > bestScore) {
            bestScore = scoreData.combinedScore
            bestActiveSetup = scoreData
          }
        }
      }
      
      if (!bestActiveSetup) bestActiveSetup = item.bestSetup
      
      const setupId = bestActiveSetup?.setup?.id || 'unknown'
      const setupName = bestActiveSetup?.setup?.name || 'Other'
      
      if (!groups[setupId]) {
        groups[setupId] = { setupId, setupName, setup: bestActiveSetup?.setup, targets: [] }
      }
      
      const rts = getRiseTransitSet(item.target.ra, item.target.dec, coords.latitude, coords.longitude, new Date(), 30)
      groups[setupId].targets.push({ ...item, transit: rts.transit, rts, assignedSetup: bestActiveSetup })
    })
    
    Object.values(groups).forEach(group => {
      group.targets.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        if (a.transit && b.transit) return a.transit - b.transit
        return 0
      })
    })
    
    return groups
  }

  const currentDewDelta = astropheric ? getDewRisk(astropheric.RDPS_Temperature[0].Value.ActualValue, astropheric.RDPS_DewPoint[0].Value.ActualValue) : null

  return (
    <div className="app">
      <SignedOut>
        <div className="auth-container">
          <div className="auth-content">
            <h1>🔭 Obscura</h1>
            <p>Plan your astrophotography session</p>
            <div className="auth-buttons">
              <SignInButton mode="modal">
                <button className="primary-button">Sign In</button>
              </SignInButton>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="content">
          <div className="header-section">
            <div className="header-top">
              <h1>🔭 Obscura</h1>
              <UserButton />
            </div>
            <p>Plan your astrophotography session</p>
          </div>

          {savedLocations.length > 0 && (
          <div className="saved-locations">
            <h3>📍 Saved Locations</h3>
            <div className="location-buttons">
              {savedLocations.map(loc => (
                <div key={loc.id} className="location-card">
                  <button className="location-button" onClick={() => loadSavedLocation(loc)} disabled={loading}>
                    <span className="location-name">{loc.name}</span>
                    <span className="location-coords">{loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°</span>
                  </button>
                  <button className="delete-button" onClick={(e) => { e.stopPropagation(); deleteLocation(loc.id) }} title="Delete">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="input-section">
          <div className="location-input">
            <label>ZIP Code or Coordinates:</label>
            <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="e.g., 78701 or 30.2672, -97.7431" onKeyPress={(e) => e.key === 'Enter' && fetchWeather()} />
          </div>
          <div className="action-buttons">
            <button className="primary-button" onClick={fetchWeather} disabled={loading}>{loading ? 'Loading...' : 'Get Forecast'}</button>
            {coords && !showSaveDialog && <button className="secondary-button" onClick={() => setShowSaveDialog(true)}>💾 Save Location</button>}
          </div>
        </div>

        {showSaveDialog && (
          <div className="save-dialog">
            <input type="text" placeholder="Location name" value={locationName} onChange={(e) => setLocationName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && saveCurrentLocation()} />
            <div className="save-dialog-buttons">
              <button onClick={saveCurrentLocation}>Save</button>
              <button onClick={() => setShowSaveDialog(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Gear button - always visible */}
        <button
          className={`gear-button-wide ${activeTab === 'gear' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'gear' ? 'weather' : 'gear')}
        >
          Gear Manager
        </button>

        {coords && weather && moon && astropheric && activeTab !== 'gear' && (
          <div className="tab-navigation">
            <button className={`tab-button ${activeTab === 'weather' ? 'active' : ''}`} onClick={() => setActiveTab('weather')}>Weather</button>
            <button className={`tab-button ${activeTab === 'targets' ? 'active' : ''}`} onClick={() => setActiveTab('targets')}>Targets {targets.length > 0 && <span className="tab-badge">{targets.length}</span>}</button>
            <button className={`tab-button ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>Plan {selectedTargets.length > 0 && <span className="tab-badge">{selectedTargets.length}</span>}</button>
            <button className={`tab-button ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>Log {logEntries.length > 0 && <span className="tab-badge">{logEntries.length}</span>}</button>
          </div>
        )}

        {coords && weather && moon && astropheric && (
          <>

            {activeTab === 'weather' && (
              <div className="tab-content">
                <div className="summary-cards">
                  <div className="summary-card"><div className="card-icon">📍</div><div className="card-content"><div className="card-label">Location</div><div className="card-value-small">{coords.locationName}</div><div className="card-subvalue">{coords.latitude.toFixed(4)}°, {coords.longitude.toFixed(4)}°</div></div></div>
                  <div className="summary-card"><div className="card-icon">🌙</div><div className="card-content"><div className="card-label">Moon</div><div className="card-value">{moon.emoji} {moon.phase}</div><div className="card-subvalue" style={{color: getMoonColor(moon.illumination)}}>{moon.illumination}% Illuminated</div></div></div>
                  <div className="summary-card"><div className="card-icon">👁️</div><div className="card-content"><div className="card-label">Seeing</div><div className="card-value">{getSeeingDescription(astropheric.Astrospheric_Seeing[0].Value.ActualValue)}</div><div className="card-subvalue">{astropheric.Astrospheric_Seeing[0].Value.ActualValue}/5</div></div></div>
                  <div className="summary-card"><div className="card-icon">🔭</div><div className="card-content"><div className="card-label">Transparency</div><div className="card-value">{getTransparencyDescription(astropheric.Astrospheric_Transparency[0].Value.ActualValue)}</div><div className="card-subvalue">{astropheric.Astrospheric_Transparency[0].Value.ActualValue}</div></div></div>
                  <div className="summary-card"><div className="card-icon">☁️</div><div className="card-content"><div className="card-label">Clouds</div><div className="card-value">{Math.round(astropheric.RDPS_CloudCover[0].Value.ActualValue)}%</div><div className="card-subvalue">{getCloudDescription(astropheric.RDPS_CloudCover[0].Value.ActualValue)}</div></div></div>
                  <div className="summary-card"><div className="card-icon">💧</div><div className="card-content"><div className="card-label">Dew Risk</div><div className="card-value" style={{color: getDewRiskColor(currentDewDelta)}}>{getDewRiskDescription(currentDewDelta)}</div><div className="card-subvalue">Δ{currentDewDelta}°F</div></div></div>
                </div>
                <div className="forecast-table-section">
                  <h3>81-Hour Forecast</h3>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Hour</th><th>Clouds</th><th>Seeing</th><th>Transp</th><th>Temp</th><th>Dew</th><th>ΔDew</th><th>Wind</th></tr></thead>
                      <tbody>
                        {astropheric.RDPS_CloudCover.map((_, i) => {
                          const startTime = new Date(astropheric.LocalStartTime)
                          const hourTime = new Date(startTime.getTime() + i * 60 * 60 * 1000)
                          const timeStr = hourTime.toLocaleTimeString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true })
                          const clouds = Math.round(astropheric.RDPS_CloudCover[i].Value.ActualValue)
                          const seeing = astropheric.Astrospheric_Seeing[i].Value.ActualValue
                          const transparency = astropheric.Astrospheric_Transparency[i].Value.ActualValue
                          const temp = kelvinToFahrenheit(astropheric.RDPS_Temperature[i].Value.ActualValue)
                          const dewPoint = kelvinToFahrenheit(astropheric.RDPS_DewPoint[i].Value.ActualValue)
                          const dewDelta = temp - dewPoint
                          const windSpeed = Math.round(astropheric.RDPS_WindVelocity[i].Value.ActualValue * 2.237)
                          const windDir = Math.round(astropheric.RDPS_WindDirection[i].Value.ActualValue)
                          const rowClass = clouds < 30 && seeing >= 3 && transparency <= 13 ? 'excellent' : clouds < 50 && seeing >= 2 ? 'good' : clouds < 70 ? 'ok' : 'poor'
                          return (
                            <tr key={i} className={rowClass}>
                              <td className="time-cell">{timeStr}</td>
                              <td style={{color: getCloudColor(clouds)}}>{clouds}%</td>
                              <td style={{color: astropheric.Astrospheric_Seeing[i].Value.ValueColor}}>{seeing}/5</td>
                              <td style={{color: astropheric.Astrospheric_Transparency[i].Value.ValueColor}}>{transparency}</td>
                              <td>{temp}°F</td>
                              <td>{dewPoint}°F</td>
                              <td style={{color: getDewRiskColor(dewDelta)}}>Δ{dewDelta}°</td>
                              <td style={{color: getWindColor(windSpeed)}}>{windSpeed} mph {getWindDirection(windDir)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'targets' && (
              <div className="tab-content">
                <div className="targets-section">
                  <div className="targets-header">
                    <h3>🎯 Recommended Targets</h3>
                    <button className="filter-toggle" onClick={() => setShowTargetFilters(!showTargetFilters)}>{showTargetFilters ? 'Hide Filters' : 'Filters'}</button>
                  </div>
                  {showTargetFilters && (
                    <div className="target-filters">
                      <div className="filter-group">
                        <label>Filter by Gear (score ≥{GEAR_MATCH_THRESHOLD}):</label>
                        <select value={targetFilters.gearSetup || ''} onChange={(e) => setTargetFilters(prev => ({ ...prev, gearSetup: e.target.value || null }))}>
                          <option value="">All Gear</option>
                          {IMAGING_SETUPS.map(setup => (<option key={setup.id} value={setup.id}>{setup.name}</option>))}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Type:</label>
                        <div className="filter-chips">{Object.values(TARGET_TYPES).map(type => (<button key={type} className={`filter-chip ${targetFilters.types.includes(type) ? 'active' : ''}`} onClick={() => toggleTypeFilter(type)}>{type}</button>))}</div>
                      </div>
                      <div className="filter-group">
                        <label>Recommended Focal Length:</label>
                        <select value={targetFilters.focalLength || ''} onChange={(e) => setTargetFilters(prev => ({ ...prev, focalLength: e.target.value || null }))}><option value="">All</option>{Object.values(FOCAL_LENGTH).map(fl => (<option key={fl} value={fl}>{fl}</option>))}</select>
                      </div>
                      <div className="filter-group">
                        <label>Min Visibility Score: {targetFilters.minScore}</label>
                        <input type="range" min="0" max="80" value={targetFilters.minScore} onChange={(e) => setTargetFilters(prev => ({ ...prev, minScore: parseInt(e.target.value) }))} />
                      </div>
                    </div>
                  )}
                  <div className="targets-count">
                    Showing {targets.length} of {DSO_DATABASE.length} targets
                    {targetFilters.gearSetup && <span className="gear-filter-badge"> for {IMAGING_SETUPS.find(s => s.id === targetFilters.gearSetup)?.name}</span>}
                    {selectedTargets.length > 0 && <span className="selected-count"> • {selectedTargets.length} selected</span>}
                  </div>
                  <div className="targets-grid">
                    {targets.slice(0, 30).map((item) => {
                      const { target, score, gearScore, bestSetup, currentAltitude, currentAzimuth, moonSeparation, hoursAbove30, isGoodMonth } = item
                      const isSelected = isTargetSelected(target.id)
                      const lastImaged = getLastImaged(target.id)
                      return (
                        <div key={target.id} className={`target-card ${isGoodMonth ? 'in-season' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => toggleTargetSelection(item)}>
                          <div className="target-select-indicator">{isSelected ? '✓' : '+'}</div>
                          <div className="target-header">
                            <div className="target-name">{target.name}</div>
                            <div className="target-scores">
                              <div className="score-badge" style={{ background: getScoreColor(score) }} title="Visibility">{score}</div>
                              <div className="score-badge gear-score" style={{ background: getScoreColor(gearScore) }} title="Gear">🔧{gearScore}</div>
                            </div>
                          </div>
                          <div className="target-type-line"><span className="target-type">{target.type}</span><span className="target-constellation">{target.constellation}</span></div>
                          <div className="target-details">
                            <div className="target-detail"><span className="detail-label">Alt</span><span className="detail-value" style={{ color: currentAltitude > 30 ? '#4ade80' : currentAltitude > 15 ? '#ffd60a' : '#ff5400' }}>{Math.round(currentAltitude)}°</span></div>
                            <div className="target-detail"><span className="detail-label">Az</span><span className="detail-value">{getCardinalDirection(currentAzimuth)}</span></div>
                            <div className="target-detail"><span className="detail-label">🌙</span><span className="detail-value" style={{ color: getMoonSeparationColor(moonSeparation) }}>{Math.round(moonSeparation)}°</span></div>
                            <div className="target-detail"><span className="detail-label">Hrs</span><span className="detail-value">{hoursAbove30.toFixed(1)}</span></div>
                          </div>
                          <div className="target-meta"><span className="target-size">{target.size.width}' × {target.size.height}'</span><span className="target-mag">mag {target.magnitude}</span></div>
                          {bestSetup && <div className="target-best-setup">Best: {bestSetup.setup.name} ({bestSetup.fovFit.fillPercent.toFixed(0)}% fill)</div>}
                          {lastImaged && <div className="target-last-imaged">📸 Last imaged: {formatLastImaged(lastImaged)}</div>}
                          {target.description && <div className="target-description">{target.description}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'plan' && (
              <div className="tab-content">
                <div className="plan-section">
                  <div className="plan-header">
                    <h3>📋 Tonight's Plan</h3>
                    {selectedTargets.length > 0 && <button className="clear-plan-button" onClick={clearAllSelected}>Clear All</button>}
                  </div>
                  
                  <div className="active-setups-section">
                    <label>Active Gear Tonight:</label>
                    <div className="setup-toggles">
                      {IMAGING_SETUPS.map(setup => (
                        <button key={setup.id} className={`setup-toggle ${activeSetups.includes(setup.id) ? 'active' : ''}`} onClick={() => toggleActiveSetup(setup.id)}>{setup.name}</button>
                      ))}
                    </div>
                    {activeSetups.length === 0 && <p className="setup-hint">Select the gear you're using tonight to group targets by setup</p>}
                  </div>
                  
                  {selectedTargets.length === 0 ? (
                    <div className="empty-plan"><p>No targets selected.</p><p>Go to <strong>Targets</strong> tab and click targets to add them.</p></div>
                  ) : (
                    <>
                      <div className="plan-summary"><p>{selectedTargets.length} target{selectedTargets.length !== 1 ? 's' : ''} selected</p></div>
                      {Object.values(getGroupedPlan()).map(group => (
                        <div key={group.setupId} className="plan-group">
                          <div className="plan-group-header">
                            <span className="plan-group-name">📷 {group.setupName}</span>
                            <span className="plan-group-count">{group.targets.length} target{group.targets.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="plan-list">
                            {group.targets.map((item) => (
                              <div key={item.id} className="plan-item">
                                <div className="plan-item-priority"><input type="number" min="1" max={selectedTargets.length} value={item.priority} onChange={(e) => updateTargetPriority(item.id, parseInt(e.target.value) || 1)} className="priority-input" /></div>
                                <div className="plan-item-content">
                                  <div className="plan-item-header"><span className="plan-item-name">{item.target.name}</span><span className="plan-item-type">{item.target.type}</span></div>
                                  <div className="plan-item-details">
                                    <div className="plan-detail"><span className="plan-label">Transit:</span><span className="plan-value">{item.transit ? formatTimeShort(item.transit) : 'N/A'}</span></div>
                                    <div className="plan-detail"><span className="plan-label">Hrs&gt;30°:</span><span className="plan-value">{item.hoursAbove30?.toFixed(1) || '--'}</span></div>
                                    <div className="plan-detail"><span className="plan-label">Moon:</span><span className="plan-value" style={{ color: getMoonSeparationColor(item.moonSeparation) }}>{Math.round(item.moonSeparation || 0)}°</span></div>
                                    <div className="plan-detail"><span className="plan-label">Vis:</span><span className="plan-value" style={{ color: getScoreColor(item.score) }}>{item.score}</span></div>
                                    <div className="plan-detail"><span className="plan-label">Gear:</span><span className="plan-value" style={{ color: getScoreColor(item.assignedSetup?.combinedScore || item.gearScore) }}>{item.assignedSetup?.combinedScore || item.gearScore}</span></div>
                                  </div>
                                  {item.assignedSetup && <div className="plan-item-setup">{item.assignedSetup.fovFit.rating} • {item.assignedSetup.fovFit.fillPercent.toFixed(0)}% FOV fill</div>}
                                </div>
                                <button className="remove-item-button" onClick={() => removeSelectedTarget(item.id)} title="Remove">×</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'log' && (
              <div className="tab-content">
                <ImagingLog
                  coords={coords}
                  savedLocations={savedLocations}
                  astropheric={astropheric}
                  moon={moon}
                  logEntries={logEntries}
                  setLogEntries={setLogEntries}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'gear' && (
          <div className="tab-content">
            <GearEditor customGear={customGear} setCustomGear={setCustomGear} />
          </div>
        )}
        </div>
      </SignedIn>
    </div>
  )
}

export default App