import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { planId, userNotes } = req.body

  if (!planId) {
    return res.status(400).json({ error: 'planId is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[draft-journal] ANTHROPIC_API_KEY not set')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Fetch plan with ownership check
    const [plan] = await sql`
      SELECT id, name, plan_date, location_name, latitude, longitude,
             forecast_score, snapshot, status
      FROM plans
      WHERE id = ${planId} AND user_id = ${userId}
    `
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Fetch plan targets with target details
    const targets = await sql`
      SELECT pt.id, pt.window_start, pt.window_end, pt.snapshot,
             t.ngc_ic_id, t.common_name, t.messier_number, t.object_type,
             t.magnitude
      FROM plan_targets pt
      JOIN targets t ON t.id = pt.target_id
      WHERE pt.plan_id = ${planId}
      ORDER BY pt.position ASC
    `

    // Build context for the LLM
    const targetSummaries = targets.map(t => {
      const snap = t.snapshot || {}
      const name = t.messier_number ? `M${t.messier_number} (${t.ngc_ic_id})` : t.ngc_ic_id
      const common = t.common_name ? ` — ${t.common_name}` : ''
      const type = t.object_type || 'unknown type'
      const window = snap.imagingWindow
        ? `${snap.imagingWindow.start} to ${snap.imagingWindow.end} (${snap.imagingWindow.durationMinutes}min)`
        : (t.window_start && t.window_end ? `${t.window_start} to ${t.window_end}` : 'no window set')

      const filters = snap.filterSequence
        ? snap.filterSequence.map(f => `${f.filter}: ${f.subs}x${f.subLength}s (${f.totalMinutes}min)`).join(', ')
        : 'no filter data'

      const exposure = snap.exposureSummary
        ? `${snap.exposureSummary.totalMinutes}min total integration`
        : ''

      return `- ${name}${common} (${type}): window ${window}; filters: ${filters}${exposure ? '; ' + exposure : ''}`
    }).join('\n')

    const planSnap = plan.snapshot || {}
    const conditions = planSnap.conditions || ''
    const sessionNotes = planSnap.sessionNotes || ''

    const dateStr = new Date(plan.plan_date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })

    const prompt = `You are helping an astrophotographer write a session journal entry.

Here is the session data:

Date: ${dateStr}
Location: ${plan.location_name}
Forecast score: ${plan.forecast_score != null ? plan.forecast_score + '/100' : 'not recorded'}

Targets imaged:
${targetSummaries}

${conditions ? `Session conditions: ${conditions}` : ''}
${sessionNotes ? `Session notes from plan: ${sessionNotes}` : ''}
${userNotes ? `User's notes about this session: ${userNotes}` : ''}

Write a first-person journal entry narrative about this astrophotography session. 2-4 paragraphs, conversational but specific — mention the targets by name, conditions, filters used, and any details from the notes. Write as if you are the astrophotographer reflecting on the night's work. Return plain text only, no markdown formatting.`

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
      console.error('[draft-journal] Non-JSON response from Anthropic:', anthropicRes.status, text.substring(0, 200))
      return res.status(502).json({ error: 'Anthropic returned non-JSON response' })
    }

    const anthropicData = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error('[draft-journal] Anthropic API error:', anthropicData)
      return res.status(502).json({ error: anthropicData.error?.message || 'Anthropic API error' })
    }

    const textBlock = anthropicData.content?.find(b => b.type === 'text')
    if (!textBlock?.text) {
      console.error('[draft-journal] No text in Anthropic response')
      return res.status(502).json({ error: 'Empty response from LLM' })
    }

    return res.status(200).json({
      draft: textBlock.text.trim(),
      plan: {
        id: plan.id,
        name: plan.name,
        planDate: plan.plan_date,
        locationName: plan.location_name,
        forecastScore: plan.forecast_score
      },
      targets: targets.map(t => ({
        ngcIcId: t.ngc_ic_id,
        commonName: t.common_name,
        messierNumber: t.messier_number,
        objectType: t.object_type
      }))
    })
  } catch (error) {
    console.error('[draft-journal] Error:', error)
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
