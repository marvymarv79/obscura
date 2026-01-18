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

    // Debug: log key length and first/last chars (not the full key for security)
    console.log(`API Key present: yes, length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)}..., ends with: ...${apiKey.substring(apiKey.length - 4)}`)
    console.log(`Coordinates: ${latitude}, ${longitude}`)

    const apiEndpoint = 'https://astrosphericpublicaccess.azurewebsites.net/api/GetForecastData_V1'

    const requestData = {
      Latitude: latitude,
      Longitude: longitude,
      APIKey: apiKey
    }

    console.log('Sending request to Astrospheric...')

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    console.log(`Astrospheric response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Astrospheric error response: ${errorText}`)
      throw new Error(`Astropheric API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('Astrospheric data received successfully')

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
