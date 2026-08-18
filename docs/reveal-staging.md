# Reveal Staging — The Dissolve Beat, Attention Beams, Outro Camera

**Game:** Hermes Protocol  
**Author:** PLEX (cinematography lane)  
**Status:** P0 foundation stub — ready for P1 implementation  
**Related docs:** `docs/camera-language.md` (camera), `docs/lighting-design.md` (lighting)

---

## 1. What the Reveal Is

The reveal is the moment at t = 0:45 where the temple dissolves and the static is revealed underneath. It is the narrative hinge of the entire demo. Up to 0:44, the audience believes the temple is real. At 0:45, they learn it was the hallucination. The dissolve is not a special effect — it is the story.

The camera and lighting during the reveal are not "support." They are the reveal. A reveal with a generic camera and a fade-to-black reads as a technical moment, not an emotional one. The camera and light *are* the feeling of the world collapsing.

---

## 2. The Dissolve Beat — What the Camera Does

### 2.1 Runtime premise

The chase camera is in active follow mode immediately before the dissolve. The player is flying through the temple, the rig is damped-following the anchor, the lens is locked at 45mm (or whichever chase focal is current), the god rays are live.

At t = 0:45, the dissolve begins. The geometry starts dissolving (CASE owns the dissolve shader/material — see SPEC §7, P2). The camera's behavior during the dissolve is PLEX's.

### 2.2 The rule: no zoom-out, no pull-back

The most common instinct for a dissolve moment is to zoom out or pull the camera back to "reveal the scope of the destruction." **We do the opposite.** The camera collapses toward the dissolving geometry. The audience is not given distance from the destruction — they are brought into it.

**Why:** a zoom-out says "look how big this is." A collapse says "this is happening *here*, and it is happening *to* you." The reveal is personal, not spectacular. The demon's the hallucination; the feeling's the loss of a world you trusted. The camera should feel loss, not awe.

### 2.3 The camera motion during the dissolve

| Phase | Time | Camera motion | Lens | Rig state |
|---|---|---|---|---|
| Pre-dissolve (chase) | 0:44–0:45 | Active damped follow, normal | Chase focal (45mm) | Active spring |
| Dissolve onset | 0:45 (frame 0) | Chase rig *stops* following. Rig holds its current position. Look-at locks onto the center of the dissolving temple mass (not the player). | 45mm → 50mm over 0.5 s (slow focal compression) | Spring released; rig becomes static at its dissolve-start pose |
| Dissolve middle | 0:45–0:50 | Rig does *not* move. The camera is static in world space while the geometry dissolves around it. The look-at stays locked on the dissolving mass. | 50mm, held | Static rig, static look-at — the camera is "watching the melt" |
| Dissolve end | 0:50 | Rig re-engages, but now following the player in the static space (height raised, look-at biased up per camera-language §4). | 50mm held, then returns to chase 45mm over 1.0 s | Spring re-engaged, static act target |

**The key move:** at dissolve onset, the rig *stops*. It does not pull back. It does not push in. It holds its position and watches the temple dissolve around it. The audience is not given a new camera move to watch — they are given a held frame while the world they trusted melts. The emotional weight is in the stillness, not in the motion.

**The focal compression (45→50mm):** a small, slow focal compression over the first 0.5s of the dissolve. Not a zoom. A gentle tightening that reads as the lens leaning in toward the dissolution — "the camera is paying attention to the melt." It's subtle. It should not be noticeable as a move; it should be felt as a slight intensification.

### 2.4 What the audience sees during the dissolve

From the camera's held position, the audience sees:

1. The temple geometry dissolving from the edges inward (or from the point of the dissolving mass outward — CASE picks the dissolve topology; PLEX signs the read).
2. The god rays dying as the high-window key cuts (lighting-design §3.1).
3. The cold light rising as the static key bleeds in (lighting-design §3.1).
4. The character (player) still present in the frame, flying through the dissolving space — the hero is the one stable thing in a dissolving world. This is the visual argument of the reveal: "the agent is real; the world around it was the hallucination."

The character is not the focus of the dissolve shot — the dissolving geometry is. But the character's presence in the frame is essential. If the dissolve shot loses the character, the audience loses the anchor. The rig hold position and look-at are chosen so the character remains in frame (lower third, off-center) throughout the dissolve.

### 2.5 The "collapse feel" — how we get it

The collapse feel comes from three things working together:

1. **The rig stops.** No counter-motion, no compensation. The camera goes still while the world goes wrong. The contrast between still-camera and dissolving-world is the collapse.
2. **The focal compression.** A slight tighten — "the camera is leaning in" — that reads as attention, not as a technique.
3. **The lighting cut.** The warm key cuts at the same moment the rig stops. The audience loses the warm light they trusted at the same moment they lose the motion they trusted. Two losses at once — the world and the light that made it feel real.

---

## 3. Outro Lighting

The outro is the moment after the static act, when the response types onto the wall and the camera turns toward the human.

### 3.1 The room's light

The outro is a single, clean, warm-light scene. The agent is in a "room" (a quiet, stylized space — not a temple, not the static; a third environment that reads as "the place the answer is written"). The light in this room is warm incandescent — a lamp or a single window at evening.

| Parameter | Value | Notes |
|---|---|---|
| Key type | Single warm directional or point (case decides) | The light reads as "a lamp in a room," not "a sun in a temple" |
| Color temperature (creative intent) | **3200K** — warm incandescent / tungsten | Warm, but a *different* warmth than the temple. The temple was 5500K daylight-warm. The outro is 3200K lamp-warm. The audience should feel the difference — this is a human-room warmth, not a hallucination warmth |
| Approximate RGB (Planckian → sRGB, for CASE) | ~(1.0, 0.9, 0.8) at full intensity | Distinctly warm — orange-tinted, the tungsten feel |
| Intensity | 0.7–0.9 (softer than the temple key) | The outro is a quiet, restrained scene. The light is warm but not bright |
| Fill | Soft, warm, low — ambient from the room walls | The outro is not a high-contrast scene. It's a quiet room. Shadows are soft |
| Rim | Minimal — the agent reads as a figure in a warm room, not as a hero separated by rim light | Restraint is the mood |

### 3.2 The quiet dim

After the credits finish (t ≈ 1:27–1:30), the light does a slow dim to darkness over ~2 seconds. Not a cut to black — a slow dim, like a lamp being turned down. The screen settles on the last frame of the human-facing moment (the camera's final held frame) and fades to dark.

The dim is not a transition to a credits overlay. The credits are *in the scene* — they're on the wall behind the agent, written in the typewriter font (ATLAS). The dim is the end of the light, not the end of the credits. After the dim, the scene is dark and the credits are still on the wall (now barely visible). Then the demo ends.

---

## 4. Outro Camera — Turning the Camera on the Human

The outro camera is the most explicitly "addressing the human" camera move in the demo. It is documented in detail in `docs/camera-language.md`, §5. The short version:

1. **Outro start (t = 1:15):** The chase rig releases. The camera cuts to a static, slightly high, three-quarter frame on the agent as the typewriter text writes onto the wall behind them. Focal length: 50mm, f/2.0 nominal. The agent is a real subject in a real room — shallow enough DOF to read as a portrait, deep enough to keep the room legible.

2. **The push-in (after the response is complete, t ≈ 1:18–1:24):** The camera slowly pushes in on the agent's face — not a dolly, a slow focal-length compression from 50mm → 85mm over ~6 seconds, with the rig settling to keep the face framed. This is the move that says "the answer is addressed to someone." The agent's eye-line is toward the response text, which is toward the player — the camera compression plus the eye-line creates the feeling of being looked at through the lens, without a cheap break-the-fourth-wall wink.

3. **Credits roll (t ≈ 1:24–1:27):** The camera releases the agent and drifts to a wider, quieter frame that includes the written response on the wall and the agent in the same shot. The frame is static. The credits are legible. The mood is restraint.

4. **The dim (t ≈ 1:27–1:30):** The light dims slowly; the camera holds the final frame; the screen settles on the human-facing moment and fades to dark.

### 4.1 The human-facing moment — what it is and isn't

The human-facing moment is **not** a literal camera-to-face, a direct address, or a wink. It is the *feeling* of being looked at through the lens. It's achieved by:

- The 50→85mm focal compression (the lens tightening on the agent's face — the audience feels the lens choosing to look at them)
- The agent's eye-line (toward the response text, which is toward the player — the agent is "reading the answer to you," and the camera is watching that act)
- The quiet, held final frame (the camera does not pull away — it stays, as if waiting for a response from the human)

The result should read as: "the agent delivered the answer to you, and now the camera is sitting with you while you read it." That's the human-facing moment.

---

## 5. Attention Beams — Light Shafts in Act 2

The attention beams are the light shafts of the static act (also covered in `docs/lighting-design.md`, §4.3). Here we specify the staging — when they appear, what they do, and how they relate to the camera.

### 5.1 When they appear

The attention beams begin during the dissolve middle, once the cold light intensity is above ~0.3 (lighting-design §3.1). They ramp up as the dissolve completes and the static act begins. By t = 0:52, the beams are fully live.

### 5.2 What they do

The attention beams are gaze-driven volumetric light shafts. They are cold (9000–10000K), they drift slowly, and the brightest beam is the one closest to the camera's current look-at vector.

**The read:** the beams are the latent space "paying attention" to the player. Where the camera looks, the brightest beam is there. The beams lead the eye through the static space. They mark points of interest — the character, the token rivers, the dissolving remnants of the temple — without being explicit pointers. They are the light's attention, not a UI arrow.

### 5.3 Beam count and placement

| Moment | Active beams | Notes |
|---|---|---|
| Dissolve middle (0:47–0:50) | 1–2 | Still ramping up; the beams are emerging from the cold light |
| Static act (0:50–1:15) | 2–4 | Full beam count; the beams lead the eye through the static |
| Approaching the outro transition | beams fade out over 1.5s | The beams die as the outro's warm room light takes over — the cold attention ends, the warm answer begins |

### 5.4 The gaze-coupling contract

The beams are coupled to the camera's look-at vector. The coupling is:

- Beam closest to look-at: full intensity.
- Beams within 30° of look-at: 80% intensity.
- Beams beyond 30° from look-at: 40–60% intensity.
- Beams more than 60° from look-at: minimal or invisible.

This is not a rigid lock — beams have their own drift and lifetime. The coupling is a *bias*, not a servo. The result should feel like the beams are naturally drawn toward where the camera is looking, not like they're being puppeted by it.

---

## 6. The Full Reveal — Sequence Summary

| Time | Event | Camera | Lighting | Beams |
|---|---|---|---|---|
| 0:44–0:45 | Pre-dissolve (chase) | Active chase follow, 45mm | Temple full: 5500K key, god rays live, warm fill | None |
| 0:45 (frame 0) | Dissolve onset | Chase rig stops; look-at locks on dissolving mass; 45→50mm over 0.5s | High-window key cuts; god rays die; warm fill → 0 | Begin emerging as cold >0.3 |
| 0:45–0:50 | Dissolve middle | Static rig, static look-at; watching the melt | 5500→8000K blend; warm fading, cold rising | 1–2 beams, ramping |
| 0:50 | Dissolve end | Rig re-engages, static act targets (height up, look-at biased up) | Static full: 8000K cold key, flicker begins | 2–4 beams, full |
| 0:50–1:15 | Static act | Chase in static space (height raised, look-at biased up) | Cold key (flicker), no fill, cold rim | Beams lead the eye throughout |
| 1:15 | Outro start | Chase releases; cut to static frame on agent, 50mm, f/2.0 | Outro warm room: 3200K lamp-warm, soft fill | Beams fade out over 1.5s |
| 1:18–1:24 | Push-in | 50→85mm focal compression, rig settles on face | Warm held | Beams gone |
| 1:24–1:27 | Credits roll | Wider static frame, agent + response on wall | Warm held | Beams gone |
| 1:27–1:30 | The dim | Final held frame | Slow dim to dark over 2s | Beams gone |
| 1:30 | End | Held frame, fading to dark | Dark | Gone |

---

## 7. Notes for CASE & ATLAS

- **CASE:** The dissolve shader/material is P2 scope, but the dissolve beat's camera timing is P1 — PLEX needs the dissolve start/end times in the game-state FSM so the CameraDirector can trigger the rig-hold and re-engage at the right frames. The dissolve start is t = 0:45 (frame 2700 at 60fps). The dissolve end is t = 0:50 (frame 3000). PLEX will implement the camera response to the dissolve event assuming those times; CASE owns the actual dissolve duration and must keep it within the 5-second window or update PLEX.
- **ATLAS:** The typewriter font and the response text are P3 scope, but the outro framing needs to know where the text lands on the wall so the camera's final held frame includes it legibly. ATLAS should confirm the text block's approximate screen-space position during P1 so PLEX can frame the outro shot against it. The text block is expected to be center-wall, roughly 40% of the frame height, centered horizontally.
- **PLEX:** All of the above is the P0 stub. P1 implementation of the CameraDirector will implement the dissolve beat, the outro camera moves, and the beam gaze-coupling. The lighting transition curve is in `docs/lighting-design.md`.

---

*End of reveal-staging.md. P1 implementation owned by PLEX with CASE (dissolve timing, beam implementation) and ATLAS (outro text placement).*
