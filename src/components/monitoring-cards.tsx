"use client"

import { LiveWaveform } from "@/components/ui/live-waveform"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTempoSync } from "@/contexts/temposync-context"

export function WaveformCard() {
  const { isListening } = useTempoSync()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Microphone</CardTitle>
      </CardHeader>
      <CardContent>
        <LiveWaveform
          active={isListening}
          processing={false}
          mode="static"
          height={80}
          barWidth={3}
          barGap={1}
          barHeight={4}
          sensitivity={2.5}
          smoothingTimeConstant={0.6}
          fftSize={256}
          fadeEdges
        />
      </CardContent>
    </Card>
  )
}

export function SpeedGraphCard() {
  const { speedGraphRef } = useTempoSync()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Playback Speed</CardTitle>
      </CardHeader>
      <CardContent>
        <canvas ref={speedGraphRef} className="w-full h-24 rounded" />
      </CardContent>
    </Card>
  )
}

export function StatsCard() {
  const { displayRate, energy } = useTempoSync()

  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Speed
          </p>
          <p className="text-2xl font-bold font-mono text-foreground tabular-nums mt-1">
            {displayRate.toFixed(2)}×
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Energy
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-2 w-full max-w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all duration-75"
                style={{
                  width: `${Math.min(100, energy * 300)}%`,
                }}
              />
            </div>
            <span className="text-xs font-mono tabular-nums text-muted-foreground w-8 text-right">
              {(energy * 100).toFixed(0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
