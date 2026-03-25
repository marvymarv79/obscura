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

    // Find users whose most recent update across all vig_* tables is > 30 days ago
    const staleUsers = await sql`
      SELECT user_id, MAX(last_update) AS last_update
      FROM (
        SELECT user_id, MAX(created_at) AS last_update FROM vig_locations GROUP BY user_id
        UNION ALL
        SELECT user_id, MAX(updated_at) AS last_update FROM vig_firearms GROUP BY user_id
        UNION ALL
        SELECT user_id, MAX(updated_at) AS last_update FROM vig_suppressors GROUP BY user_id
        UNION ALL
        SELECT user_id, MAX(updated_at) AS last_update FROM vig_ammo GROUP BY user_id
        UNION ALL
        SELECT user_id, MAX(updated_at) AS last_update FROM vig_vehicles GROUP BY user_id
        UNION ALL
        SELECT user_id, MAX(updated_at) AS last_update FROM vig_inventory GROUP BY user_id
      ) AS all_updates
      GROUP BY user_id
      HAVING MAX(last_update) < NOW() - INTERVAL '30 days'
    `

    if (staleUsers.length === 0) {
      return res.status(200).json({ message: 'No stale users found', emailSent: false })
    }

    const alertEmail = process.env.ALERT_EMAIL
    if (!alertEmail) {
      console.error('Vigilia stale-check: ALERT_EMAIL not set, logging results only')
      for (const user of staleUsers) {
        console.error(`Vigilia stale-check: User ${user.user_id} last updated ${user.last_update}`)
      }
      return res.status(200).json({
        message: 'ALERT_EMAIL not configured, logged results',
        staleUserCount: staleUsers.length
      })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const userRows = staleUsers.map(u => {
      const lastDate = new Date(u.last_update).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      })
      const daysAgo = Math.floor((Date.now() - new Date(u.last_update).getTime()) / (1000 * 60 * 60 * 24))
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1d2230;color:#f0d0b0;">${u.user_id}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1d2230;color:#a09080;">${lastDate}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1d2230;color:#cc2936;font-weight:600;">${daysAgo} days ago</td>
        </tr>
      `
    }).join('')

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#13171f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="text-align:center;padding:20px 0;">
    <span style="color:#f0d0b0;font-size:22px;font-weight:600;">Vig</span><span style="color:#0d9488;font-size:22px;font-weight:600;">ilia</span>
    <div style="color:#5a4a40;font-size:12px;margin-top:4px;">Stale Inventory Reminder</div>
  </div>
  <div style="background:#191d26;border-radius:8px;border:1px solid rgba(240,208,176,0.07);overflow:hidden;">
    <div style="padding:16px;border-bottom:1px solid #1d2230;">
      <div style="color:#f0d0b0;font-size:16px;font-weight:600;">
        ${staleUsers.length} user${staleUsers.length !== 1 ? 's' : ''} with stale inventory
      </div>
      <div style="color:#a09080;font-size:12px;margin-top:4px;">No updates in the last 30 days</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#1d2230;">
        <th style="padding:8px 12px;text-align:left;color:#a09080;font-size:12px;">User</th>
        <th style="padding:8px 12px;text-align:left;color:#a09080;font-size:12px;">Last Update</th>
        <th style="padding:8px 12px;text-align:left;color:#a09080;font-size:12px;">Stale</th>
      </tr>
      ${userRows}
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
      subject: `Vigilia — ${staleUsers.length} user${staleUsers.length !== 1 ? 's' : ''} with stale inventory`,
      html: emailHtml
    })

    return res.status(200).json({
      message: 'Stale check email sent',
      emailSent: true,
      staleUserCount: staleUsers.length
    })
  } catch (error) {
    console.error('Vigilia stale-check error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}
