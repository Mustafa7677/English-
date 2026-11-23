// Keyboard + mouse (pointer lock) input with per-frame edge detection.
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  'KeyC', 'KeyE', 'KeyF', 'KeyR', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mdx = 0; this.mdy = 0;
    this.mouseDown = false;
    this.locked = false;
    this.sensitivity = 1;
    this.onLockChange = null;

    window.addEventListener('keydown', (e) => {
      if (this.locked && GAME_KEYS.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      // ignore absurd spikes some browsers emit on lock
      if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;
      this.mdx += e.movementX; this.mdy += e.movementY;
    });
    document.addEventListener('mousedown', () => { this.mouseDown = true; });
    document.addEventListener('mouseup', () => { this.mouseDown = false; });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.down.clear();
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  lock() {
    try {
      const r = this.canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* browser refused (e.g. lock cooldown) — user clicks again */ }
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  is(...codes) { return codes.some((c) => this.down.has(c)); }
  hit(...codes) { return codes.some((c) => this.pressed.has(c)); }

  /** Call once at end of every frame. */
  endFrame() { this.pressed.clear(); this.mdx = 0; this.mdy = 0; }
}
