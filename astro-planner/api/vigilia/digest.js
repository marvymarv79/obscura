import { neon } from '@neondatabase/serverless'
import { Resend } from 'resend'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Get all below-threshold items across all users
    const belowThreshold = await sql`
      SELECT i.*, l.name AS location_name, i.user_id
      FROM vig_inventory i
      LEFT JOIN vig_locations l ON i.location_id = l.id
      WHERE i.min_threshold IS NOT NULL
        AND i.quantity < i.min_threshold
      ORDER BY i.user_id, i.name ASC
    `

    if (belowThreshold.length === 0) {
      return res.status(200).json({ message: 'No items below threshold', emailSent: false })
    }

    // Build summary by user
    const byUser = {}
    for (const item of belowThreshold) {
      if (!byUser[item.user_id]) {
        byUser[item.user_id] = []
      }
      byUser[item.user_id].push(item)
    }

    const alertEmail = process.env.ALERT_EMAIL
    if (!alertEmail) {
      console.error('Vigilia digest: ALERT_EMAIL not set, logging results only')
      for (const [userId, items] of Object.entries(byUser)) {
        console.error(`Vigilia digest: User ${userId} has ${items.length} items below threshold`)
        for (const item of items) {
          console.error(`  - ${item.name}: ${item.quantity} / ${item.min_threshold} (${item.location_name || 'no location'})`)
        }
      }
      return res.status(200).json({
        message: 'ALERT_EMAIL not configured, logged results',
        userCount: Object.keys(byUser).length,
        totalItems: belowThreshold.length
      })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const itemRows = belowThreshold.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1d2230;color:#f0d0b0;">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1d2230;color:#cc2936;font-weight:600;">${item.quantity} / ${item.min_threshold}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1d2230;color:#a09080;">${item.location_name || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1d2230;color:#a09080;">${item.category || '—'}</td>
      </tr>
    `).join('')

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#13171f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="text-align:center;padding:20px 0;">
    <span style="color:#f0d0b0;font-size:22px;font-weight:600;">Vig</span><span style="color:#0d9488;font-size:22px;font-weight:600;">ilia</span>
    <div style="color:#5a4a40;font-size:12px;margin-top:4px;">Weekly Inventory Digest</div>
  </div>
  <div style="background:#191d26;border-radius:8px;border:1px solid rgba(240,208,176,0.07);overflow:hidden;">
    <div style="padding:16px;border-bottom:1px solid #1d2230;">
      <div style="color:#f0d0b0;font-size:16px;font-weight:600;">
        ${belowThreshold.length} item${belowThreshold.length !== 1 ? 's' : ''} below threshold
      </div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#1d2230;">
        <th style="padding:8px 12px;text-align:left;color:#a09080;font-size:12px;">Item</th>
        <th style="padding:8px 12px;text-align:left;color:#a09080;font-size:12px;">Qty / Min</th>
        <th style="padding:8px 12px;text-align:left;color:#a09080;font-size:12px;">Location</th>
        <th style="padding:8px 12px;text-align:left;color:#a09080;font-size:12px;">Category</th>
      </tr>
      ${itemRows}
    </table>
  </div>
  <div style="text-align:center;margin-top:24px;">
    <a href="https://marvymarv.xyz/vigilia" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:14px;">Open Vigilia</a>
  </div>
</div>
</body>
</html>`

    await resend.emails.send({
      from: 'alerts@marvymarv.xyz',
      to: alertEmail,
      subject: `Vigilia — ${belowThreshold.length} item${belowThreshold.length !== 1 ? 's' : ''} below threshold`,
      html: emailHtml
    })

    return res.status(200).json({
      message: 'Digest email sent',
      emailSent: true,
      userCount: Object.keys(byUser).length,
      totalItems: belowThreshold.length
    })
  } catch (error) {
    console.error('Vigilia digest error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}
