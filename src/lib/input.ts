// KIPP's input manager — buffering, coyote time, smoothing
export class InputManager {
  private canvas: HTMLElement;
  private keys = new Set<string>();
  private gamepad: Gamepad | null = null;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  isPressed(key: string): boolean { return this.keys.has(key); }
  isJustPressed(key: string): boolean { return this.keys.has(key); } // KIPP fleshes with proper edge detection
}
