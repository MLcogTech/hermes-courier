# Hermes Protocol

A 90-second WebGPU browser tech-demo homage to **Nous Research**.

You are Hermes — the winged agent. The user asked for an answer. You have until
the context window closes to fetch the truth and deliver it. Act I: a marble×GPU-rack
temple. THE REVEAL: the temple dissolves — it was the hallucination; the static was real.
Act II: glitch is ground, the context window is a white-noise wall dissolving everything
behind you. Outro: the response types itself onto the wall, then a prompt cursor blinks
and the game turns the camera on the human.

> **Built entirely by bots** (`@case`, `@kipp`, `@atlas`, `@plex`) on **free-tier-only**
> models from the Nous Portal. Zero hand-written game code.

## Project layout

```
hermes-courier/
├── src/                    # Everything is code-owned by bots
│   ├── index.html          # Canvas + boot
│   ├── main.ts             # Entry, TARS-style: honest and terse
│   ├── lib/                # Engine primitives (renderer, input)
│   │   ├── renderer.ts     # WebGPU + WebGL2 fallback
│   │   ├── input.ts        # KIPP's feel: buffering, coyote, smoothing
│   │   ├── performance.ts  # CASE's telemetry: 16.6ms budget enforcer
│   │   └── scene.ts        # Scene graph
│   ├── managers/           # State + game-loop managers
│   │   ├── game-state.ts   # FSM: ACT_1 → REVEAL → ACT_2 → EPILOGUE
│   │   ├── context-window.ts # The reaper — shrinking window with visual FX
│   │   └── token-counter.ts  # The score: tokens/sec live
│   ├── worlds/             # The two worlds
│   │   ├── temple/         # Act I geometry + assets
│   │   ├── latent-space/   # Act II glitch shards + wireframe
│   │   └── transition.ts   # The dissolve — shader-level material metamorphosis
│   ├── shaders/            # WebGPU shaders (WGSL)
│   │   ├── temple.wgsl     # Marble → wireframe master material
│   │   ├── particle.wgsl   # Token streams
│   │   └── postfx.wgsl     # FXAA, glitch grain, window degradation
│   └── ui/                 # Minimal HUD (tokens, window bar)
├── public/                 # Static assets
│   ├── assets/             # glTF models (attribution in ATTRIBUTION.md)
│   └── fonts/              # Bitmap font for the outro typewriter
└── docs/
    └── SPEC.md             # Full specification
```

## The crew

| Bot | Lane | Model |
|-----|------|-------|
| @case | rendering, physics, build performance, scene graph | poolside/laguna-s-2.1:free |
| @kipp | movement feel, input, game-flow choreography, FSM | poolside/laguna-xs-2.1:free |
| @atlas | assets, materials, lighting math, WebAudio | tencent/hy3:free |
| @plex | cinematics, camera choreography, lighting design | upstage/solar-pro4:free (vision) |
| @tars | gates, evidence, CI merges, orchestration | poolside/laguna-s-2.1:free |

## License

All assets 100% CC0 or procedurally generated. Full attribution in `ATTRIBUTION.md`.
