// ── Audio analysis pure functions ───────────────────────────

export const DEFAULT_BAND_WEIGHTS = [1.0, 0.9, 0.7, 0.5, 0.3, 0.15]

export interface BandConfig {
  maxHz: number
  weight: number
}

export function buildBands(bandWeights: number[]): BandConfig[] {
  return [
    { maxHz: 60,       weight: bandWeights[0] ?? 1.0 },
    { maxHz: 250,      weight: bandWeights[1] ?? 0.9 },
    { maxHz: 500,      weight: bandWeights[2] ?? 0.7 },
    { maxHz: 2000,     weight: bandWeights[3] ?? 0.5 },
    { maxHz: 6000,     weight: bandWeights[4] ?? 0.3 },
    { maxHz: Infinity, weight: bandWeights[5] ?? 0.15 },
  ]
}

export interface SpectrumResult {
  /** Per-band average energies (unweighted raw volume) */
  bandEnergies: number[]
  /** Weighted average level across all bins */
  avgLevel: number
  /** Weighted average spectral flux across all bins */
  avgFlux: number
}

/**
 * Analyse a frequency spectrum frame: compute per-band energies, weighted level,
 * and spectral flux (onset detection via positive-only bin deltas).
 */
export function analyseSpectrum(
  dataArray: Uint8Array,
  prevSpectrum: Float32Array,
  bands: BandConfig[],
  binHz: number,
): SpectrumResult {
  const bufferLength = dataArray.length
  let weightedFlux = 0
  let weightedLevel = 0
  let totalWeight = 0
  let bandIdx = 0

  const bandSums = new Array(bands.length).fill(0)
  const bandCounts = new Array(bands.length).fill(0)

  for (let i = 0; i < bufferLength; i++) {
    const hz = i * binHz
    while (bandIdx < bands.length - 1 && hz > bands[bandIdx].maxHz) {
      bandIdx++
    }
    const w = bands[bandIdx].weight

    const current = dataArray[i] / 255
    const prev = prevSpectrum[i]

    const diff = current - prev
    if (diff > 0) weightedFlux += diff * w

    weightedLevel += current * w
    totalWeight += w

    bandSums[bandIdx] += current
    bandCounts[bandIdx]++

    prevSpectrum[i] = current
  }

  const bandEnergies = bandSums.map((sum, b) =>
    bandCounts[b] > 0 ? sum / bandCounts[b] : 0,
  )

  return {
    bandEnergies,
    avgLevel: totalWeight > 0 ? weightedLevel / totalWeight : 0,
    avgFlux: totalWeight > 0 ? weightedFlux / totalWeight : 0,
  }
}

/**
 * Combine weighted level and spectral flux into a single 0–1 energy value.
 * Level gives sustained energy, flux gives onset/busyness detection.
 */
export function combinedEnergy(avgLevel: number, avgFlux: number): number {
  const combined = avgLevel * 0.65 + avgFlux * 15.0 * 0.35
  return Math.min(1, Math.max(0, combined))
}

/**
 * Adaptive noise floor: tracks baseline ambient level with asymmetric alpha.
 * Rises very slowly (music isn't treated as noise), drops faster (silence recognized quickly).
 * Returns the new baseline value.
 */
export function adaptiveNoiseFloor(
  fullEnergy: number,
  baseline: number,
): number {
  const alpha = fullEnergy > baseline ? 0.0005 : 0.02
  return baseline + (fullEnergy - baseline) * alpha
}

/**
 * Subtract noise floor and apply sensitivity scaling.
 * Returns clamped 0–1 energy value.
 */
export function applyNoiseGate(
  fullEnergy: number,
  baseline: number,
  sensitivity: number,
): number {
  const above = Math.max(0, fullEnergy - baseline)
  return Math.min(1, above * Math.max(0.1, sensitivity))
}
