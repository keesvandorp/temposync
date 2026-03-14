import { useContext } from "react"
import { TempoSyncContext } from "@/contexts/temposync-context"

export function useTempoSync() {
  const ctx = useContext(TempoSyncContext)
  if (!ctx) throw new Error("useTempoSync must be used within TempoSyncProvider")
  return ctx
}
