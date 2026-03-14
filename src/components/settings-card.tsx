"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Slider } from "@/components/ui/slider"
import { useTempoSync } from "@/hooks/use-tempo-sync"
import {
  DEFAULT_BAND_WEIGHTS,
  BAND_LABELS,
  BAND_HZ,
} from "@/contexts/temposync-context"
import { EASING_MODES, type EasingMode } from "@/lib/easing"
import { ChevronsUpDown } from "lucide-react"

function BandMeter({ index }: { index: number }) {
  const { bandEnergiesRef, isActive } = useTempoSync()
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive) return
    let raf: number
    const tick = () => {
      const level = bandEnergiesRef.current[index] ?? 0
      if (barRef.current) {
        barRef.current.style.height = `${level * 100}%`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isActive, bandEnergiesRef, index])

  if (!isActive) return null

  return (
    <div className="w-1.5 h-24 rounded-full bg-muted overflow-hidden flex flex-col justify-end">
      <div
        ref={barRef}
        className="w-full rounded-full bg-primary/60 transition-none"
        style={{ height: "0%" }}
      />
    </div>
  )
}

function EasingPicker({
  easingMode,
  setEasingMode,
}: {
  easingMode: EasingMode
  setEasingMode: (mode: EasingMode) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2 p-4 py-8">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Easing Curve</label>
      </div>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen(true)}
      >
        {easingMode}
        <ChevronsUpDown/>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search easing curves..." />
          <CommandList>
            <CommandEmpty>No easing curve found.</CommandEmpty>
            <CommandGroup>
              {EASING_MODES.map((mode) => (
                <CommandItem
                  key={mode}
                  value={mode}
                  data-checked={mode === easingMode}
                  onSelect={() => {
                    setEasingMode(mode as EasingMode)
                    setOpen(false)
                  }}
                >
                  {mode}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
      <p className="text-xs text-muted-foreground">
        How energy maps to speed. &quot;linear&quot; = proportional, &quot;outCubic&quot; = responsive to soft sounds, &quot;inCubic&quot; = only reacts to loud peaks.
      </p>
    </div>
  )
}

export function SettingsCard() {
  const {
    smoothing,
    setSmoothing,
    easingMode,
    setEasingMode,
    minSpeed,
    setMinSpeed,
    maxSpeed,
    setMaxSpeed,
    energySensitivity,
    setEnergySensitivity,
    bandWeights,
    setBandWeights,
    micGain,
    setMicGain,
  } = useTempoSync()

  // Display response time: τ = 0.01 + smoothing² × 5
  const responseTime = 0.01 + smoothing * smoothing * 5

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col p-0 divide-y">
        {/* Smoothing */}
        <div className="space-y-4 p-4 py-8">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Smoothing</label>
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {responseTime < 1 ? `${(responseTime * 1000).toFixed(0)}ms` : `${responseTime.toFixed(1)}s`}
            </span>
          </div>
          <Slider
            value={[smoothing]}
            onValueChange={(v) =>
              setSmoothing(Array.isArray(v) ? v[0] : v)
            }
            min={0}
            max={1}
            step={0.01}
          />
          <p className="text-xs text-muted-foreground">
            Response time for speed changes. Left = instant, right = slow/smooth.
          </p>
        </div>

        {/* Easing Mode */}
        <EasingPicker easingMode={easingMode} setEasingMode={setEasingMode} />

        {/* Speed Range */}
        <div className="space-y-2 p-4 py-8">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Speed Range</label>
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {minSpeed.toFixed(1)}× – {maxSpeed.toFixed(1)}×
            </span>
          </div>
          <Slider
            value={[minSpeed, maxSpeed]}
            onValueChange={(v) => {
              const vals = Array.isArray(v) ? v : [v]
              setMinSpeed(vals[0])
              setMaxSpeed(vals[1])
            }}
            min={0.1}
            max={8}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">
            Floor and ceiling for playback speed.
          </p>
        </div>

        {/* Energy Sensitivity */}
        <div className="space-y-2 p-4 py-8">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Energy Sensitivity</label>
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {energySensitivity.toFixed(1)}×
            </span>
          </div>
          <Slider
            value={[energySensitivity]}
            onValueChange={(v) =>
              setEnergySensitivity(Array.isArray(v) ? v[0] : v)
            }
            min={0.5}
            max={10}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">
            How strongly the audio energy affects playback speed. Higher = more
            responsive to volume changes.
          </p>
        </div>

        {/* Band Weights Equalizer */}
        <div className="space-y-2 p-4 py-8">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Frequency Weights</label>
            <button
              onClick={() => setBandWeights(DEFAULT_BAND_WEIGHTS)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="flex items-end gap-2 justify-between px-1">
            {bandWeights.map((w, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 flex-1"
              >
                <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                  {w.toFixed(2)}
                </span>
                <div className="h-24 flex items-center gap-0.5">
                  <BandMeter index={i} />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={w}
                    onChange={(e) => {
                      const next = [...bandWeights]
                      next[i] = parseFloat(e.target.value)
                      setBandWeights(next)
                    }}
                    className="w-24 accent-primary"
                    style={{
                      writingMode: "vertical-lr" as React.CSSProperties["writingMode"],
                      direction: "rtl",
                      height: "96px",
                      width: "20px",
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium">
                  {BAND_LABELS[i]}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {BAND_HZ[i]}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            How much each frequency band contributes to the energy signal.
          </p>
        </div>

        {/* Mic Volume */}
        <div className="space-y-2 p-4 py-8">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Mic Volume</label>
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {micGain.toFixed(1)}×
            </span>
          </div>
          <Slider
            value={[micGain]}
            onValueChange={(v) => setMicGain(Array.isArray(v) ? v[0] : v)}
            min={0.1}
            max={5}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">
            Boost or reduce microphone input level. Increase if in a quiet
            environment, decrease if too loud.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
