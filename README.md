<p align="center">
  <img src="src/app/apple-icon.png" alt="TempoSync" width="80" height="80" />
</p>

<h1 align="center">TempoSync</h1>

<p align="center">
  TempoSync lets looping visuals move with the music. Built for live performance, it listens to real-time audio energy and transforms it into playback speed, creating visuals that swell, drift, and breathe alongside the sound.
</p>

## How it works

TempoSync captures microphone audio via the Web Audio API, computes a real-time energy value from the frequency spectrum, and maps that energy to the playback speed of a looping video.

### 1. Audio analysis — spectral energy with perceptual weighting

The microphone signal is routed through a `GainNode` (mic volume control) into an `AnalyserNode` (FFT size 4096, smoothing 0.3). Each animation frame, the frequency spectrum is read via `getByteFrequencyData()`.

The spectrum is split into **six perceptual frequency bands**, each with a configurable weight:

| Band       | Range          | Default weight |
|------------|----------------|----------------|
| Sub-bass   | 0 – 60 Hz      | 1.0            |
| Bass       | 60 – 250 Hz    | 0.9            |
| Low-mid    | 250 – 500 Hz   | 0.7            |
| Mid        | 500 – 2000 Hz  | 0.5            |
| High-mid   | 2000 – 6000 Hz | 0.3            |
| High / air | 6000 Hz +      | 0.15           |

Lower frequencies are weighted more heavily because they carry most of the perceived energy in piano and ensemble music. All band weights are adjustable via the EQ sliders in the settings panel. Live per-band energy meters show the isolated contribution of each band.

Two metrics are combined per frame:

- **Weighted level** — average bin amplitude across all bands (sustained energy)
- **Spectral flux** — sum of positive bin-to-bin differences from the previous frame (onset/transient detection)

```
combined = weightedLevel × 0.65 + spectralFlux × 15.0 × 0.35
```

### 2. Adaptive noise floor

An adaptive noise floor ensures silence maps to zero energy (not mic hiss or room tone):

```
baselineAlpha = energy > baseline ? 0.0005 : 0.02
baseline      = baseline + (energy - baseline) × baselineAlpha
```

The floor rises **very slowly** (α = 0.0005) so music isn't mistaken for noise, but drops **moderately fast** (α = 0.02) so silence is quickly recognized.

```
energy = clamp(0, 1, (combined - baseline) × sensitivity)
```

### 3. Easing curves

Before mapping energy to speed, an **easing function** reshapes the energy curve. This controls how the system *feels* — whether it responds more to quiet passages, loud peaks, or treats all levels proportionally.

14 easing modes are available:

| Mode         | Character                                      |
|--------------|------------------------------------------------|
| `linear`     | Proportional — energy maps directly to speed   |
| `smoothstep` | Gentle S-curve, slightly softer on extremes    |
| `inQuad`     | Slow start — only reacts to louder energy      |
| `outQuad`    | Fast start — responsive to soft sounds         |
| `inOutQuad`  | Slow at extremes, faster in the middle         |
| `inCubic`    | Steeper slow start — ignores quiet, amplifies loud |
| `outCubic`   | Very responsive to soft sounds (default)       |
| `inOutCubic` | Strong S-curve                                 |
| `inSine`     | Gentle slow start                              |
| `outSine`    | Gentle fast start                              |
| `inOutSine`  | Smooth sine-based S-curve                      |
| `inExpo`     | Exponential — nearly silent until loud peaks   |
| `outExpo`    | Exponential — huge response to quiet sounds    |
| `inOutExpo`  | Extreme S-curve — quiet or loud, little middle |

The eased energy is then mapped to the speed range:

```
easedEnergy = applyEasing(energy, easingMode)
targetSpeed = minSpeed + easedEnergy × (maxSpeed - minSpeed)
```

### 4. Time-constant smoothing

Raw energy is noisy, so a smoothing filter prevents jerky speed changes. The smoother uses a **time-constant** approach (τ) rather than a raw alpha value, giving consistent behavior regardless of frame rate:

```
τ     = 0.01 + slider² × 5      // maps 0–1 slider to 10ms – 5s
alpha = exp(-dt / τ)             // per-frame smoothing factor
smoothed = smoothed × alpha + target × (1 - alpha)
```

The quadratic slider mapping puts most of the useful range (fast response) in the first half of the slider, with the second half reserved for very slow, cinematic smoothing. The UI shows the actual response time in ms or seconds.

### 5. Playback rate application

The smoothed speed is applied to the HTML5 `<video>` element's `playbackRate` property. Updates are throttled (minimum Δ of 0.01) to avoid excessive browser repaints. Two video elements support **crossfade transitions** when switching between playlist items.

## Features

- **Energy-based speed control** — microphone audio drives video playback rate with configurable sensitivity, easing, and smoothing
- **14 easing curves** — reshape the energy-to-speed response via a searchable command palette
- **Multi-video playlist** — drop multiple video files; reorder via drag-and-drop, remove individual items, or add more
- **Playback progress** — active playlist item shows elapsed / total time and a progress bar
- **Arrow key navigation** — switch videos with ← → keys, including in fullscreen
- **Auto-advance with countdown** — cycle to the next video after a configurable interval with a live countdown
- **Crossfade transitions** — smooth opacity crossfade between videos (1 second)
- **Fullscreen mode** — clean, overlay-free view for live projection (CSS-based fallback on iPhone Safari)
- **Live waveform visualiser** — real-time audio waveform display
- **Speed graph** — scrolling 30-second graph with raw and smoothed speed
- **EQ band weighting** — per-band gain sliders with live energy meters
- **Mic gain control** — boost or reduce microphone input to suit your environment
- **Dark / light theme** — toggle with a button; persisted via cookies
- **Settings persistence** — all settings saved to cookies and restored on reload

## Settings

| Setting            | Range         | Default    | Description                                                         |
|--------------------|---------------|------------|---------------------------------------------------------------------|
| Smoothing          | 10 ms – 5 s  | ~850 ms    | Time-constant for speed changes. Left = instant, right = slow/smooth |
| Easing Curve       | 14 modes      | `outCubic` | How energy maps to speed — see table above                          |
| Speed Range        | 0.1× – 8×    | 0.5 – 4×   | Min and max playback speed (dual-thumb slider)                      |
| Energy Sensitivity | 0.5× – 10×   | 3.0×       | Multiplier on the energy signal after noise floor                   |
| Mic Volume         | 0.1× – 5×    | 1.0×       | Input gain applied before analysis                                  |
| EQ Band Weights    | 0 – 1 each   | See table  | Per-band gain to shape which frequencies contribute                 |

## Architecture

The app follows a **context/provider pattern** with a single `TempoSyncProvider` holding all shared state (playlist, settings, audio, video progress). Components consume state via the `useTempoSync()` hook.

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

- [Next.js 16](https://nextjs.org/) — App Router, Turbopack
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) — Button, Card, Slider, Badge, Switch, Input, InputGroup, Label, Command, Select
- [@dnd-kit](https://dndkit.com/) — drag-and-drop playlist reordering
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — AudioContext → GainNode → AnalyserNode

## Getting started

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Development server with HTTPS (required for microphone on some devices)
pnpm dev:secure
```

Open [http://localhost:3000](http://localhost:3000). Two default videos are loaded automatically — drop your own to replace them.

## Usage

1. **Add videos** — drag and drop video files onto the drop zone, or click to browse
2. **Reorder** — drag the grip handle on any playlist item
3. **Start listening** — click "Start Listening" to grant microphone access
4. **Play music** — the video playback speed follows the energy of whatever the mic picks up
5. **Tune** — adjust *Smoothing*, *Easing Curve*, *Energy Sensitivity*, and *EQ Band Weights* to taste
6. **Auto-advance** — enable auto-advance and set an interval; a countdown shows when the next switch will happen
7. **Live setup** — use fullscreen mode on a projector, place the mic near the instrument, and adjust gain/sensitivity to match the room

## Production build

```bash
pnpm build
pnpm start
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](LICENSE) © [Kees van Dorp](https://github.com/keesvandorp)
