const express = require('express')
const cors = require('cors')
const axios = require('axios')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Astro Planner API is running' })
})

// Get coordinates from ZIP code or city name
app.post('/api/location', async (req, res) => {
  try {
    const { input } = req.body
    
    // Check if it's coordinates (contains comma)
    if (input.includes(',')) {
      const [lat, lon] = input.split(',').map(s => parseFloat(s.trim()))
      return res.json({
        latitude: lat,
        longitude: lon,
        locationName: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
      })
    }
    
    // Otherwise, geocode it
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`, {
        params: {
          postalcode: input,
          country: 'US',
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'AstroPlanner/1.0'
        }
      }
    )
    
    if (response.data.length === 0) {
      return res.status(404).json({ error: 'Location not found' })
    }
    
    const data = response.data[0]
    res.json({
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      locationName: data.display_name
    })
    
  } catch (error) {
    console.error('Location error:', error)
    res.status(500).json({ error: 'Failed to fetch location data' })
  }
})

// Get weather data from Open-Meteo (fallback)
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query
    
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast`, {
        params: {
          latitude: lat,
          longitude: lon,
          current: 'temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,wind_direction_10m',
          hourly: 'temperature_2m,cloud_cover,wind_speed_10m,wind_direction_10m',
          temperature_unit: 'fahrenheit',
          wind_speed_unit: 'mph',
          timezone: 'auto',
          forecast_days: 2
        }
      }
    )
    
    res.json(response.data)
    
  } catch (error) {
    console.error('Weather error:', error)
    res.status(500).json({ error: 'Failed to fetch weather data' })
  }
})

// Get Astropheric forecast data using their Data API
app.get('/api/astropheric', async (req, res) => {
  try {
    const { lat, lon } = req.query
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)
    
    console.log(`Astropheric request for: ${latitude}, ${longitude}`)
    
    if (!process.env.ASTROPHERIC_API_KEY) {
      return res.status(500).json({ error: 'Astropheric API key not configured' })
    }
    
    // Use the GetForecastData_V1 API endpoint
    const apiEndpoint = 'https://astrosphericpublicaccess.azurewebsites.net/api/GetForecastData_V1'
    
    const requestData = {
      Latitude: latitude,
      Longitude: longitude,
      APIKey: process.env.ASTROPHERIC_API_KEY
    }
    
    console.log('Sending request to Astropheric API...')
    
    const response = await axios.post(apiEndpoint, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    })
    
    console.log('Astropheric response received successfully')
    console.log('API Credits used today:', response.data.APICreditUsedToday)
    
    res.json({
      source: 'astropheric',
      data: response.data
    })
    
  } catch (error) {
    console.error('Astropheric error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch Astropheric data',
      details: error.response?.data || error.message
    })
  }
})

// Get Bortle scale
app.get('/api/bortle', async (req, res) => {
  try {
    const { lat, lon } = req.query
    
    console.log(`Bortle request for: ${lat}, ${lon}`)
    
    return res.json({
      scale: 5,
      brightness: 'Manual entry recommended',
      estimated: true,
      message: 'Check lightpollutionmap.info or djlorenz ATLAS map for accurate data'
    })
    
  } catch (error) {
    console.error('Bortle error:', error)
    res.status(500).json({ error: 'Failed to fetch Bortle data' })
  }
})

// Get moon data
app.get('/api/moon', async (req, res) => {
  try {
    const { lat, lon, date } = req.query
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)
    
    // Use current date if not provided
    const targetDate = date ? new Date(date) : new Date()
    
    console.log(`Moon data request for: ${latitude}, ${longitude} on ${targetDate.toISOString()}`)
    
    // Calculate moon phase using a simple algorithm
    const lunarMonth = 29.530588853
    const knownNewMoon = new Date('2000-01-06T18:14:00Z')
    const daysSinceNew = (targetDate - knownNewMoon) / (1000 * 60 * 60 * 24)
    const phase = ((daysSinceNew % lunarMonth) / lunarMonth)
    
    // Calculate illumination percentage
    let illumination
    if (phase < 0.5) {
      illumination = phase * 2 * 100
    } else {
      illumination = (2 - phase * 2) * 100
    }
    
    // Determine phase name
    let phaseName
    let emoji
    if (phase < 0.033 || phase > 0.967) {
      phaseName = 'New Moon'
      emoji = '🌑'
    } else if (phase < 0.216) {
      phaseName = 'Waxing Crescent'
      emoji = '🌒'
    } else if (phase < 0.284) {
      phaseName = 'First Quarter'
      emoji = '🌓'
    } else if (phase < 0.466) {
      phaseName = 'Waxing Gibbous'
      emoji = '🌔'
    } else if (phase < 0.534) {
      phaseName = 'Full Moon'
      emoji = '🌕'
    } else if (phase < 0.716) {
      phaseName = 'Waning Gibbous'
      emoji = '🌖'
    } else if (phase < 0.784) {
      phaseName = 'Last Quarter'
      emoji = '🌗'
    } else {
      phaseName = 'Waning Crescent'
      emoji = '🌘'
    }
    
    // Try to get moonrise/moonset
    let moonrise = null
    let moonset = null
    
    try {
      const dateStr = targetDate.toISOString().split('T')[0]
      const sunMoonUrl = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${dateStr}&formatted=0`
      const sunMoonResponse = await axios.get(sunMoonUrl, { timeout: 5000 })
      
      if (sunMoonResponse.data && sunMoonResponse.data.status === 'OK') {
        const sunrise = new Date(sunMoonResponse.data.results.sunrise)
        const sunset = new Date(sunMoonResponse.data.results.sunset)
        
        const phaseOffset = phase * 24
        
        moonrise = new Date(sunrise.getTime() + phaseOffset * 60 * 60 * 1000)
        moonset = new Date(sunset.getTime() + phaseOffset * 60 * 60 * 1000)
      }
    } catch (moonTimeError) {
      console.log('Could not fetch precise moon times:', moonTimeError.message)
    }
    
    res.json({
      phase: phaseName,
      phaseValue: phase,
      illumination: Math.round(illumination),
      emoji: emoji,
      moonrise: moonrise ? moonrise.toISOString() : null,
      moonset: moonset ? moonset.toISOString() : null,
      date: targetDate.toISOString()
    })
    
  } catch (error) {
    console.error('Moon error:', error)
    res.status(500).json({ error: 'Failed to fetch moon data' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
