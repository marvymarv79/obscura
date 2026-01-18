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
    const { lat, lon } = req.query

    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,cloud_cover,wind_speed_10m,wind_direction_10m',
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
      timezone: 'auto',
      forecast_days: '2'
    })

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`
    )

    const data = await response.json()
    res.json(data)

  } catch (error) {
    console.error('Weather error:', error)
    res.status(500).json({ error: 'Failed to fetch weather data' })
  }
}
