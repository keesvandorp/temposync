"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { VideoPlayer } from "@/components/video-player"
import { PlaylistCard } from "@/components/playlist-card"
import { ListenButton } from "@/components/listen-button"
import { WaveformCard, SpeedGraphCard, StatsCard } from "@/components/monitoring-cards"
import { SettingsCard } from "@/components/settings-card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-3xl space-y-6">
          <VideoPlayer />
          <div className="flex gap-2">
            <ListenButton />
            <ThemeToggle />
          </div>
          <PlaylistCard />
          <WaveformCard />
          <SpeedGraphCard />
          <StatsCard />
          <SettingsCard />
        </div>
      </div>
  )
}
