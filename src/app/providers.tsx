"use client"

import { ThemeProvider, Theme } from "@/components/theme-provider"
import { TempoSyncProvider } from "@/contexts/temposync-context"
import { ReactNode } from "react"

export function Providers({
  children,
  defaultTheme = "light",
}: {
  children: ReactNode
  defaultTheme?: Theme
}) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      <TempoSyncProvider>{children}</TempoSyncProvider>
    </ThemeProvider>
  )
}
