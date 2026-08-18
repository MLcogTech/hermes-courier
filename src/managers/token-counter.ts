export class TokenCounter {
  private tokens = 0;
  private startTime = 0;

  constructor() { this.startTime = performance.now(); }

  increment(n = 1): void { this.tokens += n; }
  getTokensPerSec(): number {
    const elapsed = (performance.now() - this.startTime) / 1000;
    return elapsed > 0 ? this.tokens / elapsed : 0;
  }

  renderFinal(): void {
    const el = document.getElementById('final-score');
    if (el) el.textContent = `${Math.round(this.getTokensPerSec())} tokens/sec`;
  }
}
