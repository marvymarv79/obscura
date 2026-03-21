import { describe, it, expect } from 'vitest'
import { scoreHour, scoreNight } from './nightScore'

describe('scoreHour', () => {
  it('Input A: perfect night → 94 (green)', () => {
    // seeing=5, clouds=0, transparency=3, wind=1, dewDelta=10
    // seeingNorm=100, cloudsNorm=100, transpNorm=89.5, windNorm=96.7, dewNorm=40
    // 100*.20 + 100*.40 + 89.5*.25 + 96.7*.10 + 40*.05 = 94
    const score = scoreHour({
      seeing: 5,
      clouds: 0,
      transparency: 3,
      wind: 1,
      dewDelta: 10,
    })
    expect(score).toBe(94)
    expect(score).toBeGreaterThanOrEqual(60) // green threshold
  })

  it('Input B: terrible night → 5 (red)', () => {
    // seeing=0, clouds=100, transparency=30, wind=15, dewDelta=0
    // seeingNorm=0, cloudsNorm=0, transpNorm=0, windNorm=50, dewNorm=0
    // 0 + 0 + 0 + 50*.10 + 0 = 5
    const score = scoreHour({
      seeing: 0,
      clouds: 100,
      transparency: 30,
      wind: 15,
      dewDelta: 0,
    })
    expect(score).toBe(5)
    expect(score).toBeLessThan(30) // red threshold
  })

  it('Input C: typical good West Texas night → 70-80 (green)', () => {
    const score = scoreHour({
      seeing: 2.5,
      clouds: 5,
      transparency: 6,
      wind: 3,
      dewDelta: 8,
    })
    expect(score).toBeGreaterThanOrEqual(70)
    expect(score).toBeLessThanOrEqual(80)
    expect(score).toBeGreaterThanOrEqual(60) // green threshold
  })

  it('Input D: borderline night → 50-60 (yellow)', () => {
    // seeing=2, clouds=35, transparency=14, wind=6, dewDelta=4
    // seeingNorm=40, cloudsNorm=65, transpNorm=51, windNorm=80, dewNorm=16
    // 40*.20 + 65*.40 + 51*.25 + 80*.10 + 16*.05 = 56
    const score = scoreHour({
      seeing: 2.0,
      clouds: 35,
      transparency: 14,
      wind: 6,
      dewDelta: 4,
    })
    expect(score).toBeGreaterThanOrEqual(50)
    expect(score).toBeLessThanOrEqual(60)
    expect(score).toBeGreaterThanOrEqual(30) // yellow threshold
    expect(score).toBeLessThan(60) // below green
  })
})

describe('scoreNight', () => {
  it('returns 0 for empty hours', () => {
    expect(scoreNight([])).toBe(0)
  })

  it('averages hourly scores', () => {
    const good = { seeing: 5, clouds: 0, transparency: 3, wind: 1, dewDelta: 10 }
    const bad = { seeing: 0, clouds: 100, transparency: 30, wind: 15, dewDelta: 0 }
    const score = scoreNight([good, bad])
    expect(score).toBe(50)
  })
})
