// CASE's budget enforcer — 16.6ms frame, zero GC
export class PerformanceMonitor {
  private frameStart = 0;
  private frameTime = 0;
  private budget = 16.6;
  private frameCount = 0;
  private fpsHistory: number[] = [];

  start(): void { this.frameStart = performance.now(); }
  beginFrame(): void { this.frameStart = performance.now(); }
  endFrame(): void {
    this.frameTime = performance.now() - this.frameStart;
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      this.fpsHistory.push(this.frameTime);
      if (this.fpsHistory.length > 10) this.fpsHistory.shift();
    }
  }
  withinBudget(): boolean { return this.frameTime < this.budget; }
  getFrameTime(): number { return this.frameTime; }
  getFPS(): number { return this.frameTime > 0 ? 1000 / this.frameTime : 0; }
}
