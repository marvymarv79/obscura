/**
 * Conditions card metric helpers.
 * Each metric returns { color, label, barPct, display, sub }.
 */

const GREEN = '#10b95a'
const EMBER = '#e8630a'
const CRIMSON = '#cc2936'

// ── Seeing (0–5, higher is better) ──

export function seeingColor(v) {
  return v >= 4 ? GREEN : v >= 2.5 ? EMBER : CRIMSON
}

export function seeingLabel(v) {
  if (v >= 4) return 'Excellent'
  if (v >= 3) return 'Above avg'
  if (v >= 2) return 'Average'
  if (v >= 1) return 'Below avg'
  return 'Poor'
}

export function seeingMetric(v) {
  return {
    display: `${v.toFixed(1)} / 5`,
    sub: seeingLabel(v),
    color: seeingColor(v),
    barPct: Math.min(100, Math.max(0, (v / 5) * 100)),
  }
}

// ── Transparency (lower is better, Astrospheric scale) ──

export function transparencyColor(v) {
  return v <= 9 ? GREEN : v <= 23 ? EMBER : CRIMSON
}

export function transparencyLabel(v) {
  if (v <= 5) return 'Excellent'
  if (v <= 9) return 'Above avg'
  if (v <= 13) return 'Average'
  if (v <= 23) return 'Below avg'
  if (v <= 27) return 'Poor'
  return 'Cloudy'
}

export function transparencyMetric(v) {
  return {
    display: v.toFixed(1),
    sub: transparencyLabel(v),
    color: transparencyColor(v),
    barPct: Math.max(0, (30 - Math.min(v, 30)) / 30 * 100),
  }
}

// ── Cloud Cover (0–100%, lower is better) ──

export function cloudColor(v) {
  return v <= 25 ? GREEN : v <= 60 ? EMBER : CRIMSON
}

export function cloudLabel(v) {
  if (v <= 10) return 'Clear'
  if (v <= 25) return 'Nearly clear'
  if (v <= 50) return 'Partly cloudy'
  if (v <= 80) return 'Mostly cloudy'
  return 'Overcast'
}

export function cloudMetric(v) {
  return {
    display: `${Math.round(v)}%`,
    sub: cloudLabel(v),
    color: cloudColor(v),
    barPct: Math.max(0, (1 - v / 100) * 100),
  }
}

// ── Wind (m/s, lower is better) ──

export function windColor(v) {
  return v <= 4 ? GREEN : v <= 7 ? EMBER : CRIMSON
}

export function windLabel(v) {
  if (v < 1) return 'Calm'
  if (v <= 4) return 'Light'
  if (v <= 7) return 'Moderate'
  if (v <= 10) return 'Fresh'
  return 'Strong'
}

export function windMetric(v) {
  return {
    display: `${v.toFixed(1)} m/s`,
    sub: windLabel(v),
    color: windColor(v),
    barPct: Math.max(0, (1 - Math.min(v / 15, 1)) * 100),
  }
}

// ── Moon (illumination %, lower is better for imaging) ──

export function moonColor(illum) {
  return illum <= 25 ? GREEN : illum <= 60 ? EMBER : CRIMSON
}

export function moonMetric(illum, phase) {
  return {
    display: `${Math.round(illum)}%`,
    sub: phase || '',
    color: moonColor(illum),
    barPct: Math.max(0, (1 - illum / 100) * 100),
  }
}

// ── Dew Risk (ΔT in °C, higher is better) ──

export function dewColor(deltaT) {
  return deltaT >= 5 ? GREEN : deltaT >= 2 ? EMBER : CRIMSON
}

export function dewLabel(deltaT) {
  if (deltaT >= 5) return 'Low'
  if (deltaT >= 2) return 'Moderate'
  return 'High'
}

export function dewMetric(deltaT) {
  return {
    display: dewLabel(deltaT),
    sub: `\u0394T = ${deltaT.toFixed(1)}\u00B0C`,
    color: dewColor(deltaT),
    barPct: Math.min(100, Math.max(0, (deltaT / 10) * 100)),
  }
}
