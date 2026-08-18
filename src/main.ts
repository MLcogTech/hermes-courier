import { Renderer } from '@/lib/renderer';
import { InputManager } from '@/lib/input';
import { GameStateManager, GameState } from '@/managers/game-state';
import { ContextWindowManager } from '@/managers/context-window';
import { TokenCounter } from '@/managers/token-counter';
import { TempleWorld } from '@/worlds/temple/world';
import { LatentSpaceWorld } from '@/worlds/latent-space/world';
import { Transition } from '@/worlds/transition';
import { PerformanceMonitor } from '@/lib/performance';
import { Scene } from '@/lib/scene';

// Hermes Protocol — built by bots, gated by evidence.
async function main(): Promise<void> {
  const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('#gl-canvas not found');

  const renderer = new Renderer(canvas);
  await renderer.init();

  const input = new InputManager();
  const scene = new Scene();

  const gameState = new GameStateManager();
  const contextWindow = new ContextWindowManager();
  const tokenCounter = new TokenCounter();

  const temple = new TempleWorld(renderer, input);
  const latent = new LatentSpaceWorld(renderer, input);
  const transition = new Transition(renderer, input);

  const perf = new PerformanceMonitor();
  perf.start();

  let lastTime = performance.now();

  const loop = (time: number): void => {
    const dt = Math.min((time - lastTime) / 1000, 0.05); // clamp to 50ms
    lastTime = time;

    perf.beginFrame();

    // CASE: enforce 16.6ms budget
    if (!perf.withinBudget()) {
      console.warn('[TARS] Budget overrun — frame skipped for stability');
      requestAnimationFrame(loop);
      return;
    }

    contextWindow.update(dt);
    gameState.update(dt, contextWindow.elapsed);

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

    renderer.render(scene, dt);
    perf.endFrame();

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

main().catch((err) => {
  console.error('[TARS] Boot failure:', err);
  document.getElementById('boot-error')!.textContent = err.message;
});
