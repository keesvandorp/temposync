import { describe, it, expect } from "vitest"
import { applyEasing, EASING_MODES, type EasingMode } from "@/lib/easing"

describe("applyEasing", () => {
  // All modes should satisfy f(0) = 0 and f(1) = 1
  for (const mode of EASING_MODES) {
    it(`${mode}: f(0) ≈ 0 and f(1) ≈ 1`, () => {
      expect(applyEasing(0, mode)).toBeCloseTo(0, 10)
      expect(applyEasing(1, mode)).toBeCloseTo(1, 10)
    })
  }

  // All modes should be monotonically non-decreasing
  for (const mode of EASING_MODES) {
    it(`${mode}: monotonically non-decreasing`, () => {
      const steps = 100
      let prev = applyEasing(0, mode)
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const val = applyEasing(t, mode)
        expect(val).toBeGreaterThanOrEqual(prev - 1e-10)
        prev = val
      }
    })
  }

  // Output should stay in [0, 1] for inputs in [0, 1]
  for (const mode of EASING_MODES) {
    it(`${mode}: output in [0, 1]`, () => {
      for (let i = 0; i <= 100; i++) {
        const val = applyEasing(i / 100, mode)
        expect(val).toBeGreaterThanOrEqual(-1e-10)
        expect(val).toBeLessThanOrEqual(1 + 1e-10)
      }
    })
  }

  // Clamping: inputs outside [0, 1] should be clamped
  it("clamps negative input to 0", () => {
    expect(applyEasing(-0.5, "linear")).toBeCloseTo(0)
  })

  it("clamps input > 1 to 1", () => {
    expect(applyEasing(1.5, "linear")).toBeCloseTo(1)
  })

  // Specific known values
  it("linear: f(0.5) = 0.5", () => {
    expect(applyEasing(0.5, "linear")).toBeCloseTo(0.5)
  })

  it("smoothstep: f(0.5) = 0.5", () => {
    // 0.5² × (3 - 2×0.5) = 0.25 × 2 = 0.5
    expect(applyEasing(0.5, "smoothstep")).toBeCloseTo(0.5)
  })

  it("inQuad: f(0.5) = 0.25", () => {
    expect(applyEasing(0.5, "inQuad")).toBeCloseTo(0.25)
  })

  it("outQuad: f(0.5) = 0.75", () => {
    // 0.5 × (2 - 0.5) = 0.75
    expect(applyEasing(0.5, "outQuad")).toBeCloseTo(0.75)
  })

  it("inCubic: f(0.5) = 0.125", () => {
    expect(applyEasing(0.5, "inCubic")).toBeCloseTo(0.125)
  })

  // Symmetry: inOut variants should pass through 0.5 at t=0.5
  for (const mode of ["inOutQuad", "inOutCubic", "inOutSine", "inOutExpo"] as EasingMode[]) {
    it(`${mode}: f(0.5) ≈ 0.5`, () => {
      expect(applyEasing(0.5, mode)).toBeCloseTo(0.5, 5)
    })
  }

  // Expo special cases
  it("inExpo: f(0) = 0 exactly (special case)", () => {
    expect(applyEasing(0, "inExpo")).toBe(0)
  })

  it("outExpo: f(1) = 1 exactly (special case)", () => {
    expect(applyEasing(1, "outExpo")).toBe(1)
  })

  it("inOutExpo: f(0) = 0 and f(1) = 1 exactly", () => {
    expect(applyEasing(0, "inOutExpo")).toBe(0)
    expect(applyEasing(1, "inOutExpo")).toBe(1)
  })
})
