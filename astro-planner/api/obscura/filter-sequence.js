/**
 * POST /api/obscura/filter-sequence
 *
 * Uses Claude to generate an intelligent narrowband filter sequence
 * based on moon data, transit timing, forecast conditions, and target type.
 *
 * Narrowband only (Ha/OIII/SII). Broadband LRGB stays local in targetEngine.js.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[filter-sequence] ANTHROPIC_API_KEY not set')
    return res.status(500).json({ error: 'Server configuration error', fallback: true })
  }

  try {
    const { target, imagingWindow, transitTime, moonData, forecastSlice, imagingTrain, utcOffsetMinutes } = req.body

    if (!target || !imagingWindow || !imagingTrain) {
      return res.status(400).json({ error: 'Missing required fields: target, imagingWindow, imagingTrain', fallback: true })
    }

    const prompt = buildPrompt({ target, imagingWindow, transitTime, moonData, forecastSlice, imagingTrain, utcOffsetMinutes })

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const contentType = anthropicRes.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await anthropicRes.text()
      console.error('[filter-sequence] Non-JSON response from Anthropic:', anthropicRes.status, text.substring(0, 200))
      return res.status(502).json({ error: 'Anthropic returned non-JSON response', fallback: true })
    }

    const anthropicData = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error('[filter-sequence] Anthropic API error:', anthropicData)
      return res.status(502).json({ error: anthropicData.error?.message || 'Anthropic API error', fallback: true })
    }

    // Extract text content from Claude's response
    const textBlock = anthropicData.content?.find(b => b.type === 'text')
    if (!textBlock?.text) {
      console.error('[filter-sequence] No text in Anthropic response')
      return res.status(502).json({ error: 'Empty response from Claude', fallback: true })
    }

    // Strip markdown fences if present
    let jsonStr = textBlock.text.trim()
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch (parseErr) {
      console.error('[filter-sequence] JSON parse error:', parseErr.message, 'Raw:', jsonStr.substring(0, 200))
      return res.status(502).json({ error: 'Invalid JSON from Claude', fallback: true })
    }

    // Validate response shape
    if (!Array.isArray(parsed.filterSequence)) {
      console.error('[filter-sequence] Missing filterSequence array in response')
      return res.status(502).json({ error: 'Invalid response shape from Claude', fallback: true })
    }

    return res.status(200).json({
      filterSequence: parsed.filterSequence,
      strategy: parsed.strategy || 'block',
      sessionRationale: parsed.sessionRationale || ''
    })
  } catch (err) {
    console.error('[filter-sequence] Unexpected error:', err)
    return res.status(500).json({ error: err.message, fallback: true })
  }
}

function buildPrompt({ target, imagingWindow, transitTime, moonData, forecastSlice, imagingTrain, utcOffsetMinutes }) {
  const offsetHours = (utcOffsetMinutes || 0) / 60
  const offsetStr = offsetHours >= 0 ? `UTC+${offsetHours}` : `UTC${offsetHours}`

  return `You are an expert astrophotography session planner. Generate a narrowband filter sequence for tonight's imaging session.

Return ONLY valid JSON matching this exact schema — no markdown fences, no preamble, no explanation outside the JSON:
{
  "filterSequence": [
    {
      "filter": "Ha"|"OIII"|"SII",
      "start": "HH:MM",
      "end": "HH:MM",
      "subs": <number>,
      "subLength": <seconds>,
      "totalMinutes": <number>,
      "rationale": "<one sentence>"
    }
  ],
  "strategy": "block"|"interleave",
  "sessionRationale": "<2-3 sentence summary>"
}

All start/end times must be in local time (${offsetStr}, offset ${utcOffsetMinutes} minutes from UTC).

SESSION DATA:
- Target: ${target.name || target.ngcId}${target.commonName ? ` (${target.commonName})` : ''}, type: ${target.type}
- Imaging window: ${imagingWindow.start} to ${imagingWindow.end} (${imagingWindow.durationMinutes} minutes)
- Transit time: ${transitTime}
- Moon: ${moonData?.illumination ?? 'unknown'}% illumination, ${moonData?.separation ?? 'unknown'}° separation${moonData?.setTime ? `, sets at ${moonData.setTime}` : ''}
- Available filters: ${imagingTrain.filters?.join(', ') || 'Ha, OIII, SII'}
- Pixel scale: ${imagingTrain.pixelScale || 'unknown'} arcsec/px
- Focal ratio: f/${imagingTrain.focalRatio || 'unknown'}
${forecastSlice?.length ? `- Forecast: ${JSON.stringify(forecastSlice.slice(0, 6))}` : ''}

PLANNING RULES — follow all of these:
1. Moon set time: If moon sets mid-session, schedule OIII and SII in the dark half (after moonset). These filters are more affected by moonlight than Ha.
2. Target emission type: Ha-dominant targets (Rosette, California, Heart, North America) get more Ha time. OIII-bright targets (Veil, Bubble, Crescent) get more OIII time. SII is almost always the faintest emission — give it more time than an equal split would.
3. Transit timing: Anchor the most critical filter (usually Ha) near meridian for best seeing.
4. Focal ratio: f/10+ is extra sensitive to poor seeing. Weight Ha at transit more heavily for long focal ratios.
5. Strategy: Default to "block" (one filter at a time). Only suggest "interleave" if session > 4 hours AND seeing is stable throughout the forecast.
6. Wind/seeing trend: If seeing degrades in later forecast slots, front-load the resolution-critical filter (Ha).
7. Sub lengths should be 300-600s for narrowband. Each block must have at least 1 sub.
8. The filter blocks must cover the entire imaging window with no gaps.`
}
