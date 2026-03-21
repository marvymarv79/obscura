import { describe, it, expect } from 'vitest'
import {
  seeingColor, seeingLabel,
  transparencyColor, transparencyLabel,
  cloudColor, cloudLabel,
  windColor, windLabel,
  moonColor,
  dewColor, dewLabel,
} from './conditionsHelpers'

const GREEN = '#10b95a'
const EMBER = '#e8630a'
const CRIMSON = '#cc2936'

describe('seeingColor + seeingLabel', () => {
  it('4.5 → green, Excellent', () => {
    expect(seeingColor(4.5)).toBe(GREEN)
    expect(seeingLabel(4.5)).toBe('Excellent')
  })
  it('3.0 → ember, Above avg', () => {
    expect(seeingColor(3.0)).toBe(EMBER)
    expect(seeingLabel(3.0)).toBe('Above avg')
  })
  it('2.0 → crimson, Average', () => {
    expect(seeingColor(2.0)).toBe(CRIMSON)
    expect(seeingLabel(2.0)).toBe('Average')
  })
  it('1.0 → crimson, Below avg', () => {
    expect(seeingColor(1.0)).toBe(CRIMSON)
    expect(seeingLabel(1.0)).toBe('Below avg')
  })
})

describe('cloudColor + cloudLabel', () => {
  it('5% → green, Clear', () => {
    expect(cloudColor(5)).toBe(GREEN)
    expect(cloudLabel(5)).toBe('Clear')
  })
  it('20% → green, Nearly clear', () => {
    expect(cloudColor(20)).toBe(GREEN)
    expect(cloudLabel(20)).toBe('Nearly clear')
  })
  it('45% → ember, Partly cloudy', () => {
    expect(cloudColor(45)).toBe(EMBER)
    expect(cloudLabel(45)).toBe('Partly cloudy')
  })
  it('90% → crimson, Overcast', () => {
    expect(cloudColor(90)).toBe(CRIMSON)
    expect(cloudLabel(90)).toBe('Overcast')
  })
})

describe('windColor + windLabel', () => {
  it('0.5 m/s → green, Calm', () => {
    expect(windColor(0.5)).toBe(GREEN)
    expect(windLabel(0.5)).toBe('Calm')
  })
  it('3.0 m/s → green, Light', () => {
    expect(windColor(3.0)).toBe(GREEN)
    expect(windLabel(3.0)).toBe('Light')
  })
  it('6.0 m/s → ember, Moderate', () => {
    expect(windColor(6.0)).toBe(EMBER)
    expect(windLabel(6.0)).toBe('Moderate')
  })
  it('12.0 m/s → crimson, Strong', () => {
    expect(windColor(12.0)).toBe(CRIMSON)
    expect(windLabel(12.0)).toBe('Strong')
  })
})

describe('moonColor', () => {
  it('10% → green', () => {
    expect(moonColor(10)).toBe(GREEN)
  })
  it('50% → ember', () => {
    expect(moonColor(50)).toBe(EMBER)
  })
  it('80% → crimson', () => {
    expect(moonColor(80)).toBe(CRIMSON)
  })
})

describe('dewColor + dewLabel', () => {
  it('ΔT=9 → green, Low', () => {
    expect(dewColor(9)).toBe(GREEN)
    expect(dewLabel(9)).toBe('Low')
  })
  it('ΔT=3 → ember, Moderate', () => {
    expect(dewColor(3)).toBe(EMBER)
    expect(dewLabel(3)).toBe('Moderate')
  })
  it('ΔT=1 → crimson, High', () => {
    expect(dewColor(1)).toBe(CRIMSON)
    expect(dewLabel(1)).toBe('High')
  })
})
