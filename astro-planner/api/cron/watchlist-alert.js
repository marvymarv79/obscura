import { neon } from '@neondatabase/serverless'
import { Resend } from 'resend'
import { scoreTarget, getFilterSequence, getImagingWindow, getTransitTime } from '../../src/targetEngine.js'

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const sql = neon(process.env.DATABASE_URL)
  const resend = new Resend(process.env.RESEND_API_KEY)
  const today = new Date().toISOString().split('T')[0]

  let processed = 0
  let alerted = 0
  let skipped = 0

  try {
    // Get all users with alert-enabled watchlist entries
    const users = await sql`
      SELECT DISTINCT w.user_id
      FROM watchlist w
      WHERE w.alerts_enabled = true
    `

    for (const { user_id: userId } of users) {
      processed++

      // Check if already alerted today
      const existingAlert = await sql`
        SELECT id FROM watchlist_alerts
        WHERE user_id = ${userId} AND alert_date = ${today}
      `
      if (existingAlert.length > 0) {
        skipped++
        continue
      }

      // Get user's saved locations
      const locations = await sql`
        SELECT name, latitude, longitude FROM locations
        WHERE user_id = ${userId}
        LIMIT 5
      `
      if (locations.length === 0) {
        skipped++
        continue
      }

      // Get user's watchlisted targets
      const entries = await sql`
        SELECT w.id, t.*
        FROM watchlist w
        JOIN targets t ON w.target_id = t.id
        WHERE w.user_id = ${userId} AND w.alerts_enabled = true
      `

      const qualifyingTargets = []
      let bestLocation = locations[0]

      for (const loc of locations) {
        const lat = parseFloat(loc.latitude)
        const lng = parseFloat(loc.longitude)
        const location = { latitude: lat, longitude: lng, min_altitude_deg: 25 }
        const tonight = new Date()

        // Fetch Astrospheric forecast to get real UTCMinuteOffset
        let utcOffset = Math.round(lng / 15) * 60 // fallback
        try {
          const apiKey = process.env.ASTROPHERIC_API_KEY
          if (apiKey) {
            const astroResp = await fetch('https://astrosphericpublicaccess.azurewebsites.net/api/GetForecastData_V1', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ Latitude: lat, Longitude: lng, APIKey: apiKey }),
              signal: AbortSignal.timeout(8000)
            })
            if (astroResp.ok) {
              const astroData = await astroResp.json()
              if (astroData.UTCMinuteOffset != null) {
                utcOffset = -astroData.UTCMinuteOffset // Astrospheric uses positive for west
              }
            }
          }
        } catch { /* use longitude fallback */ }

        for (const target of entries) {
          try {
            const result = scoreTarget(target, location, tonight, null, [])
            if (!result || result.score < 70) continue
            if (!result.imagingWindow || result.imagingWindow.duration_minutes < 360) continue

            const filterSeq = getFilterSequence(
              target, result.imagingWindow, result.transitTime, 'Mono', utcOffset
            )

            qualifyingTargets.push({
              name: target.ngc_ic_id,
              commonName: target.common_name,
              objectType: target.object_type,
              score: result.score,
              windowMinutes: result.imagingWindow.duration_minutes,
              transitTime: result.transitTime,
              filterSummary: filterSeq.map(b => b.filter).join(' · '),
              windowStart: filterSeq[0]?.start || '--:--',
              windowEnd: filterSeq[filterSeq.length - 1]?.end || '--:--',
              locationName: loc.name
            })
            bestLocation = loc
          } catch {
            // Skip failed scoring
          }
        }
      }

      if (qualifyingTargets.length === 0) {
        skipped++
        continue
      }

      // Build email HTML
      const targetRows = qualifyingTargets.map(t => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #1d2230;">
            <div style="color:#f0d0b0;font-weight:600;font-size:15px;">${t.name}</div>
            ${t.commonName ? `<div style="color:#a09080;font-size:12px;">${t.commonName}</div>` : ''}
            <div style="color:#a09080;font-size:12px;margin-top:4px;">
              ${t.objectType} · Score: <span style="color:#10b95a;font-weight:600;">${t.score}</span>
              · ${t.filterSummary}
            </div>
            <div style="color:#5a4a40;font-size:11px;margin-top:2px;">
              ${t.windowStart} — ${t.windowEnd} (${Math.floor(t.windowMinutes / 60)}h ${t.windowMinutes % 60}m)
            </div>
          </td>
        </tr>
      `).join('')

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#13171f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="text-align:center;padding:20px 0;">
    <span style="color:#f0d0b0;font-size:22px;font-weight:600;">Obs</span><span style="color:#e8630a;font-size:22px;font-weight:600;">cura</span>
    <div style="color:#5a4a40;font-size:12px;margin-top:4px;">Tonight's Alert</div>
  </div>
  <div style="background:#191d26;border-radius:8px;border:1px solid rgba(240,208,176,0.07);overflow:hidden;">
    <div style="padding:16px;border-bottom:1px solid #1d2230;">
      <div style="color:#a09080;font-size:12px;">${bestLocation.name} · ${today}</div>
      <div style="color:#f0d0b0;font-size:16px;font-weight:600;margin-top:4px;">
        ${qualifyingTargets.length} target${qualifyingTargets.length !== 1 ? 's' : ''} shootable tonight
      </div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${targetRows}
    </table>
  </div>
  <div style="text-align:center;margin-top:24px;">
    <a href="https://marvymarv.xyz/obscura" style="display:inline-block;background:#e8630a;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:14px;">Open Obscura</a>
  </div>
  <div style="text-align:center;color:#3a2a20;font-size:11px;margin-top:24px;">
    Manage alerts in Obscura Watchlist settings
  </div>
</div>
</body>
</html>`

      const subject = `Obscura — ${qualifyingTargets.length} target${qualifyingTargets.length !== 1 ? 's' : ''} shootable tonight at ${bestLocation.name}`

      try {
        await resend.emails.send({
          from: 'alerts@marvymarv.xyz',
          to: 'm.clark.church@gmail.com',
          subject,
          html: emailHtml
        })

        await sql`
          INSERT INTO watchlist_alerts (user_id, target_count, location_name, alert_date)
          VALUES (${userId}, ${qualifyingTargets.length}, ${bestLocation.name}, ${today})
        `
        alerted++
      } catch (emailErr) {
        console.error('Email send error:', emailErr)
        skipped++
      }
    }

    return res.status(200).json({ processed, alerted, skipped })
  } catch (error) {
    console.error('Watchlist alert cron error:', error)
    return res.status(500).json({ error: error.message })
  }
}
