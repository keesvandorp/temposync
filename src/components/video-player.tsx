"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { useTempoSync, applyEasing } from "@/contexts/temposync-context"

const CROSSFADE_SEC = 1
const GRAPH_LEN = 1800

export function VideoPlayer() {
  const {
    playlist,
    currentVideo,
    currentIndex,
    navigate,
    addFiles,
    openFilePicker,
    displayRate,
    setDisplayRate,
    speedGraphRef,
    smoothingRef,
    easingModeRef,
    minSpeedRef,
    maxSpeedRef,
    energyRef,
    isActiveRef,
    setVideoProgress,
  } = useTempoSync()

  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Crossfade state
  const frontLayerRef = useRef<"a" | "b">("a")
  const prevVideoIdRef = useRef<string | null>(null)
  const crossfadeRef = useRef(0)
  const fadingRef = useRef(false)

  // Speed smoothing
  const smoothedSpeedRef = useRef(1)
  const appliedRateRef = useRef(1)
  const speedHistoryRef = useRef<{ target: number; smoothed: number }[]>(
    new Array(GRAPH_LEN).fill(null).map(() => ({ target: 1, smoothed: 1 })),
  )
  const lastProgressRef = useRef(0)

  // ── Canvas render loop ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId: number
    let lastTime = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      let targetSpeed: number
      if (isActiveRef.current) {
        const eased = applyEasing(energyRef.current, easingModeRef.current)
        targetSpeed =
          minSpeedRef.current +
          eased * (maxSpeedRef.current - minSpeedRef.current)
      } else {
        targetSpeed = 1.0
      }

      // Time-constant based smoothing: slider 0 = instant, 1 = very slow
      // Maps smoothing (0–1) to a time constant τ (0.01s – 5s)
      const tau = 0.01 + smoothingRef.current * smoothingRef.current * 5
      const alpha = Math.exp(-dt / tau)
      const midSpeed = (minSpeedRef.current + maxSpeedRef.current) / 2
      const decayed = midSpeed + (smoothedSpeedRef.current - midSpeed) * alpha
      smoothedSpeedRef.current = decayed + (targetSpeed - decayed) * (1 - alpha)

      const easedRate = smoothedSpeedRef.current
      if (Math.abs(easedRate - appliedRateRef.current) > 0.01) {
        appliedRateRef.current = easedRate
        if (videoARef.current) videoARef.current.playbackRate = easedRate
        if (videoBRef.current) videoBRef.current.playbackRate = easedRate
        setDisplayRate(easedRate)
      }

      // ── Speed graph ──
      const hist = speedHistoryRef.current
      hist.push({ target: targetSpeed, smoothed: easedRate })
      if (hist.length > GRAPH_LEN) hist.shift()
      const sg = speedGraphRef.current
      if (sg) {
        const sctx = sg.getContext("2d")
        if (sctx) {
          const dpr = window.devicePixelRatio || 1
          const w = Math.round(sg.clientWidth * dpr)
          const h = Math.round(sg.clientHeight * dpr)
          if (sg.width !== w || sg.height !== h) {
            sg.width = w
            sg.height = h
          }
          sctx.clearRect(0, 0, w, h)

          const graphMax = maxSpeedRef.current
          const graphMin = minSpeedRef.current
          const yFor = (r: number) =>
            h -
            ((Math.min(graphMax, Math.max(graphMin, r)) - graphMin) /
              (graphMax - graphMin)) *
              h

          sctx.font = `${10 * dpr}px monospace`
          sctx.textAlign = "left"
          sctx.strokeStyle = "rgba(255,255,255,0.25)"
          sctx.lineWidth = dpr
          sctx.setLineDash([3 * dpr, 3 * dpr])
          sctx.beginPath()
          sctx.moveTo(0, 0.5)
          sctx.lineTo(w, 0.5)
          sctx.stroke()
          sctx.beginPath()
          sctx.moveTo(0, h - 0.5)
          sctx.lineTo(w, h - 0.5)
          sctx.stroke()
          sctx.setLineDash([])
          sctx.fillStyle = "rgba(255,255,255,0.4)"
          sctx.fillText(`${graphMax.toFixed(1)}×`, 4 * dpr, 12 * dpr)
          sctx.fillText(`${graphMin.toFixed(1)}×`, 4 * dpr, h - 4 * dpr)

          const baseY = yFor(1)
          sctx.strokeStyle = "rgba(255,255,255,0.6)"
          sctx.lineWidth = 1.5 * dpr
          sctx.setLineDash([6 * dpr, 4 * dpr])
          sctx.beginPath()
          sctx.moveTo(0, baseY)
          sctx.lineTo(w, baseY)
          sctx.stroke()
          sctx.setLineDash([])
          sctx.fillStyle = "rgba(255,255,255,0.6)"
          sctx.fillText("1×", 4 * dpr, baseY - 4 * dpr)

          const len = hist.length
          const step = w / (GRAPH_LEN - 1)

          sctx.strokeStyle = "rgba(128,128,128,0.4)"
          sctx.lineWidth = 1 * dpr
          sctx.lineJoin = "round"
          sctx.beginPath()
          for (let i = 0; i < len; i++) {
            const x = (GRAPH_LEN - len + i) * step
            const y = yFor(hist[i].target)
            if (i === 0) sctx.moveTo(x, y)
            else sctx.lineTo(x, y)
          }
          sctx.stroke()

          sctx.strokeStyle = "hsl(142, 71%, 45%)"
          sctx.lineWidth = 1 * dpr
          sctx.lineJoin = "round"
          sctx.beginPath()
          for (let i = 0; i < len; i++) {
            const x = (GRAPH_LEN - len + i) * step
            const y = yFor(hist[i].smoothed)
            if (i === 0) sctx.moveTo(x, y)
            else sctx.lineTo(x, y)
          }
          sctx.stroke()

          const actualRate =
            (frontLayerRef.current === "a"
              ? videoARef.current
              : videoBRef.current
            )?.playbackRate ?? easedRate
          sctx.font = `bold ${11 * dpr}px monospace`
          sctx.textAlign = "right"
          sctx.fillStyle = "hsl(142, 71%, 45%)"
          sctx.fillText(`${actualRate.toFixed(2)}×`, w - 4 * dpr, 14 * dpr)
          sctx.fillStyle = "rgba(128,128,128,0.7)"
          sctx.fillText(
            `raw ${targetSpeed.toFixed(2)}×`,
            w - 4 * dpr,
            28 * dpr,
          )
        }
      }

      // ── Crossfade progress ──
      if (fadingRef.current) {
        crossfadeRef.current = Math.min(
          1,
          crossfadeRef.current + dt / CROSSFADE_SEC,
        )
        if (crossfadeRef.current >= 1) {
          frontLayerRef.current =
            frontLayerRef.current === "a" ? "b" : "a"
          crossfadeRef.current = 0
          fadingRef.current = false
        }
      }

      // ── Paint to canvas ──
      const vidA = videoARef.current
      const vidB = videoBRef.current
      const frontVid = frontLayerRef.current === "a" ? vidA : vidB
      const backVid = frontLayerRef.current === "a" ? vidB : vidA

      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        const dpr = window.devicePixelRatio || 1
        const cw = Math.round(rect.width * dpr)
        const ch = Math.round(rect.height * dpr)
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw
          canvas.height = ch
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const drawContain = (vid: HTMLVideoElement) => {
        const vw = vid.videoWidth || 1
        const vh = vid.videoHeight || 1
        const cw = canvas.width
        const ch = canvas.height
        const scale = Math.min(cw / vw, ch / vh)
        const dw = vw * scale
        const dh = vh * scale
        const dx = (cw - dw) / 2
        const dy = (ch - dh) / 2
        ctx.drawImage(vid, dx, dy, dw, dh)
      }

      const fadeAlpha = crossfadeRef.current
      if (fadingRef.current && backVid && backVid.readyState >= 2) {
        ctx.globalAlpha = fadeAlpha
        drawContain(backVid)
      }
      if (frontVid && frontVid.readyState >= 2) {
        ctx.globalAlpha = fadingRef.current ? 1 - fadeAlpha : 1
        drawContain(frontVid)
      }
      ctx.globalAlpha = 1

      // ── Report progress (~4 Hz) ──
      if (frontVid && frontVid.duration && isFinite(frontVid.duration) && now - lastProgressRef.current > 250) {
        lastProgressRef.current = now
        setVideoProgress({ currentTime: frontVid.currentTime, duration: frontVid.duration })
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [currentVideo, setDisplayRate, setVideoProgress, speedGraphRef, smoothingRef, easingModeRef, minSpeedRef, maxSpeedRef, energyRef, isActiveRef])

  // ── Load video (crossfade) ──
  useEffect(() => {
    if (!currentVideo) {
      prevVideoIdRef.current = null
      return
    }
    if (prevVideoIdRef.current === currentVideo.id) return

    const isFirst = !prevVideoIdRef.current
    prevVideoIdRef.current = currentVideo.id

    if (fadingRef.current) {
      frontLayerRef.current = frontLayerRef.current === "a" ? "b" : "a"
      crossfadeRef.current = 0
      fadingRef.current = false
    }

    const frontEl = (
      frontLayerRef.current === "a" ? videoARef : videoBRef
    ).current
    const backEl = (
      frontLayerRef.current === "a" ? videoBRef : videoARef
    ).current

    if (isFirst) {
      if (frontEl) {
        frontEl.src = currentVideo.url
        frontEl.load()
        frontEl.play().catch(() => {})
      }
      return
    }

    if (backEl) {
      backEl.src = currentVideo.url
      backEl.load()
      backEl.play().catch(() => {})
    }
    crossfadeRef.current = 0
    fadingRef.current = true
  }, [currentVideo])

  // ── Fullscreen ──
  const supportsNativeFs = typeof document !== "undefined" &&
    (typeof document.documentElement.requestFullscreen === "function" ||
     typeof (document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen === "function")

  const toggleFullscreen = useCallback(() => {
    const container = videoContainerRef.current
    if (!container) return
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
    const el = container as HTMLElement & { webkitRequestFullscreen?: () => void }

    const isNativeFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement)

    if (isNativeFs) {
      if (doc.exitFullscreen) doc.exitFullscreen()
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
    } else if (el.requestFullscreen) {
      el.requestFullscreen()
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen()
    } else {
      // CSS fallback for iPhone
      setIsFullscreen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    if (!supportsNativeFs) return
    const doc = document as Document & { webkitFullscreenElement?: Element }
    const handleFsChange = () => setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement))
    document.addEventListener("fullscreenchange", handleFsChange)
    document.addEventListener("webkitfullscreenchange", handleFsChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange)
      document.removeEventListener("webkitfullscreenchange", handleFsChange)
    }
  }, [supportsNativeFs])

  // Force canvas resize on orientation change (CSS fullscreen on iPhone)
  const [, setViewportKey] = useState(0)
  useEffect(() => {
    if (supportsNativeFs || !isFullscreen) return
    const onResize = () => setViewportKey((k) => k + 1)
    window.addEventListener("resize", onResize)
    screen.orientation?.addEventListener("change", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      screen.orientation?.removeEventListener("change", onResize)
    }
  }, [supportsNativeFs, isFullscreen])

  // ── Drag & drop (empty state) ──
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  return (
    <div className="overflow-hidden">
        {currentVideo ? (
          <div
            ref={videoContainerRef}
            className={`relative bg-black overflow-hidden ${isFullscreen && !supportsNativeFs ? "fixed inset-0 z-50" : ""}`}
            tabIndex={0}
          >
            <video
              ref={videoARef}
              muted
              playsInline
              preload="auto"
              loop
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
              }}
            />
            <video
              ref={videoBRef}
              muted
              playsInline
              preload="auto"
              loop
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
              }}
            />
            <canvas
              ref={canvasRef}
              className={`w-full bg-black ${isFullscreen ? "h-dvh" : "aspect-video"}`}
            />
            {!isFullscreen && (
              <>
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  <Badge
                    variant="secondary"
                    className="bg-black/60 text-white backdrop-blur-sm border-0 text-sm font-mono tabular-nums"
                  >
                    {displayRate.toFixed(2)}×
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-black/60 text-white backdrop-blur-sm border-0 text-xs max-w-48 truncate"
                    >
                      {currentVideo.name}
                    </Badge>
                    {playlist.length > 1 && (
                      <Badge
                        variant="secondary"
                        className="bg-black/60 text-white backdrop-blur-sm border-0 text-xs"
                      >
                        {currentIndex + 1}/{playlist.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {playlist.length > 1 && (
                      <>
                        <button
                          onClick={() => navigate(-1)}
                          className="text-white/70 hover:text-white bg-black/40 backdrop-blur-sm rounded p-1.5 transition-colors"
                          title="Previous video (←)"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.75 19.5 8.25 12l7.5-7.5"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigate(1)}
                          className="text-white/70 hover:text-white bg-black/40 backdrop-blur-sm rounded p-1.5 transition-colors"
                          title="Next video (→)"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m8.25 4.5 7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={toggleFullscreen}
                      className="text-white/70 hover:text-white bg-black/40 backdrop-blur-sm rounded p-1.5 transition-colors"
                      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFilePicker}
            className={`flex aspect-video cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <svg
              className="h-12 w-12 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Drop video files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Select multiple files to build a playlist
              </p>
            </div>
          </div>
        )}
      </div>
  )
}
