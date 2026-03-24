/**
 * Legacy plans endpoint — used by Obscura's "Add to Tonight's Plan" flow.
 * Rewired to use new plans + plan_targets tables (not old imaging_plans).
 *
 * IMPORTANT: All authenticated API calls must use withAuth wrapper.
 */
import { neon } from '@neondatabase/serverless'
import { withAuth } from './_utils/auth.js'

async function handler(req, res, userId) {
  const sql = neon(process.env.DATABASE_URL)

  try {
    switch (req.method) {
      case 'GET': {
        const plans = await sql`
          SELECT p.*,
            (SELECT COUNT(*)::int FROM plan_targets WHERE plan_id = p.id) as target_count,
            (SELECT COALESCE(json_agg(sub.name), '[]'::json) FROM (
              SELECT COALESCE(t.common_name, t.ngc_ic_id) as name
              FROM plan_targets pt JOIN targets t ON pt.target_id = t.id
              WHERE pt.plan_id = p.id ORDER BY pt.position LIMIT 3
            ) sub) as target_names
          FROM plans p
          WHERE p.user_id = ${userId}
          ORDER BY p.plan_date DESC
        `
        return res.status(200).json(plans)
      }

      case 'POST': {
        const { name, planDate, locationName, latitude, longitude, targets } = req.body

        if (!name || !planDate) {
          return res.status(400).json({ error: 'Name and plan date are required' })
        }

        const [newPlan] = await sql`
          INSERT INTO plans (user_id, name, plan_date, location_name, latitude, longitude)
          VALUES (${userId}, ${name}, ${planDate}, ${locationName || 'Unknown'}, ${latitude || 0}, ${longitude || 0})
          RETURNING *
        `

        // Insert targets if provided
        if (targets && Array.isArray(targets) && targets.length > 0) {
          for (let i = 0; i < targets.length; i++) {
            const t = targets[i]
            // Look up numeric target ID from ngc_ic_id string
            const [dbTarget] = await sql`
              SELECT id FROM targets WHERE ngc_ic_id = ${t.targetId} LIMIT 1
            `
            if (dbTarget) {
              await sql`
                INSERT INTO plan_targets (plan_id, target_id, position, imaging_train_id, snapshot)
                VALUES (${newPlan.id}, ${dbTarget.id}, ${i}, ${t.defaultSetupId || null},
                  ${JSON.stringify({ targetName: t.targetName, score: t.visibilityScore || null, notes: t.notes || null })}
                )
              `
            }
          }
        }

        // Fetch targets back
        const planTargets = await sql`
          SELECT pt.*, t.ngc_ic_id, t.common_name
          FROM plan_targets pt
          LEFT JOIN targets t ON pt.target_id = t.id
          WHERE pt.plan_id = ${newPlan.id}
          ORDER BY pt.position
        `

        return res.status(201).json({ ...newPlan, targets: planTargets })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('[api/plans] Error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
