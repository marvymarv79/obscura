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
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    if (!process.env.ASTROPHERIC_API_KEY) {
      return res.status(500).json({ error: 'Astropheric API key not configured' })
    }

    const apiEndpoint = 'https://astrosphericpublicaccess.azurewebsites.net/api/GetForecastData_V1'

    const requestData = {
      Latitude: latitude,
      Longitude: longitude,
      APIKey: process.env.ASTROPHERIC_API_KEY
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      throw new Error(`Astropheric API returned ${response.status}`)
    }

    const data = await response.json()

    res.json({
      source: 'astropheric',
      data: data
    })

  } catch (error) {
    console.error('Astropheric error:', error)
    res.status(500).json({
      error: 'Failed to fetch Astropheric data',
      details: error.message
    })
  }
}
