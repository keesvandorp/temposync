import { render, type RenderOptions } from "@testing-library/react"
import { type ReactElement, createRef } from "react"
import { TempoSyncContext } from "@/contexts/temposync-context"
import type { EasingMode } from "@/lib/easing"

// Minimal default values matching TempoSyncContextValue
const defaultContext = {
  // Playlist
  playlist: [],
  currentId: null,
  setCurrentId: () => {},
  currentVideo: null,
  currentIndex: -1,
  navigate: () => {},
  addFiles: () => {},
  handleRemove: () => {},
  handleReorder: () => {},
  openFilePicker: () => {},
  fileInputRef: createRef<HTMLInputElement>(),

  // Settings
  energySensitivity: 1,
  setEnergySensitivity: () => {},
  micGain: 1,
  setMicGain: () => {},
  smoothing: 0.5,
  setSmoothing: () => {},
  easingMode: "easeInOutCubic" as EasingMode,
  setEasingMode: () => {},
  minSpeed: 0.25,
  setMinSpeed: () => {},
  maxSpeed: 2,
  setMaxSpeed: () => {},
  autoAdvance: true,
  setAutoAdvance: () => {},
  autoAdvanceSeconds: 5,
  setAutoAdvanceSeconds: () => {},
  autoAdvanceCountdown: 0,
  bandWeights: [1, 1, 1, 1],
  setBandWeights: () => {},

  // Audio / energy
  isListening: false,
  micStream: null,
  toggleListening: async () => {},
  energy: 0,
  isActive: false,
  displayRate: 1,
  setDisplayRate: () => {},
  videoProgress: { currentTime: 0, duration: 0 },
  setVideoProgress: () => {},

  // Refs
  speedGraphRef: createRef<HTMLCanvasElement>(),
  smoothingRef: createRef<number>(),
  easingModeRef: createRef<EasingMode>(),
  minSpeedRef: createRef<number>(),
  maxSpeedRef: createRef<number>(),
  energyRef: createRef<number>(),
  isActiveRef: createRef<boolean>(),
  bandEnergiesRef: createRef<number[]>(),
}

type ContextOverrides = Partial<typeof defaultContext>

export function renderWithContext(
  ui: ReactElement,
  { contextOverrides, ...options }: RenderOptions & { contextOverrides?: ContextOverrides } = {},
) {
  const value = { ...defaultContext, ...contextOverrides }
  return render(
    <TempoSyncContext.Provider value={value as any}>
      {ui}
    </TempoSyncContext.Provider>,
    options,
  )
}
