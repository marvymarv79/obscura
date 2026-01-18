export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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

    // Otherwise, geocode it using Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(input)}&country=US&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'Obscura/1.0'
        }
      }
    )

    const data = await response.json()

    if (data.length === 0) {
      return res.status(404).json({ error: 'Location not found' })
    }

    res.json({
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      locationName: data[0].display_name
    })

  } catch (error) {
    console.error('Location error:', error)
    res.status(500).json({ error: 'Failed to fetch location data' })
  }
}
