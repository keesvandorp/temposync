"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface EnergyDetectionOptions {
  minSpeed: number
  maxSpeed: number
  smoothing: number
  energySensitivity: number
  micGain: number
  bandWeights: number[]
}

interface EnergyDetectionResult {
  playbackRate: number
  isActive: boolean
  energy: number
  attachStream: (stream: MediaStream) => void
  detach: () => void
}

export function useEnergyDetection(
  options: Partial<EnergyDetectionOptions> = {}
): EnergyDetectionResult {
  const {
    minSpeed = 0.25,
    maxSpeed = 4.0,
    smoothing = 0.85,
    energySensitivity = 3.0,
    micGain = 1.0,
    bandWeights = [1.0, 0.9, 0.7, 0.5, 0.3, 0.15],
  } = options

  const [playbackRate, setPlaybackRate] = useState(1)
  const [isActive, setIsActive] = useState(false)
  const [energy, setEnergy] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const smoothedRateRef = useRef<number>(1)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  // Store options in refs so detect() never needs to be recreated
  const optionsRef = useRef({ minSpeed, maxSpeed, smoothing, energySensitivity, bandWeights })
  optionsRef.current = { minSpeed, maxSpeed, smoothing, energySensitivity, bandWeights }

  // Track a running baseline (noise floor) that adapts slowly
  const baselineRef = useRef<number>(0)
  const prevSpectrumRef = useRef<Float32Array<ArrayBuffer> | null>(null)

  const detect = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const bufferLength = analyser.frequencyBinCount
    if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
      dataArrayRef.current = new Uint8Array(bufferLength)
    }
    const dataArray = dataArrayRef.current
    analyser.getByteFrequencyData(dataArray)

    // Initialize previous spectrum if needed
    if (!prevSpectrumRef.current || prevSpectrumRef.current.length !== bufferLength) {
      prevSpectrumRef.current = new Float32Array(bufferLength)
      for (let i = 0; i < bufferLength; i++) {
        prevSpectrumRef.current[i] = dataArray[i] / 255
      }
    }
    const prevSpectrum = prevSpectrumRef.current

    // Compute per-bin normalized values and spectral flux (positive differences only)
    // Split into sub-bass, bass, low-mid, mid, high-mid, high bands
    // with perceptual weighting (lower frequencies matter more for music energy)
    const sampleRate = audioContextRef.current?.sampleRate ?? 44100
    const binHz = sampleRate / (analyser.fftSize)

    // Band boundaries in Hz and their perceptual weights
    const bw = optionsRef.current.bandWeights
    const bands = [
      { maxHz: 60,   weight: bw[0] ?? 1.0  }, // sub-bass
      { maxHz: 250,  weight: bw[1] ?? 0.9  }, // bass
      { maxHz: 500,  weight: bw[2] ?? 0.7  }, // low-mid
      { maxHz: 2000, weight: bw[3] ?? 0.5  }, // mid
      { maxHz: 6000, weight: bw[4] ?? 0.3  }, // high-mid
      { maxHz: Infinity, weight: bw[5] ?? 0.15 }, // high / air
    ]

    let weightedFlux = 0
    let weightedLevel = 0
    let totalWeight = 0
    let bandIdx = 0

    for (let i = 0; i < bufferLength; i++) {
      const hz = i * binHz
      // Advance band if needed
      while (bandIdx < bands.length - 1 && hz > bands[bandIdx].maxHz) {
        bandIdx++
      }
      const w = bands[bandIdx].weight

      const current = dataArray[i] / 255
      const prev = prevSpectrum[i]

      // Spectral flux: only count increases (onset energy, not decay)
      const diff = current - prev
      if (diff > 0) {
        weightedFlux += diff * w
      }

      // Weighted level (overall energy)
      weightedLevel += current * w
      totalWeight += w

      // Store for next frame
      prevSpectrum[i] = current
    }

    // Normalize
    const avgLevel = totalWeight > 0 ? weightedLevel / totalWeight : 0
    const avgFlux = totalWeight > 0 ? weightedFlux / totalWeight : 0

    // Combine: level gives sustained energy, flux gives onset/busyness detection
    // Weight level higher for more dynamic range on sustained passages
    const combined = avgLevel * 0.65 + avgFlux * 15.0 * 0.35
    const fullEnergy = Math.min(1, Math.max(0, combined))

    const { minSpeed: min, maxSpeed: max, smoothing: sm, energySensitivity: es } = optionsRef.current

    // Adaptive noise floor — tracks only ambient silence (mic hiss, room tone)
    // Rises very slowly so music isn't treated as noise
    // Drops faster so silence is recognized quickly
    const baseline = baselineRef.current
    const baselineAlpha = fullEnergy > baseline ? 0.0005 : 0.02
    baselineRef.current = baseline + (fullEnergy - baseline) * baselineAlpha

    // Subtract the noise floor so silence → 0
    const above = Math.max(0, fullEnergy - baselineRef.current)
    // No normalization against headroom — use absolute energy above floor
    // This preserves the full dynamic range of the music
    const clamped = Math.min(1, above * Math.max(0.1, es))

    // Export the processed energy (noise-floor subtracted, sensitivity scaled)
    setEnergy(clamped)

    // Ease-in-out (smoothstep) for natural acceleration/deceleration
    const eased = clamped * clamped * (3 - 2 * clamped)

    const targetRate = min + eased * (max - min)
    const clampedTarget = Math.max(min, Math.min(max, targetRate))

    const prev = smoothedRateRef.current
    // Asymmetric smoothing: fast fall-off when energy drops, smooth rise when increasing
    const effectiveSmoothing = clampedTarget < prev ? sm * 0.3 : sm
    const smoothed = prev * effectiveSmoothing + clampedTarget * (1 - effectiveSmoothing)
    smoothedRateRef.current = smoothed

    setPlaybackRate(smoothed)

    animFrameRef.current = requestAnimationFrame(detect)
  }, []) // stable — reads options from ref

  const attachStream = useCallback((stream: MediaStream) => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close()
    }

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 4096
    analyser.smoothingTimeConstant = 0.3

    const source = audioContext.createMediaStreamSource(stream)
    const gainNode = audioContext.createGain()
    gainNode.gain.value = micGain
    source.connect(gainNode)
    gainNode.connect(analyser)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    gainNodeRef.current = gainNode
    dataArrayRef.current = null
    prevSpectrumRef.current = null
    smoothedRateRef.current = 1
    baselineRef.current = 0

    setIsActive(true)
  }, [micGain])

  const detach = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    gainNodeRef.current = null
    dataArrayRef.current = null
    prevSpectrumRef.current = null
    baselineRef.current = 0
    setIsActive(false)
    setPlaybackRate(1)
    setEnergy(0)
    smoothedRateRef.current = 1
  }, [])

  // Update gain when micGain changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micGain
    }
  }, [micGain])

  // Run detection loop when active
  useEffect(() => {
    if (isActive && analyserRef.current) {
      animFrameRef.current = requestAnimationFrame(detect)
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [isActive, detect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detach()
    }
  }, [detach])

  return {
    playbackRate,
    isActive,
    energy,
    attachStream,
    detach,
  }
}

