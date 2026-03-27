import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { planId, messages, userMessage } = req.body

  if (!planId || !userMessage) {
    return res.status(400).json({ error: 'planId and userMessage are required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[mensura/chat] ANTHROPIC_API_KEY not set')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Build system prompt on first message only
    let systemPrompt = null
    const isFirstMessage = !messages || messages.length === 0

    if (isFirstMessage) {
      // Fetch full plan data
      const [plan] = await sql`
        SELECT id, name, plan_date, location_name, latitude, longitude,
               forecast_score, utc_offset_minutes, snapshot, status
        FROM plans
        WHERE id = ${planId} AND user_id = ${userId}
      `
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' })
      }

      const targets = await sql`
        SELECT pt.id, pt.window_start, pt.window_end, pt.snapshot, pt.imaging_train_id,
               t.ngc_ic_id, t.common_name, t.messier_number, t.object_type, t.magnitude
        FROM plan_targets pt
        JOIN targets t ON t.id = pt.target_id
        WHERE pt.plan_id = ${planId}
        ORDER BY pt.position ASC
      `

      const dateStr = new Date(plan.plan_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      })

      const targetDetails = targets.map(t => {
        const snap = t.snapshot || {}
        const name = t.messier_number ? `M${t.messier_number} (${t.ngc_ic_id})` : t.ngc_ic_id
        const common = t.common_name ? ` — ${t.common_name}` : ''
        const type = t.object_type || 'unknown type'

        const window = snap.imagingWindow
          ? `${snap.imagingWindow.start} to ${snap.imagingWindow.end} (${snap.imagingWindow.durationMinutes} min)`
          : (t.window_start && t.window_end ? `${t.window_start} to ${t.window_end}` : 'no window set')

        const score = snap.score != null ? `Tonight's score: ${snap.score}/100` : ''
        const altitude = snap.scoreBreakdown
          ? `Altitude: ${snap.scoreBreakdown.altitude}, Moon: ${snap.scoreBreakdown.moon}, Window: ${snap.scoreBreakdown.window}, FOV: ${snap.scoreBreakdown.fovMatch}`
          : ''

        const filters = snap.filterSequence
          ? snap.filterSequence.map(f => `${f.filter}: ${f.start}-${f.end}, ${f.subs}x${f.subLength}s (${f.totalMinutes}min)`).join('\n    ')
          : 'no filter data'

        const exposure = snap.exposureSummary
          ? `Total integration: ${snap.exposureSummary.totalMinutes}min` +
            (snap.exposureSummary.perFilter ? ` (${snap.exposureSummary.perFilter.map(f => `${f.filter}: ${f.minutes}min`).join(', ')})` : '')
          : ''

        return `- ${name}${common} (${type})
    ${score}${altitude ? '\n    ' + altitude : ''}
    Imaging window: ${window}
    Filter sequence:\n    ${filters}
    ${exposure}`
      }).join('\n\n')

      const planSnap = plan.snapshot || {}
      const conditions = planSnap.conditions || ''
      const sessionNotes = planSnap.sessionNotes || ''

      systemPrompt = `You are an astrophotography planning assistant. The user is planning an imaging session with the following details:

Plan: ${plan.name || 'Unnamed session'}
Date: ${dateStr}
Location: ${plan.location_name}${plan.latitude ? ` (${plan.latitude}, ${plan.longitude})` : ''}
Forecast score: ${plan.forecast_score != null ? plan.forecast_score + '/100' : 'not recorded'}
${plan.utc_offset_minutes != null ? `UTC offset: ${plan.utc_offset_minutes} minutes` : ''}

Targets:
${targetDetails}
${conditions ? `\nSession conditions: ${conditions}` : ''}${sessionNotes ? `\nSession notes: ${sessionNotes}` : ''}

Help them think through their session, answer questions about targets, filters, exposure strategy, sequencing, and conditions. Be concise and practical. Use 24-hour time format.`
    }

    // Build messages array for Anthropic
    const anthropicMessages = []
    if (Array.isArray(messages)) {
      for (const m of messages) {
        anthropicMessages.push({ role: m.role, content: m.content })
      }
    }
    anthropicMessages.push({ role: 'user', content: userMessage })

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: anthropicMessages
    }
    if (systemPrompt) {
      body.system = systemPrompt
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    const contentType = anthropicRes.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await anthropicRes.text()
      console.error('[mensura/chat] Non-JSON response from Anthropic:', anthropicRes.status, text.substring(0, 200))
      return res.status(502).json({ error: 'Anthropic returned non-JSON response' })
    }

    const anthropicData = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error('[mensura/chat] Anthropic API error:', anthropicData)
      return res.status(502).json({ error: anthropicData.error?.message || 'Anthropic API error' })
    }

    const textBlock = anthropicData.content?.find(b => b.type === 'text')
    if (!textBlock?.text) {
      console.error('[mensura/chat] No text in Anthropic response')
      return res.status(502).json({ error: 'Empty response from LLM' })
    }

    return res.status(200).json({ reply: textBlock.text.trim() })
  } catch (error) {
    console.error('[mensura/chat] Error:', error)
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
