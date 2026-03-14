import { describe, it, expect } from "vitest"
import {
  buildBands,
  analyseSpectrum,
  combinedEnergy,
  adaptiveNoiseFloor,
  applyNoiseGate,
  DEFAULT_BAND_WEIGHTS,
} from "@/lib/audio"

describe("buildBands", () => {
  it("returns 6 bands with correct Hz boundaries", () => {
    const bands = buildBands(DEFAULT_BAND_WEIGHTS)
    expect(bands).toHaveLength(6)
    expect(bands[0].maxHz).toBe(60)
    expect(bands[1].maxHz).toBe(250)
    expect(bands[5].maxHz).toBe(Infinity)
  })

  it("uses custom weights", () => {
    const bands = buildBands([0.1, 0.2, 0.3, 0.4, 0.5, 0.6])
    expect(bands[0].weight).toBe(0.1)
    expect(bands[5].weight).toBe(0.6)
  })

  it("falls back to defaults for missing weights", () => {
    const bands = buildBands([])
    expect(bands[0].weight).toBe(1.0)
    expect(bands[5].weight).toBe(0.15)
  })
})

describe("analyseSpectrum", () => {
  it("returns zero energies for a silent spectrum", () => {
    const data = new Uint8Array(128).fill(0)
    const prev = new Float32Array(128).fill(0)
    const bands = buildBands(DEFAULT_BAND_WEIGHTS)
    const binHz = 44100 / (128 * 2) // fftSize = 256

    const result = analyseSpectrum(data, prev, bands, binHz)
    expect(result.avgLevel).toBe(0)
    expect(result.avgFlux).toBe(0)
    result.bandEnergies.forEach((e) => expect(e).toBe(0))
  })

  it("returns non-zero levels for a loud spectrum", () => {
    const data = new Uint8Array(128).fill(255)
    const prev = new Float32Array(128).fill(0)
    const bands = buildBands(DEFAULT_BAND_WEIGHTS)
    const binHz = 44100 / (128 * 2)

    const result = analyseSpectrum(data, prev, bands, binHz)
    expect(result.avgLevel).toBeGreaterThan(0.9)
    // First frame from silence → loud should have positive flux
    expect(result.avgFlux).toBeGreaterThan(0)
  })

  it("returns zero flux on a repeated identical frame", () => {
    const data = new Uint8Array(128).fill(128)
    const prev = new Float32Array(128).fill(128 / 255)
    const bands = buildBands(DEFAULT_BAND_WEIGHTS)
    const binHz = 44100 / (128 * 2)

    const result = analyseSpectrum(data, prev, bands, binHz)
    expect(result.avgFlux).toBeCloseTo(0, 5)
  })

  it("returns zero flux when volume decreases (only positive diffs count)", () => {
    const data = new Uint8Array(128).fill(50)
    const prev = new Float32Array(128).fill(200 / 255)
    const bands = buildBands(DEFAULT_BAND_WEIGHTS)
    const binHz = 44100 / (128 * 2)

    const result = analyseSpectrum(data, prev, bands, binHz)
    expect(result.avgFlux).toBe(0)
  })

  it("updates prevSpectrum in place", () => {
    const data = new Uint8Array(4).fill(128)
    const prev = new Float32Array(4).fill(0)
    const bands = buildBands(DEFAULT_BAND_WEIGHTS)
    const binHz = 44100 / 8

    analyseSpectrum(data, prev, bands, binHz)
    expect(prev[0]).toBeCloseTo(128 / 255, 5)
  })
})

describe("combinedEnergy", () => {
  it("returns 0 for zero inputs", () => {
    expect(combinedEnergy(0, 0)).toBe(0)
  })

  it("clamps to 1 for very high inputs", () => {
    expect(combinedEnergy(1, 1)).toBe(1)
  })

  it("applies correct weights (0.65 level + 15×0.35 flux)", () => {
    const level = 0.5
    const flux = 0.1
    const expected = 0.5 * 0.65 + 0.1 * 15.0 * 0.35
    expect(combinedEnergy(level, flux)).toBeCloseTo(expected)
  })

  it("never returns below 0", () => {
    expect(combinedEnergy(-0.5, -0.5)).toBe(0)
  })
})

describe("adaptiveNoiseFloor", () => {
  it("rises slowly when energy is above baseline", () => {
    const baseline = 0.1
    const energy = 0.5
    const newBaseline = adaptiveNoiseFloor(energy, baseline)
    // alpha = 0.0005, small step up
    expect(newBaseline).toBeGreaterThan(baseline)
    expect(newBaseline).toBeLessThan(baseline + 0.001)
  })

  it("drops faster when energy is below baseline", () => {
    const baseline = 0.5
    const energy = 0.1
    const newBaseline = adaptiveNoiseFloor(energy, baseline)
    // alpha = 0.02, larger step down
    expect(newBaseline).toBeLessThan(baseline)
    expect(newBaseline - baseline).toBeLessThan(-0.005)
  })

  it("stays at baseline when energy equals baseline", () => {
    expect(adaptiveNoiseFloor(0.3, 0.3)).toBeCloseTo(0.3)
  })
})

describe("applyNoiseGate", () => {
  it("returns 0 when energy is below baseline", () => {
    expect(applyNoiseGate(0.1, 0.5, 3.0)).toBe(0)
  })

  it("scales by sensitivity", () => {
    const result = applyNoiseGate(0.5, 0.1, 2.0)
    expect(result).toBeCloseTo((0.5 - 0.1) * 2.0)
  })

  it("clamps output to 1", () => {
    expect(applyNoiseGate(1.0, 0.0, 10.0)).toBe(1)
  })

  it("enforces minimum sensitivity of 0.1", () => {
    const result = applyNoiseGate(0.5, 0.0, 0.0)
    expect(result).toBeCloseTo(0.5 * 0.1)
  })
})
