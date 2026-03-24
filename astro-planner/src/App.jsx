import { useState, useEffect, useCallback, useRef } from 'react'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser
} from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { useApi } from './hooks/useApi'
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
import { buildForecastDays } from './nightScore'
import { seeingMetric, transparencyMetric, cloudMetric, windMetric, moonMetric, dewMetric } from './conditionsHelpers'
import ImagingLog from './imaginglog'
import GearEditor from './GearEditor'
import PlansHistory from './components/PlansHistory'
import Journal from './components/Journal'
import SavePlanModal from './components/SavePlanModal'
import Targets from './components/Targets'

const GEAR_MATCH_THRESHOLD = 60

function App() {
  const { user, isLoaded: userLoaded } = useUser()
  const { get, post, put, del, isSignedIn } = useApi()

  // Main navigation - top level tabs
  const [mainTab, setMainTab] = useState('tonight') // tonight, plans, journal

  // Tonight tab state
  const [zipCode, setZipCode] = useState('')
  const [coords, setCoords] = useState(null)
  const [weather, setWeather] = useState(null)
  const [astropheric, setAstropheric] = useState(null)
  const [moon, setMoon] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
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
  const [selectedDay, setSelectedDay] = useState(0)

  // Plans state
  const [savedPlans, setSavedPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [showSavePlanModal, setShowSavePlanModal] = useState(false)

  // Journal state
  const [journalEntries, setJournalEntries] = useState([])
  const [journalTags, setJournalTags] = useState([])
  const [journalLoading, setJournalLoading] = useState(false)

  // Data sync state
  const [synced, setSynced] = useState(false)

  // Table scroll state for mobile
  const tableContainerRef = useRef(null)
  const [isScrolledRight, setIsScrolledRight] = useState(false)

  // Handle table scroll to detect when scrolled to right edge
  const handleTableScroll = useCallback((e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target
    const isAtRight = scrollLeft + clientWidth >= scrollWidth - 10
    setIsScrolledRight(isAtRight)
  }, [])

  // Load data from localStorage (fallback and initial)
  const loadFromLocalStorage = useCallback(() => {
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

  // Load plans from API
  const loadPlans = useCallback(async () => {
    if (!isSignedIn) return
    setPlansLoading(true)
    try {
      const plans = await get('/api/plans')
      setSavedPlans(plans)
    } catch (error) {
      console.error('Failed to load plans:', error)
    }
    setPlansLoading(false)
  }, [get, isSignedIn])

  // Load journal from API
  const loadJournal = useCallback(async () => {
    if (!isSignedIn) return
    setJournalLoading(true)
    try {
      const [entries, tags] = await Promise.all([
        get('/api/journal'),
        get('/api/tags')
      ])
      setJournalEntries(entries)
      setJournalTags(tags)
    } catch (error) {
      console.error('Failed to load journal:', error)
    }
    setJournalLoading(false)
  }, [get, isSignedIn])

  // Load user data from API
  const loadUserData = useCallback(async () => {
    try {
      // Load locations
      const locations = await get('/api/locations')
      if (locations.length > 0) {
        setSavedLocations(locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude)
        })))
      }

      // Load saved plans
      loadPlans()

      // Load journal
      loadJournal()

    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }, [get, loadPlans, loadJournal])

  // Sync user on sign in
  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !userLoaded || synced) return

      try {
        await post('/api/users/sync', { email: user?.primaryEmailAddress?.emailAddress })
        setSynced(true)
        // Load user data after sync
        loadUserData()
      } catch (error) {
        console.error('Failed to sync user:', error)
      }
    }

    syncUser()
  }, [isSignedIn, userLoaded, synced, post, user, loadUserData])

  // Initial load from localStorage
  useEffect(() => {
    loadFromLocalStorage()
  }, [loadFromLocalStorage])

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

  // Note: customGear is now persisted via API in GearEditor
  // localStorage save removed to avoid conflicts

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
  const getMoonColor = (i) => i < 20 ? '#10b95a' : i < 50 ? '#e8630a' : '#cc2936'
  const getDewRisk = (tK, dK) => kelvinToFahrenheit(tK) - kelvinToFahrenheit(dK)
  const getDewRiskDescription = (d) => d <= 5 ? 'High Risk' : d <= 10 ? 'Moderate' : d <= 15 ? 'Low Risk' : 'Very Low'
  const getDewRiskColor = (d) => d <= 5 ? '#cc2936' : d <= 10 ? '#e8630a' : d <= 15 ? '#e8630a' : '#10b95a'
  const getWindColor = (m) => m <= 8 ? '#10b95a' : m <= 15 ? '#e8630a' : '#cc2936'
  const getCloudColor = (p) => p <= 10 ? '#10b95a' : p <= 30 ? '#e8630a' : '#cc2936'
  const getScoreColor = (s) => s >= 70 ? '#10b95a' : s >= 40 ? '#e8630a' : '#cc2936'
  const getMoonSeparationColor = (d) => d >= 90 ? '#10b95a' : d >= 45 ? '#e8630a' : '#cc2936'
  const getSeeingColor = (s) => s >= 4 ? '#10b95a' : s >= 2 ? '#e8630a' : '#cc2936'
  const getTransparencyColor = (t) => t <= 5 ? '#10b95a' : t <= 13 ? '#e8630a' : '#cc2936'
  const toggleTypeFilter = (type) => setTargetFilters(p => ({ ...p, types: p.types.includes(type) ? p.types.filter(t => t !== type) : [...p.types, type] }))
  const formatTimeShort = (d) => d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--'
  const kelvinToFahrenheit = (k) => Math.round((k - 273.15) * 9/5 + 32)

  const toggleActiveSetup = (setupId) => {
    setActiveSetups(prev => prev.includes(setupId) ? prev.filter(id => id !== setupId) : [...prev, setupId])
  }

  const FORECAST_CACHE_TTL = 3 * 60 * 60 * 1000 // 3 hours
  const MOON_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

  const cacheKey = (prefix, lat, lng, extra) => {
    const key = `${prefix}_${parseFloat(lat).toFixed(2)}_${parseFloat(lng).toFixed(2)}${extra ? '_' + extra : ''}`
    return key
  }

  const getCachedForecast = (lat, lng) => {
    try {
      const key = cacheKey('forecast', lat, lng)
      const cached = localStorage.getItem(key)
      if (!cached) return null
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp > FORECAST_CACHE_TTL) { localStorage.removeItem(key); return null }
      return data
    } catch { return null }
  }

  const setCachedForecast = (lat, lng, data) => {
    try {
      const key = cacheKey('forecast', lat, lng)
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
    } catch { /* quota exceeded */ }
  }

  const getCachedMoon = (lat, lng, dateStr) => {
    try {
      const key = cacheKey('moon', lat, lng, dateStr)
      const cached = localStorage.getItem(key)
      if (!cached) return null
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp > MOON_CACHE_TTL) { localStorage.removeItem(key); return null }
      return data
    } catch { return null }
  }

  const setCachedMoon = (lat, lng, dateStr, data) => {
    try {
      const key = cacheKey('moon', lat, lng, dateStr)
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
    } catch { /* quota exceeded */ }
  }

  const fetchForecastData = async (latitude, longitude) => {
    setFetchError(null)
    const cached = getCachedForecast(latitude, longitude)
    if (cached) {
      setAstropheric(cached)
    } else {
      try {
        const astrophericResponse = await fetch(`/api/astropheric?lat=${latitude}&lon=${longitude}`)
        if (astrophericResponse.ok) {
          const astroData = await astrophericResponse.json()
          setAstropheric(astroData.data)
          setCachedForecast(latitude, longitude, astroData.data)
        } else {
          setFetchError('Forecast unavailable \u2014 check your API key or try again.')
        }
      } catch {
        setFetchError('Forecast unavailable \u2014 check your API key or try again.')
      }
    }
  }

  const fetchMoonData = async (latitude, longitude) => {
    const dateStr = new Date().toISOString().split('T')[0]
    const cached = getCachedMoon(latitude, longitude, dateStr)
    if (cached) {
      setMoon(cached)
    } else {
      const moonResponse = await fetch(`/api/moon?lat=${latitude}&lon=${longitude}`)
      const moonData = await moonResponse.json()
      setMoon(moonData)
      setCachedMoon(latitude, longitude, dateStr, moonData)
    }
  }

  const fetchWeather = async () => {
    if (!zipCode) return
    setLoading(true)
    try {
      const locationResponse = await fetch('/api/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: zipCode }) })
      if (!locationResponse.ok) {
        alert('Location not found.')
        setLoading(false)
        return
      }
      const locationData = await locationResponse.json()
      const { latitude, longitude, locationName } = locationData
      setCoords({ latitude, longitude, locationName })
      setSelectedDay(0)

      await fetchForecastData(latitude, longitude)

      const weatherResponse = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
      const weatherData = await weatherResponse.json()
      setWeather({ temperature: weatherData.current.temperature_2m, humidity: weatherData.current.relative_humidity_2m, cloudCover: weatherData.current.cloud_cover, windSpeed: weatherData.current.wind_speed_10m, windDirection: weatherData.current.wind_direction_10m })

      await fetchMoonData(latitude, longitude)
    } catch (error) {
      alert('Error fetching data: ' + error.message)
    }
    setLoading(false)
  }

  const loadSavedLocation = async (location) => {
    setLoading(true)
    try {
      setCoords({ latitude: location.latitude, longitude: location.longitude, locationName: location.name })
      setSelectedDay(0)

      await fetchForecastData(location.latitude, location.longitude)

      const weatherResponse = await fetch(`/api/weather?lat=${location.latitude}&lon=${location.longitude}`)
      const weatherData = await weatherResponse.json()
      setWeather({ temperature: weatherData.current.temperature_2m, humidity: weatherData.current.relative_humidity_2m, cloudCover: weatherData.current.cloud_cover, windSpeed: weatherData.current.wind_speed_10m, windDirection: weatherData.current.wind_direction_10m })

      await fetchMoonData(location.latitude, location.longitude)
    } catch (error) {
      alert('Error fetching data: ' + error.message)
    }
    setLoading(false)
  }

  const saveCurrentLocation = async () => {
    if (!coords || !locationName.trim()) { alert('Please enter a name'); return }

    try {
      // Save to API
      const newLocation = await post('/api/locations', {
        name: locationName.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude
      })

      const updated = [...savedLocations, {
        id: newLocation.id,
        name: newLocation.name,
        latitude: parseFloat(newLocation.latitude),
        longitude: parseFloat(newLocation.longitude)
      }]
      setSavedLocations(updated)
      localStorage.setItem('astroLocations', JSON.stringify(updated))
    } catch (error) {
      // Fall back to localStorage only
      const newLocation = { id: Date.now(), name: locationName.trim(), latitude: coords.latitude, longitude: coords.longitude }
      const updated = [...savedLocations, newLocation]
      setSavedLocations(updated)
      localStorage.setItem('astroLocations', JSON.stringify(updated))
    }

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

  // Plan handlers
  const handleSavePlan = async (planData) => {
    const newPlan = await post('/api/plans', planData)
    setSavedPlans(prev => [newPlan, ...prev])
  }

  const handleViewPlan = (plan) => {
    alert(`Plan: ${plan.name}\nDate: ${plan.planDate}\nLocation: ${plan.locationName || 'Unknown'}\nTargets: ${plan.targets?.length || 0}`)
  }

  const handleClonePlan = async (plan) => {
    try {
      const cloned = await post(`/api/plans/${plan.id}/clone`, {
        name: `${plan.name} (Clone)`,
        planDate: new Date().toISOString().split('T')[0]
      })
      setSavedPlans(prev => [cloned, ...prev])

      if (plan.latitude && plan.longitude) {
        setMainTab('tonight')
        loadSavedLocation({
          name: plan.locationName || 'Loaded Location',
          latitude: parseFloat(plan.latitude),
          longitude: parseFloat(plan.longitude)
        })
      }

      alert('Plan cloned! Switch to Tonight tab to start planning.')
    } catch (error) {
      alert('Failed to clone plan: ' + error.message)
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!confirm('Delete this plan?')) return
    try {
      await del(`/api/plans/${planId}`)
      setSavedPlans(prev => prev.filter(p => p.id !== planId))
    } catch (error) {
      alert('Failed to delete plan: ' + error.message)
    }
  }

  // Journal handlers
  const handleCreateJournalEntry = async (entryData) => {
    const newEntry = await post('/api/journal', entryData)
    setJournalEntries(prev => [newEntry, ...prev])
    const tags = await get('/api/tags')
    setJournalTags(tags)
    return newEntry
  }

  const handleUpdateJournalEntry = async (entryId, entryData) => {
    const updated = await put(`/api/journal/${entryId}`, entryData)
    setJournalEntries(prev => prev.map(e => e.id === entryId ? updated : e))
    const tags = await get('/api/tags')
    setJournalTags(tags)
    return updated
  }

  const handleDeleteJournalEntry = async (entryId) => {
    await del(`/api/journal/${entryId}`)
    setJournalEntries(prev => prev.filter(e => e.id !== entryId))
  }

  const handleCreateTag = async (tagData) => {
    const newTag = await post('/api/tags', tagData)
    setJournalTags(prev => [...prev, newTag])
    return newTag
  }

  const handleDeleteTag = async (tagId) => {
    await del(`/api/tags/${tagId}`)
    setJournalTags(prev => prev.filter(t => t.id !== tagId))
  }

  const currentDewDelta = astropheric ? getDewRisk(astropheric.RDPS_Temperature[0].Value.ActualValue, astropheric.RDPS_DewPoint[0].Value.ActualValue) : null
  // Note: currentDewDelta kept for backward compat; selectedConditions.dewDelta used in conditions card

  const forecastDays = buildForecastDays(astropheric, kelvinToFahrenheit)

  // Get averaged conditions for the selected day's imaging window
  const getSelectedDayConditions = () => {
    const day = forecastDays[selectedDay]
    if (!day || !day.inRange || day.hours.length === 0) return null
    const hrs = day.hours
    const avg = (arr, key) => {
      const valid = hrs.filter(h => h[key] != null)
      if (valid.length === 0) return 0
      return valid.reduce((s, h) => s + h[key], 0) / valid.length
    }
    return {
      seeing: avg(hrs, 'seeing'),
      clouds: avg(hrs, 'clouds'),
      transparency: avg(hrs, 'transparency'),
      windMs: avg(hrs, 'windMs'),
      dewDeltaC: avg(hrs, 'dewDeltaC'),
    }
  }

  const selectedConditions = getSelectedDayConditions()

  return (
    <div className="app">
      <SignedOut>
        <div className="auth-container">
          <div className="auth-content">
            <h1 className="auth-logo">Obs<span>cura</span></h1>
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
        {/* Top Nav Bar */}
        <nav className="top-nav">
          <div className="nav-left">
            <Link to="/" className="nav-hub-link">&larr; Hub</Link>
            <svg className="nav-logo-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            </svg>
            <span className="nav-wordmark">Obs<span className="nav-accent">cura</span></span>
          </div>
          <div className="nav-center">
            <button className={`nav-pill ${mainTab === 'tonight' ? 'active' : ''}`} onClick={() => { setMainTab('tonight'); setActiveTab('weather') }}>Tonight</button>
            <button className={`nav-pill ${mainTab === 'plans' ? 'active' : ''}`} onClick={() => { setMainTab('plans'); loadPlans() }}>Plans</button>
            <button className={`nav-pill ${mainTab === 'journal' ? 'active' : ''}`} onClick={() => { setMainTab('journal'); loadJournal() }}>Journal</button>
            <button className={`nav-pill ${mainTab === 'targets' ? 'active' : ''}`} onClick={() => setMainTab('targets')}>
              Targets {targets.length > 0 && <span className="pill-badge">{targets.length}</span>}
            </button>
          </div>
          <div className="nav-right">
            <div className="nav-avatar">{user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}</div>
            <UserButton />
          </div>
        </nav>

        <div className="content">
          {/* Plans Tab */}
          {mainTab === 'plans' && (
            <PlansHistory
              plans={savedPlans}
              loading={plansLoading}
              onViewPlan={handleViewPlan}
              onClonePlan={handleClonePlan}
              onDeletePlan={handleDeletePlan}
              onRefresh={loadPlans}
            />
          )}

          {/* Journal Tab */}
          {mainTab === 'journal' && (
            <Journal
              entries={journalEntries}
              tags={journalTags}
              loading={journalLoading}
              onCreateEntry={handleCreateJournalEntry}
              onUpdateEntry={handleUpdateJournalEntry}
              onDeleteEntry={handleDeleteJournalEntry}
              onCreateTag={handleCreateTag}
              onDeleteTag={handleDeleteTag}
              onRefresh={loadJournal}
            />
          )}

          {/* Targets Tab (API-backed) */}
          {mainTab === 'targets' && (
            <div className="tab-content">
              <Targets
                coords={coords}
                moon={moon}
                selectedTargets={selectedTargets}
                onSelectTarget={(targetData) => {
                  if (selectedTargets.some(t => t.id === targetData.id)) {
                    setSelectedTargets(prev => prev.filter(t => t.id !== targetData.id))
                  } else {
                    setSelectedTargets(prev => [...prev, { ...targetData, priority: prev.length + 1 }])
                  }
                }}
              />
            </div>
          )}

          {/* Tonight Tab */}
          {mainTab === 'tonight' && (
            <>
              {/* Forecast Strip */}
              {astropheric && activeTab === 'weather' && (
                <div className="forecast-strip">
                  <div className="forecast-strip-header">
                    <span className="forecast-strip-label">81-HR FORECAST</span>
                    {coords && <span className="forecast-strip-location">{coords.locationName}</span>}
                  </div>
                  <div className="forecast-strip-days">
                    {forecastDays.map((day, i) => {
                      const isToday = day.date.toDateString() === new Date().toDateString()
                      const scoreClass = day.inRange ? (day.score >= 60 ? 'score-good' : day.score >= 30 ? 'score-mid' : 'score-bad') : 'score-none'
                      return (
                        <div key={i} className={`forecast-day ${scoreClass} ${selectedDay === i && day.inRange ? 'selected' : ''} ${!day.inRange ? 'out-of-range' : ''}`} onClick={day.inRange ? () => setSelectedDay(i) : undefined}>
                          <span className={`forecast-day-label ${isToday ? 'today' : ''}`}>{day.date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</span>
                          <span className="forecast-day-date">{day.date.getDate()}</span>
                          <span className="forecast-day-score">{day.inRange ? day.score : '\u2014'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Location search */}
              {activeTab === 'weather' && (
                <>
                  <div className="input-section">
                    <div className="location-input">
                      <label>ZIP Code or Coordinates</label>
                      <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="e.g., 78701 or 30.2672, -97.7431" onKeyPress={(e) => e.key === 'Enter' && fetchWeather()} />
                    </div>
                    <div className="action-buttons">
                      <button className="primary-button" onClick={fetchWeather} disabled={loading}>{loading ? 'Loading...' : 'Get Forecast'}</button>
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
                </>
              )}

              {/* Dashboard: Location + Conditions cards */}
              {coords && weather && activeTab === 'weather' && (
                <>
                  <div className="dashboard-grid">
                    {/* Location Card */}
                    <div className="dash-card">
                      <div className="dash-card-header">
                        <span className="dash-card-title">LOCATION</span>
                        <button className="dash-add-link" onClick={() => setShowSaveDialog(true)}>+ Add</button>
                      </div>
                      {savedLocations.length > 0 ? (
                        <div className="location-list">
                          {savedLocations.map(loc => {
                            const isActive = coords?.locationName === loc.name
                            return (
                              <div key={loc.id} className={`location-item ${isActive ? 'active' : ''}`} onClick={() => loadSavedLocation(loc)}>
                                <div className={`location-dot ${isActive ? 'active' : ''}`}></div>
                                <div className="location-item-info">
                                  <span className="location-item-name">{loc.name}</span>
                                  <span className="location-item-coords">{loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°</span>
                                </div>
                                <button className="delete-button" onClick={(e) => { e.stopPropagation(); deleteLocation(loc.id) }} title="Delete">&times;</button>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="empty-hint">
                          <p>{coords.locationName}</p>
                          <p className="hint-sub">{coords.latitude.toFixed(4)}°, {coords.longitude.toFixed(4)}°</p>
                        </div>
                      )}
                    </div>

                    {/* Conditions Card */}
                    <div className="dash-card">
                      <div className="dash-card-header">
                        <span className="dash-card-title">{selectedDay === 0 ? 'TONIGHT\u2019S CONDITIONS' : `${forecastDays[selectedDay]?.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()} NIGHT`}</span>
                      </div>
                      {fetchError ? (
                        <div className="empty-hint"><p style={{color: 'var(--text-muted)'}}>{fetchError}</p></div>
                      ) : !astropheric || loading ? (
                        <div className="conditions-tiles">
                          {['SEEING','TRANSPARENCY','CLOUD COVER','WIND','MOON','DEW RISK'].map(label => (
                            <div key={label} className="condition-tile condition-tile--skeleton">
                              <span className="tile-label">{label}</span>
                              <span className="tile-value skeleton-block">&nbsp;</span>
                              <span className="tile-sub skeleton-block">&nbsp;</span>
                              <div className="tile-bar"><div className="tile-bar-fill" style={{width: '0%'}}></div></div>
                            </div>
                          ))}
                        </div>
                      ) : selectedConditions ? (() => {
                        const s = seeingMetric(selectedConditions.seeing)
                        const t = transparencyMetric(selectedConditions.transparency)
                        const c = cloudMetric(selectedConditions.clouds)
                        const w = windMetric(selectedConditions.windMs)
                        const m = moon ? moonMetric(moon.illumination, moon.phase) : null
                        const d = dewMetric(selectedConditions.dewDeltaC)
                        return (
                      <div className="conditions-tiles">
                        <div className="condition-tile">
                          <span className="tile-label">SEEING</span>
                          <span className="tile-value" style={{color: s.color}}>{s.display}</span>
                          <span className="tile-sub">{s.sub}</span>
                          <div className="tile-bar"><div className="tile-bar-fill" style={{width: `${s.barPct}%`, background: s.color}}></div></div>
                        </div>
                        <div className="condition-tile">
                          <span className="tile-label">TRANSPARENCY</span>
                          <span className="tile-value" style={{color: t.color}}>{t.display}</span>
                          <span className="tile-sub">{t.sub}</span>
                          <div className="tile-bar"><div className="tile-bar-fill" style={{width: `${t.barPct}%`, background: t.color}}></div></div>
                        </div>
                        <div className="condition-tile">
                          <span className="tile-label">CLOUD COVER</span>
                          <span className="tile-value" style={{color: c.color}}>{c.display}</span>
                          <span className="tile-sub">{c.sub}</span>
                          <div className="tile-bar"><div className="tile-bar-fill" style={{width: `${c.barPct}%`, background: c.color}}></div></div>
                        </div>
                        <div className="condition-tile">
                          <span className="tile-label">WIND</span>
                          <span className="tile-value" style={{color: w.color}}>{w.display}</span>
                          <span className="tile-sub">{w.sub}</span>
                          <div className="tile-bar"><div className="tile-bar-fill" style={{width: `${w.barPct}%`, background: w.color}}></div></div>
                        </div>
                        <div className="condition-tile">
                          <span className="tile-label">MOON</span>
                          {m ? (
                            <>
                              <span className="tile-value" style={{color: m.color}}>{m.display}</span>
                              <span className="tile-sub">{m.sub}</span>
                              <div className="tile-bar"><div className="tile-bar-fill" style={{width: `${m.barPct}%`, background: m.color}}></div></div>
                            </>
                          ) : (
                            <>
                              <span className="tile-value" style={{color: 'var(--text-muted)'}}>--</span>
                              <span className="tile-sub">Loading...</span>
                              <div className="tile-bar"><div className="tile-bar-fill" style={{width: '0%'}}></div></div>
                            </>
                          )}
                        </div>
                        <div className="condition-tile">
                          <span className="tile-label">DEW RISK</span>
                          <span className="tile-value" style={{color: d.color}}>{d.display}</span>
                          <span className="tile-sub">{d.sub}</span>
                          <div className="tile-bar"><div className="tile-bar-fill" style={{width: `${d.barPct}%`, background: d.color}}></div></div>
                        </div>
                      </div>
                        )
                      })() : (
                      <div className="empty-hint"><p>No imaging window data available for this night.</p></div>
                      )}
                    </div>
                  </div>

                  {/* CTA Row */}
                  <div className="cta-row">
                    <button className="cta-primary" onClick={() => setActiveTab('plan')}>Plan Tonight&apos;s Session &rarr;</button>
                    <button className="cta-secondary" onClick={() => setActiveTab('forecast')}>View Full Forecast</button>
                  </div>

                  {/* Gear toggle */}
                  <button className="gear-button-wide" onClick={() => setActiveTab('gear')}>Gear Manager</button>
                </>
              )}

              {/* Saved locations (before data loads) */}
              {!coords && savedLocations.length > 0 && activeTab === 'weather' && (
                <div className="saved-locations">
                  <h3>Saved Locations</h3>
                  <div className="location-buttons">
                    {savedLocations.map(loc => (
                      <div key={loc.id} className="location-card">
                        <button className="location-button" onClick={() => loadSavedLocation(loc)} disabled={loading}>
                          <span className="location-name">{loc.name}</span>
                          <span className="location-coords">{loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°</span>
                        </button>
                        <button className="delete-button" onClick={(e) => { e.stopPropagation(); deleteLocation(loc.id) }} title="Delete">&times;</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-view: back button */}
              {['plan', 'log', 'forecast', 'gear'].includes(activeTab) && (
                <button className="back-link" onClick={() => setActiveTab('weather')}>&larr; Back to Dashboard</button>
              )}

              {/* Full Forecast Table */}
              {activeTab === 'forecast' && coords && weather && moon && astropheric && (
                <div className="tab-content">
                  <div className="forecast-table-section">
                    <h3>81-Hour Forecast</h3>
                    <div className={`table-container-wrapper ${isScrolledRight ? 'scrolled-right' : ''}`}>
                      <div className="table-container" ref={tableContainerRef} onScroll={handleTableScroll}>
                        <table>
                          <thead><tr><th>Hour</th><th>Clouds</th><th>Seeing</th><th>Transp</th><th>Temp</th><th>Dew</th><th>&Delta;Dew</th><th>Wind</th></tr></thead>
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
                                  <td style={{color: getSeeingColor(seeing)}}>{seeing}/5</td>
                                  <td style={{color: getTransparencyColor(transparency)}}>{transparency}</td>
                                  <td>{temp}°F</td>
                                  <td>{dewPoint}°F</td>
                                  <td style={{color: getDewRiskColor(dewDelta)}}>&Delta;{dewDelta}°</td>
                                  <td style={{color: getWindColor(windSpeed)}}>{windSpeed} mph {getWindDirection(windDir)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <span className="scroll-hint">Swipe left to see more columns</span>
                  </div>
                </div>
              )}

              {/* Plan sub-view */}
              {activeTab === 'plan' && coords && weather && moon && astropheric && (
                <div className="tab-content">
                  <div className="plan-section">
                    <div className="plan-header">
                      <h3>Tonight&apos;s Plan</h3>
                      <div className="plan-header-actions">
                        {selectedTargets.length > 0 && (
                          <>
                            <button className="save-plan-button" onClick={() => setShowSavePlanModal(true)}>Save Plan</button>
                            <button className="clear-plan-button" onClick={clearAllSelected}>Clear All</button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="active-setups-section">
                      <label>Active Gear Tonight:</label>
                      <div className="setup-toggles">
                        {IMAGING_SETUPS.map(setup => (
                          <button key={setup.id} className={`setup-toggle ${activeSetups.includes(setup.id) ? 'active' : ''}`} onClick={() => toggleActiveSetup(setup.id)}>{setup.name}</button>
                        ))}
                      </div>
                      {activeSetups.length === 0 && <p className="setup-hint">Select the gear you&apos;re using tonight to group targets by setup</p>}
                    </div>

                    {selectedTargets.length === 0 ? (
                      <div className="empty-plan"><p>No targets selected.</p><p>Go to <strong>Targets</strong> tab and click targets to add them.</p></div>
                    ) : (
                      <>
                        <div className="plan-summary"><p>{selectedTargets.length} target{selectedTargets.length !== 1 ? 's' : ''} selected</p></div>
                        {Object.values(getGroupedPlan()).map(group => (
                          <div key={group.setupId} className="plan-group">
                            <div className="plan-group-header">
                              <span className="plan-group-name">{group.setupName}</span>
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
                                    {item.assignedSetup && <div className="plan-item-setup">{item.assignedSetup.fovFit.rating} &bull; {item.assignedSetup.fovFit.fillPercent.toFixed(0)}% FOV fill</div>}
                                  </div>
                                  <button className="remove-item-button" onClick={() => removeSelectedTarget(item.id)} title="Remove">&times;</button>
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

              {/* Log sub-view */}
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

              {/* Gear sub-view */}
              {activeTab === 'gear' && (
                <div className="tab-content">
                  <GearEditor customGear={customGear} setCustomGear={setCustomGear} />
                </div>
              )}
            </>
          )}
        </div>

        {showSavePlanModal && (
          <SavePlanModal
            coords={coords}
            moon={moon}
            astropheric={astropheric}
            selectedTargets={selectedTargets}
            onSave={handleSavePlan}
            onClose={() => setShowSavePlanModal(false)}
          />
        )}
      </SignedIn>
    </div>
  )
}

export default App
