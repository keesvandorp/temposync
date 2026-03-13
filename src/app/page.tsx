"use client"

import Image from "next/image"
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

          <footer className="flex flex-col items-center gap-3 pt-8 pb-4 text-center">
            <div className="flex items-center">
              <Image
                src="/apple-icon.png"
                alt="TempoSync"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-lg font-semibold">TempoSync</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time video tempo control driven by live musical energy.
            </p>
            <p className="text-xs text-muted-foreground">
              Open source under the{" "}
              <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                MIT License
              </a>
              {" "}by{" "}
              <a
                href="https://github.com/keesvandorp/temposync"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Kees van Dorp
              </a>
            </p>
          </footer>
        </div>
      </div>
  )
}
