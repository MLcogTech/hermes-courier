// main.ts — Hermes Protocol entry point.
// P0: fixed-timestep loop, WebGPU/WGLSL init, temple test scene, perf telemetry.
// P1: CameraManager (PLEX), TempleLighting (PLEX), GameStateManager (KIPP).
//
// Merge: case/p0 engine wiring + kipp/p0 zero-arg InputManager signature.

import { Renderer } from '@/lib/renderer';
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
  // Best-effort perf dump on page unload — evidence for TARS.
  try {
    perf.flush();
  } catch {
    // ignore
  }
  window.addEventListener('beforeunload', () => {
    try {
      perf.flush();
    } catch {
      // ignore
    }
  });
}

async function main(): Promise<void> {
  const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('#gl-canvas not found');

  const renderer = new Renderer(canvas);
  await renderer.init();

  // KIPP's zero-arg InputManager — keyboard listeners are window-scoped.
  const input = new InputManager();

  const gameState = new GameStateManager();
  const contextWindow = new ContextWindowManager();
  const tokenCounter = new TokenCounter();

  const temple = new TempleWorld(renderer, input);
  temple.init(renderer.getScene());

  const latent = new LatentSpaceWorld(renderer, input);
  const transition = new Transition(renderer, input);

  // PLEX: CameraManager owns the chase camera (Act 1 + Act 2) and the outro camera.
  const cameraManager = new CameraManager(gameState);
  renderer.setCamera(cameraManager.activeCamera);

  const perf = new PerformanceMonitor();
  perf.setRendererInfo(renderer.getInternalRenderer());
  perf.start();
  writePerfOnQuit(perf);

  // Fixed-timestep loop: 60 Hz update, interpolated render.
  const loop = new FixedTimestepLoop({
    onUpdate: (dt) => {
      contextWindow.update(dt);
      gameState.update(dt, contextWindow.elapsed);

      // PLEX: update camera each fixed tick.
      cameraManager.update(dt);

      switch (gameState.current) {
        case GameState.ACT_1:
          temple.update(dt);
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

  // HUD — P0 evidence hook for smoke tests + P1 camera telemetry.
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
