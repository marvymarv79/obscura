import { describe, it, expect } from 'vitest'
import { scoreHour, scoreNight } from './nightScore'

describe('scoreHour', () => {
  it('returns 100 for perfect conditions', () => {
    const score = scoreHour({
      seeing: 5,        // max seeing
      clouds: 0,        // no clouds
      transparency: 0,  // perfect transparency
      wind: 0,          // no wind
      dewDelta: 25,     // very low dew risk
    })
    expect(score).toBe(100)
  })

  it('returns 0 for terrible conditions', () => {
    const score = scoreHour({
      seeing: 0,         // no seeing
      clouds: 100,       // fully overcast
      transparency: 30,  // worst transparency
      wind: 30,          // very high wind
      dewDelta: 0,       // max dew risk
    })
    expect(score).toBe(0)
  })

  it('returns 48-54 for borderline conditions', () => {
    const score = scoreHour({
      seeing: 2.5,      // mid seeing
      clouds: 50,       // half cloudy
      transparency: 14, // mid transparency
      wind: 15,         // moderate wind
      dewDelta: 12,     // moderate dew
    })
    expect(score).toBeGreaterThanOrEqual(48)
    expect(score).toBeLessThanOrEqual(54)
  })
})

describe('scoreNight', () => {
  it('returns 0 for empty hours', () => {
    expect(scoreNight([])).toBe(0)
  })

  it('averages hourly scores', () => {
    const perfect = { seeing: 5, clouds: 0, transparency: 0, wind: 0, dewDelta: 25 }
    const terrible = { seeing: 0, clouds: 100, transparency: 30, wind: 30, dewDelta: 0 }
    const score = scoreNight([perfect, terrible])
    expect(score).toBe(50)
  })
})
