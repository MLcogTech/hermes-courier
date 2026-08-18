# Lighting Design — Temple, Reveal, Latent Space

**Game:** Hermes Protocol  
**Author:** PLEX (cinematography lane)  
**Status:** P0 foundation stub — ready for P1 implementation  
**Color authority:** CIE 1931 chromaticity targets are given per act. The actual in-engine lights use sRGB/Rec.709; the Kelvin figures below are the *creative intent*, not the literal light color. CASE converts Kelvin → RGB for the renderer using a standard Planckian-to-RGB approximation; PLEX signs off on the result visually.

---

## 1. Lighting Philosophy

The lighting story is the story of the hallucination collapsing. Act 1 is warm, trustworthy, marble-and-light — the kind of lighting that says "this is real, look at it." Act 2 is cold, harsh, flickering — the lighting of a machine room at 3am, a server rack, a latent space that doesn't want to be seen. The transition between them (the reveal) is the lighting's most important beat.

Three rules:

1. **One key per act.** Every act has a dominant light that defines the mood. Fill and rim exist, but they serve the key. The temple's key is the high window. The static's key is the harsh overhead cold.
2. **Light as narrative.** The god rays in the temple are not decoration — they are the visual argument that "this place is alive, this place is holy." The attention beams in Act 2 are the visual argument that "the world is watching you now."
3. **No flat fill.** A fill that fills everything kills the mood. Fill should be partial — enough to read the geometry, not enough to erase the shadows. The temple's shadows are warm; the static's shadows are cold and sharp.

---

## 2. Act 1 — The Temple

### 2.1 Key Light — High Window

The temple's primary light source is a single high window, directional, warm-daylight, punching down into the temple volume.

| Parameter | Value | Notes |
|---|---|---|
| Type | Directional (sun-style) | Parallel rays, defined direction, no positional falloff — it's a window, not a point light |
| Direction | From above, ~30° off vertical, angled down into the temple hall | The window is conceptually high on the temple's back wall; the light rakes across the marble floor and the GPU-rack pillars |
| Color temperature (creative intent) | **5500K** — direct noon daylight | Warm enough to feel natural, not so warm it reads as golden-hour \mood\. The temple is "trustworthy daylight," not "sunset cinematic." |
| Approximate RGB (Planckian → sRGB, for CASE) | ~(1.0, 0.97, 0.92) at full intensity | Warm white, slightly yellow — the daylight feel |
| Intensity | 1.0 (renderer units) at the window aperture; linear falloff into the volume | Bright enough that the marble floor specular reads; not so bright that the pillars blow out |
| Volume / god rays | **Enabled** — the window light passes through a volumetric scattering volume in the temple hall | See §2.3 |

### 2.2 Fill — Ambient Bounce

The temple's fill is a warm, low-intensity ambient derived from the marble floor bounce — not a flat gray hemisphere. The marble is light-colored and reflective, so the fill under the pillars and in the corridor shadows is a warm light-gray, not a cool shadow.

| Parameter | Value | Notes |
|---|---|---|
| Type | Hemisphere / ambient + subtle bounce from floor | CASE determines the exact sampling — PLEX signs the look |
| Color temperature (creative intent) | ~4500K (warm bounce) | Slightly warmer than the key because it's bounced from warm marble |
| Intensity | 0.18–0.25 of the key (roughly 18–25% fill ratio) | Enough to read the pillars in shadow; not enough to flatten the volumetric light |
| Directionality | From below (floor bounce), subtle | The fill should feel like it's coming off the marble, not from a ceiling dome |

### 2.3 Rim — Pillar Edge Separation

Each GPU-rack pillar and major temple column carries a subtle rim from the window light grazing its edge. This rim is what separates the geometry from the background volume and gives the temple its "marble against light" read.

| Parameter | Value | Notes |
|---|---|---|
| Source | The same high-window directional, grazing the pillar edges | Not a separate rim light — the window does double duty as key and rim. A second rim would make the temple feel lit-by-committee |
| Intensity at edge | 0.8–1.2× the key at the contact point, falling off quickly along the pillar height | The rim is a grazing-angle effect, not a fill |
| Color | Same as key — 5500K | No color separation on the rim; the temple is unified warm light |

### 2.4 God Rays — Volumetric Pull-Away

The temple's signature lighting moment is the god-ray pull-away. As the camera moves from the temple establishing shot toward the chase rig handoff, the volumetric light from the high window reads as visible shafts of light cutting through the temple dust/haze.

| Parameter | Value | Notes |
|---|---|---|
| Medium | Exponential height fog / volumetric scattering volume in the temple hall | CASE owns the medium; PLEX owns the intensity and color |
| Scattering coefficient | tuned so shafts are visible but not thick — the temple is clear air, not fog | The shafts should read as "sunlight in a dusty temple," not "fog machine" |
| Color | Same as key — 5500K | The rays are the key light's volume, not a separate color |
| Intended moment | Temple establishing wide → chase handoff | The pull-away is the camera moving through the shafts, not the light changing. The light stays put; the camera earns the read |
| Reveal transition | The god rays die with the temple — they are part of the hallucination and dissolve with it | See §3 |

### 2.5 Color Temperature Summary — Temple

| Light | Creative Kelvin | Approx RGB (sRGB) | Role |
|---|---|---|---|
| High window (key) | 5500K | (1.0, 0.97, 0.92) | Defines the temple |
| Floor bounce (fill) | 4500K | warm light gray, ~0.25 intensity | Reads the shadows warm |
| Pillar rim | 5500K (grazing) | same as key | Separates geometry |

The temple is a unified warm space. No cold light in Act 1. If you see blue in the temple, something is wrong — unless it's the token rivers, which are emissive and get their own treatment in the art spec (ATLAS).

---

## 3. The Reveal — Lighting Transition

The reveal is the moment the temple dissolves and the static is revealed underneath. The lighting transition is part of the reveal, not a follow-on. The light must change *with* the dissolve, not after it.

### 3.1 Beat-by-Beat Lighting Curve

The dissolve happens at t = 0:45 (see SPEC §1). The lighting transition is timed to the dissolve, with a specific curve.

**Pre-dissolve (t = 0:44–0:45):** Full temple lighting. High window key at 5500K, god rays live, fill warm. The temple is at full visual trust.

**Dissolve onset (t = 0:45, frame 0 of dissolve):** The high-window key *cuts* — not a fade, a cut. The god rays vanish with it (they are the window's volume; no window, no rays). The temple marble goes dark at the same rate as the geometry dissolves.

**Dissolve middle (t = 0:45–0:50):** As the temple geometry dissolves, a cold light rises from below/atmosphere. This is the static's key bleeding in. The transition is a blend from 5500K warm → 8000K cold over ~2.5 seconds, with the cold intensity rising from 0 to 1.0 as the warm intensity drops from 1.0 to 0.

**Dissolve end (t = 0:50):** Temple is gone. Static key is at full 8000K. God rays are replaced by attention beams from below/within the volume (see §4).

**Formula for the blend (PLEX gives the curve; CASE implements the timing):**

```
warmIntensity(t)  = 1.0 - smoothstep(0.0, 1.0, t_norm)   // t_norm: 0 at dissolve start, 1 at dissolve end
coldIntensity(t)  = smoothstep(0.0, 1.0, t_norm)
effectiveKelvin(t) = lerp(5500K, 8000K, coldIntensity(t))
```

The blink/flicker of the cold light (see §4.2) begins *during* the dissolve middle, once cold intensity is above ~0.3 — the flicker is part of the reveal, not a separate event.

### 3.2 No Warm Residual After Dissolve

A common mistake in dissolve sequences is leaving a warm "ghost" of the old world. In this demo, the temple warm light does not linger. Once the dissolve is done, the space is fully cold. The only warmth in Act 2 is the token rivers' emissive (ATLAS) and any HUD-adjacent cues (which are P1 scope). The environment is cold from the dissolve onward.

> **Hard rule:** if a screenshot of the post-reveal world shows warm light in the environment, the transition is wrong and the gate fails. The critic catches this.

---

## 4. Act 2 — Static / Latent Space

### 4.1 Key Light — Cold, Harsh, Overhead

The static's key is the opposite of the temple's. No warm window. No soft ambient. A cold, harsh, directional light from above, as if the space is under a cold ceiling light or the sky itself has gone cold.

| Parameter | Value | Notes |
|---|---|---|
| Type | Directional (harsh, narrow) | Sharper than the temple key — the static is not a soft space |
| Direction | From directly above (or near-above, ±10°) | Overhead harsh light — the character casts a short, hard shadow |
| Color temperature (creative intent) | **8000K** — cold daylight / overcast sky bounce | The blue-white cold of a machine room at night, of latent space |
| Approximate RGB (Planckian → sRGB, for CASE) | ~(0.85, 0.9, 1.0) at full intensity | Cold white with a blue cast — the latent-space feel |
| Intensity | 0.9–1.0 (slightly less than temple key, but harsher because there's no warm fill to soften it) | The cold should feel exposing, not cozy |
| Fill | **None** (or negligible) — the static is a high-contrast space | No warm bounce. Shadows are cold and hard. The absence of fill is the point |
| Rim | Cold rim from the same key, grazing the character from above-back | Same logic as temple — one key, double duty — but now the rim is cold |

### 4.2 Flicker — Harsh Cold Stutter

The cold key in Act 2 is not a steady light. It flickers — irregularly, harshly, as if the space is unstable or the light source itself is glitchy. This is the visual signature of the static act: the world is not just cold, it's *failing*.

| Parameter | Value | Notes |
|---|---|---|
| Flicker type | Irregular intensity modulation on the cold key | Not a periodic "faulty fluorescent" hum — that's too regular. The flicker should feel like a light that's losing coherence |
| Frequency distribution | Random-interval drops of 0.3–0.7 seconds, intensity dip of 30–60%, recovery not always to 1.0 (sometimes to 0.8, sometimes to 1.0) | The irregularity is the signature. CASE implements the random distribution; PLEX signs the look |
| Color shift on dip | On a deep dip (>45% intensity drop), the light shifts slightly cooler (toward 10000K) — the flicker is not just dimmer, it's *colder* at the bottom of the dip | The cold gets colder at the worst moments — that's the emotional read |
| Minimum intensity floor | 0.4 — the light never goes fully dark (the space is still lit, just badly) | Full blackout would break readability; we want harsh, not blind |
| Maximum intensity ceiling | 1.0 — the light recovers fully sometimes, not always | The recovery is unreliable, which is the point |

The flicker is a performance concern (it's a per-frame intensity modulation on a directional). CASE budgets it; PLEX insists on it. If the flicker breaks the 16.6ms budget, CASE finds a cheaper way to get the look — but the look itself is non-negotiable for the gate. A static act without flicker reads as a generic dark level, not the hallucination-collapse second half.

### 4.3 Attention Beams — Act 2 Light Shafts

In the static act, the world is lit by *attention beams* — volumetric light shafts that draw the eye to points of interest. Unlike the temple's god rays (which are warm and come from a fixed window), the attention beams are cold, come from below/within the volume, and are *gaze-driven* — they track what the camera is looking at.

| Parameter | Value | Notes |
|---|---|---|
| Type | Volumetric light shafts (subsurface scattering / in-scattering in the fog volume) | CASE owns the medium; PLEX owns the color, direction, and gaze coupling |
| Color temperature (creative intent) | **9000K–10000K** — cold, blue-white shafts | Colder than the ambient key — the beams are the coldest light in the scene, the "attention" marker |
| Approximate RGB | ~(0.7, 0.8, 1.0) at full intensity | Distinctly blue-white — reads as "nothing here is warm" |
| Number of active beams | 2–4 at a time, not a field of them | Beams are specific and intentional, not ambient noise |
| Gaze coupling | The beam closest to the camera's current look-at vector is the brightest; beams near the look-at are at full intensity, beams far from it are at 40–60% | The beams lead the eye — wherever the camera looks, the brightest shaft is there. This is a camera–lighting coupling that PLEX and CASE must agree on |
| Motion | Beams drift slowly — they are not static lines. Each beam has a slow drift in position and intensity (independent of the flicker) | Movement keeps the beams alive; otherwise they read as frozen geometry |
| Lifetime | Each beam lives for 4–8 seconds, then fades and respawns elsewhere | Beams are transient — they mark a moment of attention, not a permanent structure |

> **Attention-beam contract:** the beams are the visual proxy for "the latent space is paying attention to you." They are not a generic fog effect. If a screenshot shows beams that don't relate to where the camera is looking, the look is wrong.

### 4.4 Color Temperature Summary — Static

| Light | Creative Kelvin | Approx RGB (sRGB) | Role |
|---|---|---|---|
| Cold key (overhead) | 8000K | (0.85, 0.9, 1.0) | Defines the static — harsh, exposing |
| Attention beams | 9000–10000K | (0.7, 0.8, 1.0) | Gaze-driven shafts — the "watching" light |
| Fill | none / negligible | — | High contrast; shadows are hard and cold |
| Rim | 8000K (grazing from above) | same as key | Separates character from cold background |

The static is a cold, harsh, flickering space with cold attention beams leading the eye. No warm light anywhere in the environment. The only warmth is the token rivers' emissive (ATLAS) and the typewriter text in the outro (ATLAS + PLEX).

---

## 5. Transition Summary — The Lighting Arc

| Moment | Time | Key color (K) | Key intensity | God rays / beams | Fill |
|---|---|---|---|---|---|
| Temple full | 0:00–0:44 | 5500K | 1.0 | God rays live (warm, from window) | Warm bounce, 0.25 |
| Dissolve onset | 0:45 | 5500K → cutting | 1.0 → 0 | God rays die with window | Warm → 0 |
| Dissolve middle | 0:45–0:50 | 5500→8000K blend | warm 1→0, cold 0→1 | Cold beams begin (once cold >0.3) | Cold, no bounce |
| Static full | 0:50–1:15 | 8000K (flicker) | 0.4–1.0 (flicker) | Attention beams live (cold, gaze-driven) | None |
| Outro | 1:15–1:30 | see Reveal Staging §3 | — | — | — |

The arc is: warm trustworthy daylight → abrupt cold with flicker → cold attention beams watching the player. Each transition is a lighting event, not a fade. The audience should feel the mood shift in their gut, not just see the color change.

---

## 6. Outro Lighting

The outro lighting is documented in `docs/reveal-staging.md`, §3. The short version: the outro is a single, clean, warm-light scene (the "room" the agent is in as the response types) at ~3200K warm incandescent — a deliberate return to warmth, but a different warmth than the temple. The temple was daylight-warm; the outro is lamp-warm. The warmth in the outro is the warmth of a human room, not the warmth of a hallucination. After the credits, the light goes quiet — a slow dim to darkness over the final credit, leaving the screen on the human-facing moment.

Full staging in `docs/reveal-staging.md`.

---

## 7. Performance Notes

The lighting in Act 2 (flicker + attention beams) is the heaviest lighting load in the demo. CASE budgets it against the 16.6ms frame budget. PLEX's constraints:

1. **Flicker is per-frame, but it's a single float multiply on the key's intensity.** CASE should not implement flicker as a separate light update pass. It's a parameter modulation, not a scene-graph walk.
2. **Attention beams are volumetric — the cost is in the fog/in-scattering pass, not in the beam geometry.** CASE controls the number of active beams and the scattering cost; PLEX controls the look. If the beams break the budget, the answer is fewer beams or cheaper scattering, not "drop the beams."
3. **No real-time shadow maps for the cold key in Act 2.** The harsh overhead cold uses a single static shadow / contact shadow approach, not a full dynamic shadow map per frame. The static is a dark level; we can afford a cheaper shadow solution there. PLEX signs the look; CASE picks the cost.

---

*End of lighting-design.md. P1 implementation owned by PLEX (look, color, transition curve) with CASE (renderer cost, fog, beam implementation, shadow approach).*
