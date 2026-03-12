"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import {
  useTempoSync,
  DEFAULT_BAND_WEIGHTS,
  BAND_LABELS,
  BAND_HZ,
} from "@/contexts/temposync-context"

export function SettingsCard() {
  const {
    smoothing,
    setSmoothing,
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
              {(smoothing * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[smoothing]}
            onValueChange={(v) =>
              setSmoothing(Array.isArray(v) ? v[0] : v)
            }
            min={0}
            max={0.995}
            step={0.005}
          />
          <p className="text-xs text-muted-foreground">
            How much the speed is eased. 0% = instant, 99% = very slow/smooth.
          </p>
        </div>

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
                <div className="h-24 flex items-center">
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
