"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { VideoPlaylist } from "@/components/video-playlist"
import { Plus } from "lucide-react"
import { useTempoSync } from "@/hooks/use-tempo-sync"

export function PlaylistCard() {
  const {
    playlist,
    currentId,
    setCurrentId,
    handleReorder,
    handleRemove,
    openFilePicker,
    autoAdvance,
    setAutoAdvance,
    autoAdvanceSeconds,
    setAutoAdvanceSeconds,
  } = useTempoSync()

  if (playlist.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Playlist</CardTitle>
      </CardHeader>
      <CardContent>
        <VideoPlaylist
          items={playlist}
          currentId={currentId}
          onReorder={handleReorder}
          onSelect={setCurrentId}
          onRemove={handleRemove}
        />
      </CardContent>
      <CardFooter className="justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={autoAdvance}
            onCheckedChange={setAutoAdvance}
            size="sm"
          />
          <label className="text-sm text-muted-foreground whitespace-nowrap">
            Auto-advance every
          </label>
          <InputGroup className="h-7 w-22">
            <InputGroupInput
              type="number"
              min={1}
              max={9999}
              value={autoAdvanceSeconds}
              onChange={(e) =>
                setAutoAdvanceSeconds(
                  Math.max(1, parseInt(e.target.value) || 1),
                )
              }
              disabled={!autoAdvance}
              className="text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <InputGroupAddon align="inline-end">sec</InputGroupAddon>
          </InputGroup>
        </div>
        <Button variant="outline" size="icon" onClick={openFilePicker}>
          <Plus />
        </Button>
      </CardFooter>
    </Card>
  )
}
