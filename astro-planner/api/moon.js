export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { lat, lon, date } = req.query
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    // Use current date if not provided
    const targetDate = date ? new Date(date) : new Date()

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

    // Try to get moonrise/moonset times
    let moonrise = null
    let moonset = null

    try {
      const dateStr = targetDate.toISOString().split('T')[0]
      const sunMoonResponse = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${dateStr}&formatted=0`
      )
      const sunMoonData = await sunMoonResponse.json()

      if (sunMoonData && sunMoonData.status === 'OK') {
        const sunrise = new Date(sunMoonData.results.sunrise)
        const sunset = new Date(sunMoonData.results.sunset)

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
}
