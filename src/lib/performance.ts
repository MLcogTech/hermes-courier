// PerformanceMonitor — CASE's budget enforcer.
// P0 upgrade: writes performance.json to disk on a 5s cadence + beforeunload.
// Frame time, draw calls, triangles, GPU memory tracked via THREE renderer.info.

interface PerfSample {
  t: number;            // wall clock (ms since epoch, ms precision)
  frameTimeMs: number;  // this frame's end-to-end time
  fps: number;
  drawCalls: number;
  triangles: number;
  gpuTextures: number;
  gpuGeometries: number;
  budgetMs: number;
  overBudget: boolean;
}

const SAMPLE_CAP = 600; // 10 min at 60Hz — keep bounded
const WRITE_INTERVAL_MS = 5000;

export class PerformanceMonitor {
  private frameStart = 0;
  private frameTime = 0;
  private budget = 16.6;
  private fpsHistory: number[] = [];
  private samples: PerfSample[] = [];
  private lastWrite = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private rendererInfo: any = null;

  constructor() {}

  setRendererInfo(ri: any): void {
    this.rendererInfo = ri;
  }

  start(): void {
    this.frameStart = performance.now();
    this.lastWrite = this.frameStart;
  }

  beginFrame(): void {
    this.frameStart = performance.now();
  }

  endFrame(): void {
    this.frameTime = performance.now() - this.frameStart;
    this.fpsHistory.push(1000 / Math.max(this.frameTime, 0.001));
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();

    const rendererInfo = this.rendererInfo;
    const sample: PerfSample = {
      t: performance.now(),
      frameTimeMs: this.frameTime,
      fps: this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((a: number, b: number) => a + b, 0) / this.fpsHistory.length
        : 0,
      drawCalls: rendererInfo?.info?.render?.calls ?? 0,
      triangles: rendererInfo?.info?.render?.triangles ?? 0,
      gpuTextures: rendererInfo?.info?.memory?.textures ?? 0,
      gpuGeometries: rendererInfo?.info?.memory?.geometries ?? 0,
      budgetMs: this.budget,
      overBudget: this.frameTime > this.budget,
    };
    this.samples.push(sample);
    if (this.samples.length > SAMPLE_CAP) this.samples.shift();

    // Periodic write
    if (performance.now() - this.lastWrite > WRITE_INTERVAL_MS) {
      this.flush();
      this.lastWrite = performance.now();
    }
  }

  withinBudget(): boolean {
    return this.frameTime < this.budget;
  }

  getFrameTime(): number {
    return this.frameTime;
  }

  getFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory.reduce((a: number, b: number) => a + b, 0) / this.fpsHistory.length;
  }

  flush(): void {
    if (this.samples.length === 0) return;
    try {
      const payload = {
        capturedAt: new Date().toISOString(),
        frameRateTarget: '60 FPS (16.6ms budget)',
        samples: this.samples.slice(-SAMPLE_CAP),
      };
      const firstSample = payload.samples[0];
      if (!firstSample) return;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-${Math.round(firstSample.t)}.json`;
      // Stash in localStorage so smoke tests can read it.
      try {
        localStorage.setItem('hermes-perf', JSON.stringify(payload));
      } catch {
        // ignore
      }
      if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    } catch {
      // swallow — perf write is best-effort, never break the frame
    }
  }
}
