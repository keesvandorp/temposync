"use client"

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useEnergyDetection } from "@/hooks/use-energy-detection"
import type { VideoItem } from "@/components/video-playlist"

// ── Constants ──────────────────────────────────────────────

export const DEFAULT_BAND_WEIGHTS = [1.0, 0.9, 0.7, 0.5, 0.3, 0.15]
export const BAND_LABELS = ["Sub", "Bass", "Low", "Mid", "High", "Air"]
export const BAND_HZ = ["<60", "250", "500", "2k", "6k", "6k+"]

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

interface Settings {
  energySensitivity: number
  micGain: number
  smoothing: number
  easingMode: EasingMode
  minSpeed: number
  maxSpeed: number
  autoAdvance: boolean
  autoAdvanceSeconds: number
  bandWeights: number[]
}

const DEFAULT_SETTINGS: Settings = {
  energySensitivity: 3.0,
  micGain: 1.0,
  smoothing: 0.5,
  easingMode: "outCubic",
  minSpeed: 0.5,
  maxSpeed: 4.0,
  autoAdvance: false,
  autoAdvanceSeconds: 30,
  bandWeights: DEFAULT_BAND_WEIGHTS,
}

function loadSettings(): Settings {
  if (typeof document === "undefined") return DEFAULT_SETTINGS
  try {
    const match = document.cookie.match(/(?:^|; )settings=([^;]*)/)
    if (match)
      return { ...DEFAULT_SETTINGS, ...JSON.parse(decodeURIComponent(match[1])) }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS
}

function saveSettings(s: Settings) {
  const expires = new Date(Date.now() + 365 * 864e5).toUTCString()
  document.cookie = `settings=${encodeURIComponent(JSON.stringify(s))}; expires=${expires}; path=/; SameSite=Lax`
}

let nextId = 0
function genId() {
  return `vid-${++nextId}-${Date.now()}`
}

// ── Context shape ──────────────────────────────────────────

interface TempoSyncContextValue {
  // Playlist
  playlist: VideoItem[]
  currentId: string | null
  setCurrentId: (id: string | null) => void
  currentVideo: VideoItem | null
  currentIndex: number
  navigate: (direction: -1 | 1) => void
  addFiles: (files: FileList | File[]) => void
  handleRemove: (id: string) => void
  handleReorder: (items: VideoItem[]) => void
  openFilePicker: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>

  // Settings
  energySensitivity: number
  setEnergySensitivity: (v: number) => void
  micGain: number
  setMicGain: (v: number) => void
  smoothing: number
  setSmoothing: (v: number) => void
  easingMode: EasingMode
  setEasingMode: (v: EasingMode) => void
  minSpeed: number
  setMinSpeed: (v: number) => void
  maxSpeed: number
  setMaxSpeed: (v: number) => void
  autoAdvance: boolean
  setAutoAdvance: (v: boolean) => void
  autoAdvanceSeconds: number
  setAutoAdvanceSeconds: (v: number) => void
  autoAdvanceCountdown: number
  bandWeights: number[]
  setBandWeights: (v: number[]) => void

  // Audio / energy
  isListening: boolean
  toggleListening: () => Promise<void>
  energy: number
  isActive: boolean
  displayRate: number
  setDisplayRate: (v: number) => void
  videoProgress: { currentTime: number; duration: number }
  setVideoProgress: (v: { currentTime: number; duration: number }) => void

  // Refs shared with the video player render loop
  speedGraphRef: React.RefObject<HTMLCanvasElement | null>
  smoothingRef: React.RefObject<number>
  easingModeRef: React.RefObject<EasingMode>
  minSpeedRef: React.RefObject<number>
  maxSpeedRef: React.RefObject<number>
  energyRef: React.RefObject<number>
  isActiveRef: React.RefObject<boolean>
  bandEnergiesRef: React.RefObject<number[]>
}

const TempoSyncContext = createContext<TempoSyncContextValue | null>(null)

export function useTempoSync() {
  const ctx = useContext(TempoSyncContext)
  if (!ctx) throw new Error("useTempoSync must be used within TempoSyncProvider")
  return ctx
}

// ── Provider ───────────────────────────────────────────────

export function TempoSyncProvider({ children }: { children: ReactNode }) {
  // Settings state
  const [energySensitivity, setEnergySensitivity] = useState(DEFAULT_SETTINGS.energySensitivity)
  const [micGain, setMicGain] = useState(DEFAULT_SETTINGS.micGain)
  const [smoothing, setSmoothing] = useState(DEFAULT_SETTINGS.smoothing)
  const [easingMode, setEasingMode] = useState<EasingMode>(DEFAULT_SETTINGS.easingMode)
  const [minSpeed, setMinSpeed] = useState(DEFAULT_SETTINGS.minSpeed)
  const [maxSpeed, setMaxSpeed] = useState(DEFAULT_SETTINGS.maxSpeed)
  const [autoAdvance, setAutoAdvance] = useState(DEFAULT_SETTINGS.autoAdvance)
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(DEFAULT_SETTINGS.autoAdvanceSeconds)
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(0)
  const [bandWeights, setBandWeights] = useState(DEFAULT_SETTINGS.bandWeights)

  // Playlist state
  const [playlist, setPlaylist] = useState<VideoItem[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)

  // Audio state
  const [isListening, setIsListening] = useState(false)
  const [displayRate, setDisplayRate] = useState(1)
  const [videoProgress, setVideoProgress] = useState({ currentTime: 0, duration: 0 })
  const streamRef = useRef<MediaStream | null>(null)
  const settingsLoaded = useRef(false)

  // Keep a ref that's always in sync so navigate (and the auto-advance
  // timer) always sees the very latest playlist without needing to nest
  // setCurrentId inside setPlaylist.
  const playlistRef = useRef<VideoItem[]>([])
  playlistRef.current = playlist

  // Shared refs for the render loop
  const speedGraphRef = useRef<HTMLCanvasElement | null>(null)
  const smoothingRef = useRef(smoothing)
  smoothingRef.current = smoothing
  const easingModeRef = useRef<EasingMode>(easingMode)
  easingModeRef.current = easingMode
  const minSpeedRef = useRef(minSpeed)
  minSpeedRef.current = minSpeed
  const maxSpeedRef = useRef(maxSpeed)
  maxSpeedRef.current = maxSpeed

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ── Hydrate from cookie ──
  useEffect(() => {
    const s = loadSettings()
    setEnergySensitivity(s.energySensitivity)
    setMicGain(s.micGain)
    setSmoothing(s.smoothing)
    if (s.easingMode && EASING_MODES.includes(s.easingMode)) setEasingMode(s.easingMode)
    setMinSpeed(s.minSpeed)
    setMaxSpeed(s.maxSpeed)
    setAutoAdvance(s.autoAdvance)
    setAutoAdvanceSeconds(s.autoAdvanceSeconds)
    setBandWeights(s.bandWeights)
    settingsLoaded.current = true

    const id1 = genId()
    const id2 = genId()
    setPlaylist([
      { id: id1, name: "welcome.mp4", url: "/videos/welcome.mp4" },
      { id: id2, name: "eagle.mp4", url: "/videos/eagle.mp4" },
    ])
    setCurrentId(id1)
  }, [])

  // ── Persist to cookie ──
  useEffect(() => {
    if (!settingsLoaded.current) return
    saveSettings({
      energySensitivity,
      micGain,
      smoothing,
      easingMode,
      minSpeed,
      maxSpeed,
      autoAdvance,
      autoAdvanceSeconds,
      bandWeights,
    })
  }, [energySensitivity, micGain, smoothing, easingMode, minSpeed, maxSpeed, autoAdvance, autoAdvanceSeconds, bandWeights])

  // ── Energy detection ──
  const energyOptions = useMemo(
    () => ({ energySensitivity, micGain, bandWeights }),
    [energySensitivity, micGain, bandWeights],
  )

  const { isActive, energy, bandEnergiesRef, attachStream, detach } = useEnergyDetection(energyOptions)

  const energyRef = useRef(energy)
  energyRef.current = energy
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive

  // ── Derived ──
  const currentVideo = useMemo(
    () => playlist.find((v) => v.id === currentId) ?? null,
    [playlist, currentId],
  )
  const currentIndex = useMemo(
    () => playlist.findIndex((v) => v.id === currentId),
    [playlist, currentId],
  )

  // ── Playlist actions ──

  const navigate = useCallback((direction: -1 | 1) => {
    setCurrentId((curId) => {
      const pl = playlistRef.current
      if (pl.length === 0) return curId
      const idx = pl.findIndex((v) => v.id === curId)
      if (idx === -1) return curId
      const next = (idx + direction + pl.length) % pl.length
      return pl[next].id
    })
  }, [])

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: VideoItem[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files instanceof FileList ? files[i] : files[i]
      if (!file.type.startsWith("video/")) continue
      const id = genId()
      newItems.push({ id, name: file.name, url: URL.createObjectURL(file) })
    }
    if (newItems.length === 0) return
    setPlaylist((prev) => {
      const updated = [...prev, ...newItems]
      // Auto-select first item when playlist was empty
      setCurrentId((cur) => cur ?? newItems[0].id)
      return updated
    })
  }, [])

  const handleRemove = useCallback((id: string) => {
    setPlaylist((prev) => {
      const item = prev.find((v) => v.id === id)
      if (item && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url)
      const updated = prev.filter((v) => v.id !== id)
      setCurrentId((curId) => {
        if (id !== curId) return curId
        const oldIdx = prev.findIndex((v) => v.id === id)
        const nextItem = updated[Math.min(oldIdx, updated.length - 1)]
        return nextItem?.id ?? null
      })
      return updated
    })
  }, [])

  const handleReorder = useCallback((items: VideoItem[]) => {
    setPlaylist(items)
  }, [])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // ── Keyboard nav ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        navigate(-1)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        navigate(1)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [navigate])

  // ── Auto-advance timer ──
  useEffect(() => {
    if (!autoAdvance || autoAdvanceSeconds <= 0) {
      setAutoAdvanceCountdown(0)
      return
    }
    const deadline = Date.now() + autoAdvanceSeconds * 1000
    setAutoAdvanceCountdown(autoAdvanceSeconds)
    const tick = setInterval(() => {
      const remaining = Math.max(0, (deadline - Date.now()) / 1000)
      setAutoAdvanceCountdown(remaining)
      if (remaining <= 0) {
        navigate(1)
      }
    }, 250)
    return () => clearInterval(tick)
  }, [autoAdvance, autoAdvanceSeconds, navigate, currentId])

  // ── Mic toggle ──
  const toggleListening = useCallback(async () => {
    if (isListening) {
      detach()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setIsListening(false)
    } else {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          alert("Microphone access requires HTTPS. Please use a secure connection.")
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })
        streamRef.current = stream
        attachStream(stream)
        setIsListening(true)
      } catch (error) {
        console.error("Failed to access microphone:", error)
      }
    }
  }, [isListening, attachStream, detach])

  // ── Context value ──
  const value = useMemo<TempoSyncContextValue>(
    () => ({
      playlist,
      currentId,
      setCurrentId,
      currentVideo,
      currentIndex,
      navigate,
      addFiles,
      handleRemove,
      handleReorder,
      openFilePicker,
      fileInputRef,
      energySensitivity,
      setEnergySensitivity,
      micGain,
      setMicGain,
      smoothing,
      setSmoothing,
      easingMode,
      setEasingMode,
      minSpeed,
      setMinSpeed,
      maxSpeed,
      setMaxSpeed,
      autoAdvance,
      setAutoAdvance,
      autoAdvanceSeconds,
      setAutoAdvanceSeconds,
      autoAdvanceCountdown,
      bandWeights,
      setBandWeights,
      isListening,
      toggleListening,
      energy,
      isActive,
      displayRate,
      setDisplayRate,
      videoProgress,
      setVideoProgress,
      speedGraphRef,
      smoothingRef,
      easingModeRef,
      minSpeedRef,
      maxSpeedRef,
      energyRef,
      isActiveRef,
      bandEnergiesRef,
    }),
    [
      playlist,
      currentId,
      currentVideo,
      currentIndex,
      navigate,
      addFiles,
      handleRemove,
      openFilePicker,
      energySensitivity,
      micGain,
      smoothing,
      easingMode,
      minSpeed,
      maxSpeed,
      autoAdvance,
      autoAdvanceSeconds,
      autoAdvanceCountdown,
      bandWeights,
      isListening,
      toggleListening,
      energy,
      isActive,
      displayRate,
      videoProgress,
    ],
  )

  return (
    <TempoSyncContext.Provider value={value}>
      {children}
      {/* Hidden file input shared across components */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files)
          e.target.value = ""
        }}
      />
    </TempoSyncContext.Provider>
  )
}
