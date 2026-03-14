// ── Smoothing and speed mapping ────────────────────────────

/**
 * Compute time-constant τ from a 0–1 smoothing slider value.
 * Maps to 0.01s (instant) through ~5s (very slow).
 */
export function smoothingTau(slider: number): number {
  return 0.01 + slider * slider * 5
}

/**
 * Exponential smoothing alpha from time delta and time constant.
 */
export function smoothingAlpha(dt: number, tau: number): number {
  return Math.exp(-dt / tau)
}

/**
 * Apply exponential smoothing toward a target speed, decaying from a midpoint.
 */
export function smoothSpeed(
  current: number,
  target: number,
  midSpeed: number,
  alpha: number,
): number {
  const decayed = midSpeed + (current - midSpeed) * alpha
  return decayed + (target - decayed) * (1 - alpha)
}

/**
 * Map 0–1 eased energy into a playback speed in [minSpeed, maxSpeed].
 */
export function mapEnergyToSpeed(
  easedEnergy: number,
  minSpeed: number,
  maxSpeed: number,
): number {
  return minSpeed + easedEnergy * (maxSpeed - minSpeed)
}

/**
 * Map a playback rate to a Y pixel coordinate for the speed graph.
 */
export function graphYForRate(
  rate: number,
  graphMin: number,
  graphMax: number,
  height: number,
): number {
  return (
    height -
    ((Math.min(graphMax, Math.max(graphMin, rate)) - graphMin) /
      (graphMax - graphMin)) *
      height
  )
}
