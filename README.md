# TempoSync

**Sync looping video playback speed to live music energy in real time.**

TempoSync is designed for live performance environments — think a pianist performing at a venue where projected visuals should breathe with the music. When the music swells, the video speeds up; when it fades to silence, the video slows down. The result is a seamless, organic coupling between audio energy and visual tempo.

## How it works

TempoSync captures microphone audio via the Web Audio API, computes a real-time energy value from the frequency spectrum, and maps that energy directly to the playback speed of a looping video.

### 1. Audio analysis — spectral energy with perceptual weighting

The microphone signal is routed through a `GainNode` (for mic volume control) into an `AnalyserNode` (FFT size 4096, smoothing 0.3). Each animation frame, the frequency spectrum is read via `getByteFrequencyData()`.

The spectrum is split into **six perceptual frequency bands**, each with a configurable weight reflecting its contribution to perceived musical energy:

| Band       | Range         | Default weight |
|------------|---------------|----------------|
| Sub-bass   | 0 – 60 Hz     | 1.0            |
| Bass       | 60 – 250 Hz   | 0.9            |
| Low-mid    | 250 – 500 Hz  | 0.7            |
| Mid        | 500 – 2000 Hz | 0.5            |
| High-mid   | 2000 – 6000 Hz| 0.3            |
| High / air | 6000 Hz +     | 0.15           |

Lower frequencies are weighted more heavily because they carry most of the perceived energy in piano and ensemble music. All band weights are adjustable via the EQ sliders in the settings panel.

Two metrics are computed per frame:

- **Weighted level** — the average bin amplitude across all bands (sustained energy)
- **Spectral flux** — the sum of *positive* bin-to-bin differences from the previous frame (onset/transient detection)

These are combined into a single energy value:

```
combined = weightedLevel × 0.65 + spectralFlux × 15.0 × 0.35
```

### 2. Adaptive noise floor

To ensure silence maps to zero energy (not mic hiss or room tone), an adaptive noise floor tracks the ambient level:

```
baselineAlpha = energy > baseline ? 0.0005 : 0.02
baseline = baseline + (energy - baseline) × baselineAlpha
```

The floor rises **very slowly** (α = 0.0005) so music isn't mistaken for noise, but drops **moderately fast** (α = 0.02) so silence is quickly recognized. The final energy is the signal above this floor:

```
energy = clamp(0, 1, (combined - baseline) × sensitivity)
```

### 3. Energy → speed mapping

The processed energy (0–1) maps linearly to the configured speed range:

```
targetSpeed = minSpeed + energy × (maxSpeed - minSpeed)
```

For example, with a range of 0.5× – 3.0×:
- Energy 0 (silence) → 0.5× playback
- Energy 0.5 (moderate) → 1.75× playback
- Energy 1 (loud/intense) → 3.0× playback

### 4. Midpoint-decay smoothing

Raw energy is noisy, so a smoothing filter prevents jerky speed changes. Unlike a standard exponential moving average (which holds its last value), TempoSync's smoother **decays toward the midpoint** of the speed range during quiet moments:

```
midSpeed = (minSpeed + maxSpeed) / 2
decayed  = midSpeed + (smoothed - midSpeed) × α
smoothed = decayed + (targetSpeed - decayed) × (1 - α)
```

Where `α` is the smoothing factor (0 = instant, 0.995 = very slow). This means:
- **With energy**: the smoothed speed follows the target
- **Without energy**: the smoothed speed drifts back toward the center of the range, not toward the minimum or wherever it happened to be

### 5. Playback rate application

The smoothed speed is applied to the HTML5 `<video>` element's `playbackRate` property. Updates are throttled (minimum Δ of 0.01) to avoid excessive browser repaints. Two video elements support **crossfade transitions** when switching between playlist items.

## Features

- **Energy-based speed control** — Live microphone audio drives video playback rate with configurable sensitivity and smoothing
- **Multi-video playlist** — Drop multiple video files; reorder via drag-and-drop, remove individual items, or add more
- **Playback progress** — Active playlist item shows elapsed / total time and a progress bar
- **Arrow key navigation** — Switch videos with ← → keys, including in fullscreen
- **Auto-advance with countdown** — Cycle to the next video after a configurable interval, with a live countdown timer shown on the active item
- **Crossfade transitions** — Smooth opacity crossfade between videos (1 second)
- **Fullscreen mode** — Clean, overlay-free view for live projection
- **Live waveform visualiser** — Real-time audio waveform display
- **Speed graph** — Scrolling 30-second graph showing raw (gray) and smoothed (green) speed, with min/max/1× reference lines
- **EQ band weighting** — Per-band gain sliders to tune which frequencies drive the energy response
- **Mic gain control** — Boost or reduce microphone input to suit your environment
- **Dark / light theme** — Toggle with a button; persisted via cookies
- **Settings persistence** — All settings saved to cookies and restored on reload

## Settings

| Setting            | Range        | Default | Description                                              |
|--------------------|--------------|---------|----------------------------------------------------------|
| Smoothing          | 0 – 99.5%   | 85%     | How much the speed is eased. 0% = instant, 99% = very slow |
| Speed Range        | 0.1× – 8×   | 0.5 – 4× | Min and max playback speed (dual-thumb slider)          |
| Energy Sensitivity | 0.5× – 10×  | 3.0×    | Multiplier on the energy signal after noise floor        |
| Mic Volume         | 0.1× – 5×   | 1.0×    | Input gain applied before analysis                       |
| EQ Band Weights    | 0 – 1 each  | See table above | Per-band gain to shape which frequencies contribute |

## Architecture

The app follows a **context/provider pattern** with a single `TempoSyncProvider` holding all shared state (playlist, settings, audio, video progress). Components consume state via the `useTempoSync()` hook, avoiding prop drilling.

```
src/
  app/
    layout.tsx          — Server component, reads theme cookie
    providers.tsx       — Client wrapper: ThemeProvider + TempoSyncProvider
    page.tsx            — Composition shell assembling all components
  contexts/
    temposync-context.tsx — Central state management, settings persistence
  components/
    video-player.tsx    — Canvas render loop, crossfade, speed ramping
    playlist-card.tsx   — Playlist card with auto-advance controls
    video-playlist.tsx  — Sortable playlist items with progress display
    listen-button.tsx   — Microphone toggle
    settings-card.tsx   — All settings sliders and EQ controls
    monitoring-cards.tsx — Waveform, speed graph, and stats cards
    theme-toggle.tsx    — Dark/light theme switcher
    ui/                 — shadcn/ui primitives
  hooks/
    use-energy-detection.ts — Web Audio FFT analysis with band weighting
```

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) (Button, Card, Slider, Badge, Switch, Input, InputGroup, Label)
- [dnd-kit](https://dndkit.com/) (drag-and-drop playlist reordering)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (AudioContext → GainNode → AnalyserNode)

## Getting started

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Two default videos are loaded automatically — drop your own videos to replace them.

## Usage

1. **Add videos** — Drag and drop video files onto the drop zone, or click to browse
2. **Reorder** — Drag the grip handle on any playlist item to reorder
3. **Start listening** — Click "Start Listening" to grant microphone access
4. **Play music** — The video playback speed now follows the energy of whatever the mic picks up
5. **Tune** — Adjust *Energy Sensitivity*, *Smoothing*, and *EQ Band Weights* to taste
6. **Auto-advance** — Enable auto-advance and set an interval; a countdown shows when the next switch will happen
7. **Live setup** — Use fullscreen mode on a projector, place the mic near the piano, and adjust gain/sensitivity to match the room acoustics

## Build

```bash
pnpm build
pnpm start
```

## License

MIT
