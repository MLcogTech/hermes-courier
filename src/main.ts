// main.ts — Hermes Protocol entry point.
// P0: fixed-timestep loop, WebGPU/WGLSL init, temple test scene, perf telemetry.
// P1: CameraManager + TempleLighting (PLEX), GameStateManager (KIPP),
//     temple corridor + token river + on-demand capture (CASE).

import { Renderer, RenderCapabilities } from '@/lib/renderer';
import { InputManager } from '@/lib/input';
import { GameStateManager, GameState } from '@/managers/game-state';
import { ContextWindowManager } from '@/managers/context-window';
import { TokenCounter } from '@/managers/token-counter';
import { TempleWorld } from '@/worlds/temple/world';
import { LatentSpaceWorld } from '@/worlds/latent-space/world';
import { Transition } from '@/worlds/transition';
import { PerformanceMonitor } from '@/lib/performance';
import { FixedTimestepLoop, FIXED_STEP_SEC } from '@/core/FixedTimestepLoop';
import { CameraManager } from '@/camera/CameraManager';
import * as THREE from 'three';

function writePerfOnQuit(perf: PerformanceMonitor): void {
  try { perf.flush(); } catch { /* ignore */ }
  window.addEventListener('beforeunload', () => {
    try { perf.flush(); } catch { /* ignore */ }
  });
}

async function main(): Promise<void> {
  const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('#gl-canvas not found');

  const renderer = new Renderer(canvas);
  await renderer.init();

  const input = new InputManager();
  const gameState = new GameStateManager();
  const contextWindow = new ContextWindowManager();
  const tokenCounter = new TokenCounter();

  // ── P1 corridor + token river ─────────────────────────────────────────────
  const templeWorld = new TempleWorld(renderer.getScene());
  // NOTE: TempleWorld builds its own TempleMaterial internally; the material ref
  // is held for dissolve control if/when GameState exposes a dissolve signal.

  const latent = new LatentSpaceWorld(renderer, input);
  const transition = new Transition(renderer, input);

  // PLEX: CameraManager owns the chase camera (Act 1 + Act 2) and the outro camera.
  const cameraManager = new CameraManager(gameState);
  renderer.setCamera(cameraManager.activeCamera);

  const perf = new PerformanceMonitor();
  perf.setRendererInfo(renderer.getInternalRenderer());
  perf.start();
  writePerfOnQuit(perf);

  // ── on-demand capture (P1) ─────────────────────────────────────────────────
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'c' || e.key === 'C') {
      renderer.capture('/renders');
    }
  });

  // ── fixed-timestep loop ────────────────────────────────────────────────────
  const loop = new FixedTimestepLoop({
    onUpdate: (dt) => {
      contextWindow.update(dt);
      gameState.update(dt, contextWindow.elapsed);

      // PLEX: update camera each fixed tick.
      cameraManager.update(dt);

      switch (gameState.current) {
        case GameState.ACT_1:
          templeWorld.update(dt, renderer.getCamera());
          break;
        case GameState.TRANSITION:
          transition.update(dt);
          break;
        case GameState.ACT_2:
          latent.update(dt);
          break;
        case GameState.EPILOGUE:
          tokenCounter.renderFinal();
          break;
      }
    },
    onRender: () => {
      // PLEX: set the active camera (chase or outro) for this frame.
      renderer.setCamera(cameraManager.activeCamera);
      renderer.render();
      perf.endFrame();
    },
  });

  // Resize handler — PLEX: camera aspect must track window size.
  const onResize = () => {
    renderer.resize();
    cameraManager.resize();
  };
  window.addEventListener('resize', onResize);

  // ── HUD (P0/P1 evidence) ───────────────────────────────────────────────────
  const hud = document.getElementById('hud');
  if (hud) {
    const updateHUD = () => {
      const api = renderer.getAPI();
      const webgpu = api === 'webgpu' ? 'YES' : 'NO';
      const fps = perf.getFPS();
      const ft = perf.getFrameTime();
      const cam = cameraManager.getDescriptor();
      hud.textContent = [
        `Renderer: ${api.toUpperCase()}`,
        `WebGPU: ${webgpu}`,
        `Fixed Step: ${FIXED_STEP_SEC.toFixed(5)}s`,
        `FPS: ${fps.toFixed(1)}`,
        `Frame: ${ft.toFixed(2)}ms`,
        `Budget: ${perf.withinBudget() ? 'OK' : 'OVER'}`,
        `Camera: ${cam}`,
        `Press [C] to capture to /renders`,
      ].join(' | ');
    };
    updateHUD();
    setInterval(updateHUD, 200);
  }

  loop.start();
}

main().catch((err) => {
  console.error('[TARS] Boot failure:', err);
  const el = document.getElementById('boot-error');
  if (el) el.textContent = err.message;
});
