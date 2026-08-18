# HERMES PROTOCOL — Project Specification
*A No Time For Caution Games tech demo · Homage to Nous Research · Built entirely by the NTFC bot crew on free-tier models*

**Status:** AWAITING SIGN-OFF · **Codename:** `hermes-courier` · **Spec version:** 0.1

---

## 1. Vision

A 90-second WebGPU tech demo. You are Hermes, the agent. The user asked for an answer. You have until the context window closes to fetch the truth and deliver it.

- **Run 1 — The Temple (0:00–0:45):** marble×GPU-rack temple, token rivers, volumetric light. Impressive, polished, trustworthy.
- **THE REVEAL (0:45):** the temple dissolves — it was the hallucination. The static was real.
- **Run 2 — The Static (0:50–1:15):** glitch is ground, the context window is a white-noise reaper dissolving the world behind you. Deliver.
- **The Outro (1:15–1:30):** the response types itself onto the wall… then a prompt cursor blinks and the game turns the camera on YOU. Credits roll over your exchange.
- Score: **tokens per second.** Title TBD (see §12).

## 2. Hard Constraints

| # | Constraint | Enforcement |
|---|---|---|
| C1 | Built **purely by the bots** — TARS writes no game code | All code/commits authored by bot profiles only; I gate and dispatch |
| C2 | **Exclusively :free tier models on Nous Portal** for all build/QA/review inference | Bot profiles pinned to free models (§3); visual critic on the only free vision model; phase-start roster re-verification |
| C3 | Web-based, high-res, WebGPU primary, WebGL2 fallback | `webgpu-capabilities.json` in every QA capture |
| C4 | Evidence-first: no self-reported success | Every gate = real tool output (see §8) |
| C5 | License-clean: 100% CC0/unrestricted assets, attribution manifest | `ATTRIBUTION.md` maintained by ATLAS, audited at every gate |

## 3. Model Roster (live-verified 2026-08-19 via `portal.nousresearch.com/api/nous/recommended-models`)

Six free models are on the Nous Portal roster today:

| Model | Source | ctx | Vision | Assignment |
|---|---|---|---|---|
| `upstage/solar-pro4:free` | local | ? | ✗ | **PLEX** (lighting/camera reasoning). Current default for all bots. |
| `poolside/laguna-s-2.1:free` | openrouter | 256K | ✗ | **CASE** (engine, shaders, hot loops — code-gen focus, big ctx) |
| `poolside/laguna-xs-2.1:free` | openrouter | 256K | ✗ | **KIPP** (small, fast, focused FSM/feel patches) |
| `tencent/hy3:free` | local | ? | ✗ | **ATLAS** (asset sourcing, WebAudio, manifests) |
| `meituan/longcat-2.0:free` | local | ? | ✗ | Spare / fallback |
| `stepfun/step-3.7-flash:free` | local | ? | **✓** | **CRITIC** profile — the ONLY free vision model. Every visual judgment routes through it. |

**P0 gate:** each assignment smoke-tested (`hermes -p <bot> chat -Q "ping"`). Any model that fails → that bot falls back to `solar-pro4:free`. Roster re-verified at the start of every phase; free lists drift and we never assume.

**Orchestrator honesty note:** TARS (this session) is on a paid model. I will author **zero** game code — dispatch, gating, evidence only. If you want 100% free-model purity including orchestration, P0 has a variant where the campaign runs from a `solar-pro4:free` session; my recommendation is to keep the dispatcher as-is, since it writes nothing into the game.

## 4. Orchestration & Ownership

```
Cihan ── TARS (dispatch, gates, evidence, merge) ──┬─ case ── engine/renderer lane
                                                   ├─ kipp ── movement/feel lane
                                                   ├─ atlas ── assets/audio lane
                                                   ├─ plex ── lighting/camera lane
                                                   └─ critic ── vision QA (step-3.7-flash)
```

- **Dispatch:** `hermes -p <bot> chat --in ~ -c "Bot Chat" -Q -q "…"` — background, notify-on-complete, one bot job at a time per bot (their chats are stateful).
- **Merge flow:** bots commit on lanes → PR → Gitea Actions CI (typecheck/build/tests) → TARS merges only on green + gate pass.
- **Concurrency:** parallel bots when their lanes don't touch the same files; serialized when they do. TARS resolves conflicts through PRs.
- **Loop:** gauntlet-style — build wave → critic judges against the gate → biggest gap fixed → next wave. Waves are checkpointed (`gauntlet-progress.md`), never lost.
- **No** docker.sock into anything bot-touched; no secrets in the repo (Vaultwarden policy unchanged).

## 5. Repo & Stack

- **Repo:** `MLcogTech/hermes-courier` (Gitea) — created in P0. `main` requires CI-green + gate; bots work feature branches.
- **Stack:** TypeScript, Vite, Three.js (WebGPU renderer, WebGL2 fallback), KTX2/Basis textures, glTF assets, Web Audio API, Playwright acceptance. QA image: `hermes-courier-gpu-qa` (Chromium + Mesa + UHD 770) — same pattern as `resident-eval-gpu-qa`.
- **Worktree:** `~/projects/hermes-courier` on the Hermes VM — single clone, lane directories, bot git identities.

## 6. Environment Map

| Zone | Role |
|---|---|
| Hermes VM | Source, builds, CI (Gitea Actions), orchestration, evidence store |
| Unraid (192.168.1.185) | Headless iGPU QA: screenshots, video, perf.json, console.json — one QA container at a time |
| MacBook Pro | **Visual authority** — 4K real-time play, "does it hit" vote |
| Gitea | Git, PRs, Actions CI |

## 7. Phases & Gates

| Phase | Work | Exit gate (all evidence, no faith) |
|---|---|---|
| **P0 — FOUNDATION** | Repo + Actions CI · bot model pinning verified · Vite/TS/Three scaffold · QA Dockerfile · Playwright harness · attribution skeleton | CI green on hello-world · each bot ping-passed · QA image boots, returns `webgpu-capabilities.json` + a captured black frame · model roster re-checked |
| **P1 — THE TEMPLE** | CASE: render loop 16.6ms budget, instancing, fog · KIPP: run/boost FSM · ATLAS: temple assets + WebAudio bed · PLEX: lighting + chase camera | Playable 20s · 60 FPS Mac · clean console · HUD-free screenshots pass CRITIC 2/2 · deterministic replay captures on Unraid |
| **P2 — THE BEND** | Dissolve shader (CASE) · glitch-is-ground rules (CASE+KIPP) · window-reaper mechanic + post-FX degradation (CASE+PLEX) · static-world assets (ATLAS) | Reveal reads blind (CRITIC sees reveals with no briefing) · perf within budget during dissolve · full Run 1→Run 2 flow playable |
| **P3 — THE OUTRO** | Prompt-cursor scene, input box, honest canned reply, credits-over-exchange (ATLAS+KIPP) · full 90s loop (PLEX) | Full demo runs end-to-end 10/10 · no state leaks between runs |
| **P4 — THE GAUNTLET** | Vision-critique waves · perf sweeps · polish · capture pipeline | Definition of Done (§10) — all items green |
| **P5 — DELIVERY** | 4K60 master + 1080p60 X derivative · clip to Cihan · repo tagged | Clips delivered and verified; tag on green main |

Timeline estimate (free-tier reality, 50% buffer: rate limits, weaker models = more waves): **P0 ~1d · P1 2–4d · P2 2–4d · P3 1–3d · P4 2–4d → ~8–16 workdays.**

## 8. Evidence Model (every gate)

| Check | Tool | Who judges |
|---|---|---|
| Typecheck / tests / prod build | `npm` on VM + Actions CI | tool exit codes |
| Runtime errors | Playwright `console.json` | tool output |
| Performance | `performance.json` (frame times, draws) | CASE's 16.6ms budget, TARS |
| WebGPU active | `webgpu-capabilities.json` | tool output |
| Visual quality | captured screenshots | **CRITIC** (step-3.7-flash, blind where possible) |
| Gameplay capture | 60 Hz deterministic replay → mp4 | CRITIC + Cihan |
| License cleanliness | `ATTRIBUTION.md` audit | ATLAS maintains, TARS audits |

## 9. Visual QA Lock (do not underbuild this)

Exactly **one** free model sees pixels: `stepfun/step-3.7-flash:free`. Consequences:
- All screenshot/frame reviews go through the **CRITIC profile** (new, or a Bot-Chat roled bot on that model).
- Visual passes are **serialized** — batches of 2–4 images, not 40.
- Blind A/B: CRITIC judges reveal screenshots *without* being told what the reveal is, or the mind-bend claim goes unverified.

## 10. Definition of Done

- [ ] Typecheck, unit tests, production build green on `main` (Actions)
- [ ] Zero uncaught runtime errors across 10 full runs
- [ ] 60 FPS 1440p on Mac / 30 FPS floor on UHD 770 compat tier; WebGPU active with working GL fallback
- [ ] HUD-free screenshots pass CRITIC 2/2 across all three acts
- [ ] The Reveal reads blind (unbriefed critic says what happened correctly)
- [ ] Deterministic 60 Hz replay → 4K60 master + 1080p60 X derivative (H.264 High, faststart)
- [ ] `ATTRIBUTION.md` complete — 100% CC0/unrestricted, no gaps
- [ ] Outro works from a cold browser; credits honest ("built by CASE, KIPP, ATLAS, PLEX on :free models")
- [ ] Repo tagged `v1.0-demo`, clip delivered to Cihan's desktop

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Free-tier rate limits on local vs openrouter models (unknown caps) | P0 throughput probe per model; spread across 4+ models; per-bot serialization; checkpointed waves |
| Local free models: unknown/limited context | Atomic tasks, file-scoped edits via patch, no whole-engine-in-prompt asks |
| Single free vision model = single point of failure | Visual passes serialized & retried; blind review batching; if image input degrades, CRITIC switches to pixel-sampling text descriptions (last resort, flagged honestly) |
| Free model code quality < frontier → more gauntlet waves | Gauntlet budget assumes it; TARS ego never assumes "one wave and done" |
| `laguna-*:free` are openrouter-sourced in the portal feed — may refuse via Hermes `nous` provider | P0 smoke test; fallback `solar-pro4:free` (already proven working on all four profiles today) |
| Free roster drift (list is live) | Re-check endpoint at each phase start; never assume availability |
| Bot cross-file collisions | Lane ownership + PR-gated merge to `main` |
| Credential hygiene | No secrets in repo; Vaultwarden-only policy unchanged |

## 12. Open Decisions (need your picks)

1. **Title** (codename `hermes-courier` until picked): *Courier of the Latent Gods* / *Hermes Protocol* / *The Last Token* / *Winged Delivery* / your call
2. **Purity scope:** bots+critic free (recommended) vs. even TARS' session on a free model
3. **Per-bot model mapping** (§3) vs. keep all four on `solar-pro4:free`
4. **Delivery target:** desktop clip only, or also deploy static build via Coolify on Forge (post-P5, separate sign-off)