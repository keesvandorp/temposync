import { describe, it, expect } from "vitest"
import {
  smoothingTau,
  smoothingAlpha,
  smoothSpeed,
  mapEnergyToSpeed,
  graphYForRate,
} from "@/lib/speed"

describe("smoothingTau", () => {
  it("returns ~0.01 for slider = 0 (instant)", () => {
    expect(smoothingTau(0)).toBeCloseTo(0.01)
  })

  it("returns ~5.01 for slider = 1 (very slow)", () => {
    expect(smoothingTau(1)).toBeCloseTo(5.01)
  })

  it("is monotonically increasing", () => {
    let prev = smoothingTau(0)
    for (let i = 1; i <= 100; i++) {
      const val = smoothingTau(i / 100)
      expect(val).toBeGreaterThanOrEqual(prev)
      prev = val
    }
  })
})

describe("smoothingAlpha", () => {
  it("returns ~1 for dt = 0 (no time elapsed)", () => {
    expect(smoothingAlpha(0, 1)).toBeCloseTo(1)
  })

  it("returns smaller values for larger dt", () => {
    expect(smoothingAlpha(1, 1)).toBeLessThan(smoothingAlpha(0.1, 1))
  })

  it("returns larger values for larger tau", () => {
    expect(smoothingAlpha(0.1, 5)).toBeGreaterThan(smoothingAlpha(0.1, 0.5))
  })

  it("is always in [0, 1]", () => {
    for (const dt of [0, 0.001, 0.016, 0.1, 1, 10]) {
      for (const tau of [0.01, 0.1, 1, 5]) {
        const a = smoothingAlpha(dt, tau)
        expect(a).toBeGreaterThanOrEqual(0)
        expect(a).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe("smoothSpeed", () => {
  it("returns target when alpha = 0 (instant update)", () => {
    expect(smoothSpeed(2, 4, 2.5, 0)).toBeCloseTo(4)
  })

  it("stays at current when alpha = 1 (no update)", () => {
    // alpha=1 → decayed = mid + (current - mid)*1 = current
    // result = current + (target - current) * 0 = current
    expect(smoothSpeed(2, 4, 2.5, 1)).toBeCloseTo(2)
  })

  it("moves toward target at intermediate alpha", () => {
    const result = smoothSpeed(1, 3, 2, 0.5)
    expect(result).toBeGreaterThan(1)
    expect(result).toBeLessThan(3)
  })
})

describe("mapEnergyToSpeed", () => {
  it("returns minSpeed when energy = 0", () => {
    expect(mapEnergyToSpeed(0, 0.5, 4)).toBe(0.5)
  })

  it("returns maxSpeed when energy = 1", () => {
    expect(mapEnergyToSpeed(1, 0.5, 4)).toBe(4)
  })

  it("returns midpoint at energy = 0.5", () => {
    expect(mapEnergyToSpeed(0.5, 0.5, 4)).toBeCloseTo(2.25)
  })
})

describe("graphYForRate", () => {
  const height = 200
  const graphMin = 0.5
  const graphMax = 4.0

  it("returns height (bottom) at graphMin", () => {
    expect(graphYForRate(graphMin, graphMin, graphMax, height)).toBeCloseTo(height)
  })

  it("returns 0 (top) at graphMax", () => {
    expect(graphYForRate(graphMax, graphMin, graphMax, height)).toBeCloseTo(0)
  })

  it("returns midpoint at mid-rate", () => {
    const midRate = (graphMin + graphMax) / 2
    expect(graphYForRate(midRate, graphMin, graphMax, height)).toBeCloseTo(height / 2)
  })

  it("clamps rates below graphMin", () => {
    expect(graphYForRate(0, graphMin, graphMax, height)).toBeCloseTo(height)
  })

  it("clamps rates above graphMax", () => {
    expect(graphYForRate(10, graphMin, graphMax, height)).toBeCloseTo(0)
  })
})
