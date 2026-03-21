/**
 * Night scoring algorithm for Astrospheric forecast data.
 *
 * Weights: clouds 40%, transparency 25%, seeing 20%, wind 10%, dew 5%
 * Calibrated for West Texas imaging conditions.
 *
 * Each factor is normalized to 0-100 where 100 = best for imaging.
 */

/**
 * Normalize a single hour of forecast data to a 0-100 score.
 *
 * @param {object} hour
 * @param {number} hour.seeing       - Astrospheric seeing (0-5, higher = better)
 * @param {number} hour.clouds       - Cloud cover percentage (0-100, lower = better)
 * @param {number} hour.transparency - Astrospheric transparency (0-30ish, lower = better)
 * @param {number} hour.wind         - Wind speed in mph (lower = better)
 * @param {number} hour.dewDelta     - Temp minus dew point in °F (higher = better, less dew risk)
 * @returns {number} 0-100 score
 */
export function scoreHour({ seeing, clouds, transparency, wind, dewDelta }) {
  const seeingNorm = Math.min(100, Math.max(0, (seeing / 5) * 100))
  const cloudsNorm = Math.min(100, Math.max(0, 100 - clouds))
  const transpNorm = Math.min(100, Math.max(0, 100 - transparency * 3.5))
  const windNorm = Math.min(100, Math.max(0, 100 - wind * 3.33))
  const dewNorm = Math.min(100, Math.max(0, dewDelta * 4))

  return Math.round(
    seeingNorm * 0.20 +
    cloudsNorm * 0.40 +
    transpNorm * 0.25 +
    windNorm * 0.10 +
    dewNorm * 0.05
  )
}

/**
 * Score a night by averaging the hourly scores within the imaging window.
 *
 * @param {object[]} hours - Array of hour objects with seeing, clouds, transparency, wind, dewDelta
 * @returns {number} 0-100 averaged night score
 */
export function scoreNight(hours) {
  if (!hours || hours.length === 0) return 0
  const total = hours.reduce((sum, h) => sum + scoreHour(h), 0)
  return Math.min(100, Math.max(0, Math.round(total / hours.length)))
}

/**
 * Filter Astrospheric forecast hours to the imaging window (9 PM - 5 AM local)
 * for each calendar night, and compute night scores.
 *
 * A "night" is defined as 9 PM on date D through 5 AM on date D+1.
 * The night is labeled by date D.
 *
 * @param {object} astropheric - Raw Astrospheric API response data
 * @param {function} kelvinToF - Kelvin to Fahrenheit converter
 * @returns {object[]} Array of { date, score, inRange, hours } for up to 7 days
 */
export function buildForecastDays(astropheric, kelvinToF) {
  if (!astropheric) return []

  const startTime = new Date(astropheric.LocalStartTime)
  const totalHours = astropheric.RDPS_CloudCover.length

  // Build all hourly data with timestamps
  const allHours = []
  for (let i = 0; i < totalHours; i++) {
    const hourTime = new Date(startTime.getTime() + i * 60 * 60 * 1000)
    const tempK = astropheric.RDPS_Temperature[i].Value.ActualValue
    const dewK = astropheric.RDPS_DewPoint[i].Value.ActualValue
    const tempF = kelvinToF(tempK)
    const dewF = kelvinToF(dewK)

    const windMs = astropheric.RDPS_WindVelocity[i].Value.ActualValue

    allHours.push({
      index: i,
      time: hourTime,
      hour: hourTime.getHours(),
      seeing: astropheric.Astrospheric_Seeing[i].Value.ActualValue,
      clouds: astropheric.RDPS_CloudCover[i].Value.ActualValue,
      transparency: astropheric.Astrospheric_Transparency[i].Value.ActualValue,
      wind: Math.round(windMs * 2.237),
      windMs,
      windDir: Math.round(astropheric.RDPS_WindDirection[i].Value.ActualValue),
      dewDelta: tempF - dewF,
      dewDeltaC: tempK - dewK,
      tempK,
      dewK,
    })
  }

  // Group into nights: 9 PM (21:00) on day D through 5 AM (04:59) on day D+1
  // Night is labeled by day D's date
  const nightMap = {}
  for (const h of allHours) {
    let nightDateKey
    if (h.hour >= 21) {
      // Evening portion: belongs to this date's night
      nightDateKey = h.time.toLocaleDateString('en-CA')
    } else if (h.hour < 5) {
      // Early morning portion: belongs to previous date's night
      const prevDay = new Date(h.time)
      prevDay.setDate(prevDay.getDate() - 1)
      nightDateKey = prevDay.toLocaleDateString('en-CA')
    } else {
      // Daytime (5 AM - 8:59 PM): skip
      continue
    }
    if (!nightMap[nightDateKey]) nightMap[nightDateKey] = []
    nightMap[nightDateKey].push(h)
  }

  // Build 7-day array starting from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = []

  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(today.getTime() + d * 24 * 60 * 60 * 1000)
    const dateKey = dayDate.toLocaleDateString('en-CA')
    const nightHours = nightMap[dateKey]

    if (nightHours && nightHours.length > 0) {
      const score = scoreNight(nightHours)
      days.push({ date: dayDate, score, inRange: true, hours: nightHours })
    } else {
      days.push({ date: dayDate, score: null, inRange: false, hours: [] })
    }
  }

  return days
}
