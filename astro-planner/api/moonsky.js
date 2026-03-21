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

    const apiKey = process.env.ASTROPHERIC_API_KEY

    if (!apiKey) {
      return res.status(500).json({ error: 'Astropheric API key not configured' })
    }

    const apiEndpoint = 'https://astrosphericpublicaccess.azurewebsites.net/api/GetSky_V1'

    const requestData = {
      Latitude: latitude,
      Longitude: longitude,
      APIKey: apiKey
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GetSky_V1 API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    res.json({
      source: 'astropheric-sky',
      data: data
    })

  } catch (error) {
    console.error('GetSky_V1 error:', error)
    res.status(500).json({
      error: 'Failed to fetch sky data',
      details: error.message
    })
  }
}
