"use client"

import { memo, useCallback, useMemo } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useTempoSync } from "@/hooks/use-tempo-sync"
import { formatTime } from "@/lib/format"

export interface VideoItem {
  id: string
  name: string
  url: string
}

interface VideoPlaylistProps {
  items: VideoItem[]
  currentId: string | null
  onReorder: (items: VideoItem[]) => void
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

const SortableItem = memo(function SortableItem({
  item,
  isCurrent,
  onSelect,
  onRemove,
}: {
  item: VideoItem
  isCurrent: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}) {
  const { videoProgress, autoAdvance, autoAdvanceCountdown } = useTempoSync()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = useMemo(
    () => ({ transform: CSS.Transform.toString(transform), transition }),
    [transform, transition]
  )

  const handleSelect = useCallback(() => onSelect(item.id), [onSelect, item.id])
  const handleRemove = useCallback(() => onRemove(item.id), [onRemove, item.id])

  const progressPct =
    isCurrent && videoProgress.duration > 0
      ? (videoProgress.currentTime / videoProgress.duration) * 100
      : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-md text-sm transition-colors overflow-hidden ${
        isDragging ? "opacity-50" : ""
      } ${isCurrent ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
          {...attributes}
          {...listeners}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </button>

        <button
          onClick={handleSelect}
          className="flex-1 truncate text-left"
          title={item.name}
        >
          {item.name}
        </button>

        {isCurrent && videoProgress.duration > 0 && (
          <span className="text-[10px] tabular-nums text-primary/70 shrink-0">
            {formatTime(videoProgress.currentTime)} / {formatTime(videoProgress.duration)}
          </span>
        )}

        {isCurrent && autoAdvance && autoAdvanceCountdown > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
            {Math.ceil(autoAdvanceCountdown)}s
          </span>
        )}

        {isCurrent && (
          <span className="text-xs text-primary shrink-0">▶</span>
        )}

        <button
          onClick={handleRemove}
          className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
          title="Remove"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isCurrent && videoProgress.duration > 0 && (
        <div className="h-0.5 bg-primary/10">
          <div
            className="h-full bg-primary/50 transition-[width] duration-300 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  )
})

export const VideoPlaylist = memo(function VideoPlaylist({
  items,
  currentId,
  onReorder,
  onSelect,
  onRemove,
}: VideoPlaylistProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        onReorder(arrayMove(items, oldIndex, newIndex))
      }
    },
    [items, onReorder]
  )

  if (items.length === 0) return null

  return (
    <div className="space-y-1">
      
      <DndContext
        id="playlist-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                isCurrent={item.id === currentId}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
})
