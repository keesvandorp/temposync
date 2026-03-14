// ── Easing modes ───────────────────────────────────────────

export const EASING_MODES = [
  "linear",
  "smoothstep",
  "inQuad",
  "outQuad",
  "inOutQuad",
  "inCubic",
  "outCubic",
  "inOutCubic",
  "inSine",
  "outSine",
  "inOutSine",
  "inExpo",
  "outExpo",
  "inOutExpo",
] as const

export type EasingMode = (typeof EASING_MODES)[number]

const easingFns: Record<EasingMode, (t: number) => number> = {
  linear: (t) => t,
  smoothstep: (t) => t * t * (3 - 2 * t),
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => { const u = t - 1; return u * u * u + 1 },
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  inSine: (t) => 1 - Math.cos(t * (Math.PI / 2)),
  outSine: (t) => Math.sin(t * (Math.PI / 2)),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) => {
    if (t === 0 || t === 1) return t
    return t < 0.5
      ? Math.pow(2, 10 * (2 * t - 1)) / 2
      : (2 - Math.pow(2, -10 * (2 * t - 1))) / 2
  },
}

export function applyEasing(t: number, mode: EasingMode): number {
  return easingFns[mode](Math.max(0, Math.min(1, t)))
}
