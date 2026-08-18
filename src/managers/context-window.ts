// The reaper — shrinks over 90 seconds, drives visual FX
export class ContextWindowManager {
  total: number = 90;
  elapsed: number = 0;
  private _windowFraction = 1.0;

  update(dt: number): void {
    this.elapsed += dt;
    this._windowFraction = Math.max(0, 1 - (this.elapsed / this.total));
  }

  getWindowFraction(): number { return this._windowFraction; }
}
