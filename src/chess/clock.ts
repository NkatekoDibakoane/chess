export type ClockSide = 'w' | 'b';

export type ClockState = {
  whiteMs: number;
  blackMs: number;
  active: ClockSide | null;
  flagged: ClockSide | null;
};

export class ChessClock {
  private whiteMs: number;
  private blackMs: number;
  private incrementMs: number;
  private active: ClockSide | null = null;
  private lastTick: number | null = null;

  constructor(initialMs: number, incrementMs: number) {
    this.whiteMs = initialMs;
    this.blackMs = initialMs;
    this.incrementMs = incrementMs;
  }

  reset(initialMs: number, incrementMs: number) {
    this.whiteMs = initialMs;
    this.blackMs = initialMs;
    this.incrementMs = incrementMs;
    this.active = null;
    this.lastTick = null;
  }

  start(side: ClockSide) {
    this.active = side;
    this.lastTick = performance.now();
  }

  pause() {
    this.update();
    this.active = null;
    this.lastTick = null;
  }

  switchTurn(next: ClockSide) {
    this.update();
    this.applyIncrement(this.active);
    this.active = next;
    this.lastTick = performance.now();
  }

  getState(): ClockState {
    this.update();
    const flagged = this.whiteMs <= 0 ? 'w' : this.blackMs <= 0 ? 'b' : null;
    return {
      whiteMs: Math.max(0, this.whiteMs),
      blackMs: Math.max(0, this.blackMs),
      active: this.active,
      flagged,
    };
  }

  private applyIncrement(side: ClockSide | null) {
    if (!side) return;
    if (side === 'w') {
      this.whiteMs += this.incrementMs;
    } else {
      this.blackMs += this.incrementMs;
    }
  }

  private update() {
    if (!this.active || this.lastTick === null) return;
    const now = performance.now();
    const elapsed = now - this.lastTick;
    this.lastTick = now;
    if (this.active === 'w') {
      this.whiteMs -= elapsed;
    } else {
      this.blackMs -= elapsed;
    }
  }
}
