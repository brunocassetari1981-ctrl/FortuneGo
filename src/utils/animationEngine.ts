/**
 * FortuneGo Animation Engine — High-performance RAF-based animation core
 * 
 * Provides deterministic, frame-rate independent animations for:
 * - Slot reels (three rectangles)
 * - Roulette wheel (Rainbow Fortune Wheel)
 * - Board dice / pawn movement
 * 
 * Guarantees 60fps fluidity via requestAnimationFrame + will-change + transform3d.
 * Uses cubic-bezier easing for natural start/cruise/deceleration phases.
 */

// ─── Easing Curves ────────────────────────────────────────────────────────────

/** Cubic bezier evaluator (0,0) -> (1,1) via de Casteljau. p1/p2 are control points. */
export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  // Precompute polynomial coefficients
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  function solveCurveX(x: number, epsilon = 1e-6): number {
    let t0 = 0, t1 = 1, t2 = x, d2 = 0;
    // Newton-Raphson
    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < epsilon) return t2;
      d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 -= x2 / d2;
    }
    // Bisection fallback
    t0 = 0; t1 = 1; t2 = x;
    if (t2 < t0) return t0;
    if (t2 > t1) return t1;
    while (t0 < t1) {
      const x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      if (x > x2) t0 = t2; else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return t2;
  }

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleCurveY(solveCurveX(x));
  };
}

// Preset curves matching FortuneGo feel
export const Easing = {
  /** Gentle start — reels wind up */
  easeInQuad: cubicBezier(0.55, 0.085, 0.68, 0.53),
  /** Smooth cruise */
  easeInOutQuad: cubicBezier(0.455, 0.03, 0.515, 0.955),
  /** Natural deceleration — reels settle (overshoot-free) */
  easeOutCubic: cubicBezier(0.215, 0.61, 0.355, 1),
  /** Wheel snap — exponential decay */
  easeOutExpo: cubicBezier(0.19, 1, 0.22, 1),
  /** Dice bounce */
  easeOutBack: cubicBezier(0.175, 0.885, 0.32, 1.275),
  /** Linear for tick sync */
  linear: (t: number) => t,
};

// ─── RAF Loop Helper ────────────────────────────────────────────────────────

export interface AnimationHandle {
  cancel: () => void;
  readonly active: boolean;
}

/**
 * Frame-rate independent animation loop.
 * @param durationMs total duration
 * @param easing easing function (0..1 -> 0..1)
 * @param onFrame callback with eased progress 0..1
 * @param onComplete optional completion
 * Returns handle to cancel.
 */
export function animate(
  durationMs: number,
  easing: (t: number) => number,
  onFrame: (eased: number, raw: number) => void,
  onComplete?: () => void
): AnimationHandle {
  let raf = 0;
  let cancelled = false;
  const start = performance.now();

  const tick = (now: number) => {
    if (cancelled) return;
    const elapsed = now - start;
    const raw = Math.min(elapsed / durationMs, 1);
    const eased = easing(raw);
    onFrame(eased, raw);
    if (raw < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      onComplete?.();
    }
  };
  raf = requestAnimationFrame(tick);

  return {
    cancel: () => { cancelled = true; cancelAnimationFrame(raf); },
    get active() { return !cancelled; }
  };
}

/**
 * Staggered multi-track animation — e.g. 5 reels with delays.
 * Each track runs same duration/easing but offset.
 */
export function staggerAnimate(
  count: number,
  delayMs: number,
  durationMs: number,
  easing: (t: number) => number,
  onFrame: (index: number, eased: number, raw: number) => void,
  onComplete?: () => void
): AnimationHandle[] {
  const handles: AnimationHandle[] = [];
  let completed = 0;
  for (let i = 0; i < count; i++) {
    const startDelay = i * delayMs;
    const handle = (() => {
      let raf = 0; let cancelled = false;
      const start = performance.now() + startDelay;
      const tick = (now: number) => {
        if (cancelled) return;
        if (now < start) { raf = requestAnimationFrame(tick); return; }
        const elapsed = now - start;
        const raw = Math.min(elapsed / durationMs, 1);
        const eased = easing(raw);
        onFrame(i, eased, raw);
        if (raw < 1) raf = requestAnimationFrame(tick);
        else {
          completed++;
          if (completed === count) onComplete?.();
        }
      };
      raf = requestAnimationFrame(tick);
      return {
        cancel: () => { cancelled = true; cancelAnimationFrame(raf); },
        get active() { return !cancelled; }
      };
    })();
    handles.push(handle);
  }
  return handles;
}

// ─── Spin Physics Helpers ───────────────────────────────────────────────────

/** Compute final reel offset that aligns symbol perfectly to pixel grid (no subpixel drift). */
export function snapToRow(offset: number, rowHeight: number): number {
  return Math.round(offset / rowHeight) * rowHeight;
}

/** Wheel rotation target: ensures exact segment-to-pointer alignment. */
export function computeWheelTarget(
  currentRotation: number,
  segmentIndex: number,
  segmentCount: number,
  extraSpins: number
): number {
  const degPerSeg = 360 / segmentCount;
  const segmentCenter = segmentIndex * degPerSeg + degPerSeg / 2;
  const targetDeg = (360 - segmentCenter + 270) % 360; // pointer at 12 o'clock (270deg offset)
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const delta = (targetDeg - currentMod + 360) % 360;
  return currentRotation + extraSpins * 360 + delta;
}
