# WebAudio Score & SFX — Atlas Lane

## Architecture

```
AudioContext (master)
└─ MasterBus (GainNode → DynamicsCompressor → destination)
   ├─ EngineHum        (oscillator + LFO + filter, continuous)
   ├─ WindTexture      (noise buffer, filtered, spatial)
   ├─ TokenChime       (short oscillator pluck, triggered)
   ├─ GlitchSFX        (buffer manip + distortion, triggered)
   ├─ FootstepsBoost   (filtered noise bursts, FSM-synced)
   ├─ TypewriterClicks (short noise transients, outro)
   └─ [future] TitleTheme (sequenced oscillators, outro)
```

## Design Rules

- **Zero external audio samples.** Every sound is synthesized at runtime from oscillators, noise buffers, and filter sweeps.
- **Mono where possible.** Wind, footsteps, glitch bursts — all mono sources, stereo where it matters (hum).
- **LUFS target:** bed around -18 LUFS, SFX peaks around -6 dBFS, no clipping.
- **3–5 pitch/timbre variations per SFX** to avoid ear fatigue during replay.
- **Resettable:** all nodes have `stop()/disconnect()` paths; `AudioContext` can be suspended/resumed on tab visibility.
- **No autoplay drama:** WebAudio autoplays only after user gesture. On first input, `AudioContext.resume()` is called once.

## SFX Synthesis Plans

### Engine Hum (Run 1 ambient bed)
- Two detuned sine oscillators (A2 + 2.5 cents sharp) → summing gain
- LFO (0.08 Hz) modulating a lowpass filter cutoff (300–700 Hz)
- Sub-bass sine at -12 dBFS underneath
- Continuous, fades in at Run 1 start, fades out at reveal

### Wind / Ambience Texture
- AudioBuffer of brownish noise (4s loop, generated at init)
- Bandpass filter (center 800 Hz, Q=0.5) with slow LFO on center freq (±400 Hz at 0.05 Hz)
- Stereo pan drift (slow random walk) for width
- Volume rides with game state

### Glitch SFX (Reveal + Run 2)
- Buffer source seeded from a 1s white noise buffer (generated at init)
- Bit-crush simulation: downsample buffer in JS, then play back at variable rate
- Distortion via Waveshaper (soft-clip curve, variable depth)
- 3 variations: (1) short stutter burst (6× 40ms clicks), (2) descending pitch drop (rate 1.0→0.3 over 400ms), (3) random chop (8 random-length segments)
- Triggered by CASE's reveal/dissolve events + KIPP's static-world proximity

### Token Chime (Run 1 pickup)
- Sine oscillator, 880/1100/660 Hz (3 variations), 150ms exponential decay
- 2nd harmonic at -12 dB for brightness
- Triggered on token pickup by KIPP's FSM

### Footsteps / Boost (KIPP FSM)
- Footstep: bandpass-filtered noise burst, 40ms, center 1500–3000 Hz depending on variation
- Boost: sine sweep 100→300 Hz, 100ms, exponential gain decay
- 2–3 timbre variations per surface (temple marble vs. static glitch ground)

### Typewriter Clicks (Outro)
- Very short noise transient (5–8ms), highpass at 3 kHz
- 12–15ms gap between clicks, synced to typewriter rate
- 2 intensity variations: normal / emph (louder, slightly longer)
- Sequence mode: schedule N clicks at fixed interval

## Files

| File | Role |
|---|---|
| `src/audio/MasterBus.ts` | Master gain + compressor, singleton |
| `src/audio/EngineHum.ts` | Continuous bed |
| `src/audio/WindTexture.ts` | Ambience |
| `src/audio/GlitchSFX.ts` | Reveal/static SFX |
| `src/audio/TokenChime.ts` | Pickup chime |
| `src/audio/FootstepsBoost.ts` | Movement feedback |
| `src/audio/TypewriterClicks.ts` | Outro |
| `src/audio/AudioManager.ts` | Central init, resume-on-gesture, state routing |
| `src/audio/types.ts` | Shared WebAudio type re-exports |

## Integration Points

- **CASE** dispatches `GlitchSFX.play()` on reveal/dissolve events and per-frame static proximity.
- **KIPP** dispatches `FootstepsBoost.footstep()` on FSM state transitions and `TokenChime.play()` on token pickup.
- **PLEX** (outro camera) triggers `TypewriterClicks.sequence()` when the credits begin typing.
- **ATLAS** owns `AudioManager` init/resume and the master volume curve across acts.
