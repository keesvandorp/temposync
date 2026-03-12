"use client"

import { Button } from "@/components/ui/button"
import { Mic, StopCircle } from "lucide-react"
import { useTempoSync } from "@/contexts/temposync-context"

export function ListenButton() {
  const { isListening, toggleListening } = useTempoSync()

  return (
    <Button
      onClick={toggleListening}
      variant={isListening ? "destructive" : "default"}
      className="flex-1"
    >
      {isListening ? (
        <>
          <StopCircle />
          Stop Listening
        </>
      ) : (
        <>
          <Mic />
          Start Listening
        </>
      )}
    </Button>
  )
}
