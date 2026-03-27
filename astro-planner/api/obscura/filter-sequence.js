/**
 * POST /api/obscura/filter-sequence
 *
 * Uses Claude to generate an intelligent filter sequence
 * based on moon data, transit timing, forecast conditions, target type,
 * and atmospheric ordering rules.
 *
 * Also returns calibration frame recommendations.
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

    // Count distinct filters to estimate calibration time
    const filters = imagingTrain.filters || ['Ha', 'OIII', 'SII']
    const filterCount = filters.length
    const calibrationMinutes = Math.ceil(filterCount * 2.5) + 10

    // Trim imaging window end by calibration time so LLM only schedules
    // light frames in the available window (calibration happens after)
    const trimmedWindow = {
      ...imagingWindow,
      end: trimEndTime(imagingWindow.end, calibrationMinutes),
      durationMinutes: Math.max(0, (imagingWindow.durationMinutes || 0) - calibrationMinutes)
    }

    if (trimmedWindow.durationMinutes <= 0) {
      return res.status(400).json({ error: 'Imaging window too short after calibration time reservation', fallback: true })
    }

    const prompt = buildPrompt({ target, imagingWindow: trimmedWindow, transitTime, moonData, forecastSlice, imagingTrain, utcOffsetMinutes, calibrationMinutes, originalEnd: imagingWindow.end })

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
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
      sessionRationale: parsed.sessionRationale || '',
      calibrationFrames: parsed.calibrationFrames || null,
      calibrationWindowMinutes: calibrationMinutes
    })
  } catch (err) {
    console.error('[filter-sequence] Unexpected error:', err)
    return res.status(500).json({ error: err.message, fallback: true })
  }
}

/**
 * Trim an ISO timestamp or time string by N minutes.
 * Handles both ISO 8601 ("2025-08-15T10:30:00Z") and HH:MM format.
 */
function trimEndTime(endTime, minutes) {
  if (!endTime) return endTime
  try {
    const d = new Date(endTime)
    if (!isNaN(d.getTime())) {
      d.setMinutes(d.getMinutes() - minutes)
      return d.toISOString()
    }
  } catch {
    // not a parseable date
  }
  // If it's just "HH:MM" format, do simple math
  if (typeof endTime === 'string' && /^\d{2}:\d{2}$/.test(endTime)) {
    const [h, m] = endTime.split(':').map(Number)
    const totalMin = h * 60 + m - minutes
    const newH = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60)
    const newM = ((totalMin % 1440) + 1440) % 60
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
  }
  return endTime
}

function buildPrompt({ target, imagingWindow, transitTime, moonData, forecastSlice, imagingTrain, utcOffsetMinutes, calibrationMinutes, originalEnd }) {
  const offsetHours = (utcOffsetMinutes || 0) / 60
  const offsetStr = offsetHours >= 0 ? `UTC+${offsetHours}` : `UTC${offsetHours}`
  const filters = imagingTrain.filters || ['Ha', 'OIII', 'SII']
  const cameraModel = imagingTrain.cameraModel || imagingTrain.camera || 'unknown'
  const gain = imagingTrain.gain ?? 'unknown'

  return `You are an expert astrophotography session planner. Generate a filter sequence for tonight's imaging session.

Return ONLY valid JSON matching this exact schema — no markdown fences, no preamble, no explanation outside the JSON:
{
  "filterSequence": [
    {
      "filter": "${filters.join('"|"')}",
      "start": "HH:MM",
      "end": "HH:MM",
      "subs": <number>,
      "subLength": <seconds>,
      "totalMinutes": <number>,
      "rationale": "<one sentence>"
    }
  ],
  "strategy": "<plain-English explanation of the ordering rationale>",
  "sessionRationale": "<2-3 sentence session summary>",
  "calibrationFrames": {
    "estimatedMinutes": ${calibrationMinutes},
    "note": "Complete before teardown",
    "flats": [
      { "filter": "<filter>", "count": <number>, "notes": "<guidance>" }
    ],
    "darkFlats": [
      { "filter": "<filter>", "count": <number>, "notes": "<guidance>" }
    ],
    "recommendedOrder": "<plain-English order guidance>"
  }
}

All start/end times must be in local time (${offsetStr}, offset ${utcOffsetMinutes} minutes from UTC).

SESSION DATA:
- Target: ${target.name || target.ngcId}${target.commonName ? ` (${target.commonName})` : ''}, type: ${target.type}
- Imaging window for LIGHT FRAMES ONLY: ${imagingWindow.start} to ${imagingWindow.end} (${imagingWindow.durationMinutes} minutes)
- Original window end (before calibration reservation): ${originalEnd}
- Calibration time reserved: ${calibrationMinutes} minutes after light frames end
- Transit time: ${transitTime}
- Moon: ${moonData?.illumination ?? 'unknown'}% illumination, ${moonData?.separation ?? 'unknown'}° separation${moonData?.setTime ? `, sets at ${moonData.setTime}` : ''}
- Available filters: ${filters.join(', ')}
- Camera: ${cameraModel}
- Gain: ${gain}
- Pixel scale: ${imagingTrain.pixelScale || 'unknown'} arcsec/px
- Focal ratio: f/${imagingTrain.focalRatio || 'unknown'}
${forecastSlice?.length ? `- Forecast: ${JSON.stringify(forecastSlice.slice(0, 6))}` : ''}

ATMOSPHERIC FILTER ORDERING RULES — follow these strictly:
1. Luminance (L) and Red (R): Schedule during the DARKEST part of the window, centered on or before transit. Red is the MOST vulnerable to sky glow — NEVER schedule Red near dawn.
2. Green (G): Schedule mid-session.
3. Blue (B), Ha, OIII, SII: Schedule toward END of session as astronomical twilight approaches. Narrowband filters cut through sky glow effectively. Blue wavelengths are the last to be drowned out as dawn brightens.
4. If dawn is approaching at session end, the last filter blocks should be narrowband (Ha/OIII/SII) or Blue — never Red or Luminance.
5. The "strategy" field must include a plain-English explanation of WHY filters were ordered this way, referencing atmospheric conditions.

ADDITIONAL PLANNING RULES:
6. Moon set time: If moon sets mid-session, schedule OIII and SII in the dark half (after moonset). These filters are more affected by moonlight than Ha.
7. Target emission type: Ha-dominant targets (Rosette, California, Heart, North America) get more Ha time. OIII-bright targets (Veil, Bubble, Crescent) get more OIII time. SII is almost always the faintest emission — give it more time than an equal split would.
8. Transit timing: Anchor the most critical filter near meridian for best seeing.
9. Focal ratio: f/10+ is extra sensitive to poor seeing. Weight the resolution-critical filter at transit more heavily.
10. Blocking vs interleaving: Default to "block" (one filter at a time). Only suggest "interleave" if session > 4h AND seeing is stable throughout the forecast.
11. Wind/seeing trend: If seeing degrades in later forecast slots, front-load the resolution-critical filter.
12. Sub lengths should be 300-600s for narrowband. Each block must have at least 1 sub.
13. The filter blocks must cover the entire imaging window (${imagingWindow.start} to ${imagingWindow.end}) with no gaps.

CALIBRATION FRAME RULES:
14. For flats: Recommend 20-50 flats per filter. Lower gain → more flats needed (higher read noise contribution). Higher gain → fewer flats needed. Use the camera model and gain to calibrate.
15. For dark flats: Same count as flats, same gain and temperature. Cap on, same exposure as flats.
16. Recommended order: Flats first (all filters, flat panel), then dark flats (all filters, cap on).
17. Include every filter used in the light frame sequence in both flats and darkFlats arrays.`
}
