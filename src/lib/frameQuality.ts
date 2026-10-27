/**
 * Calidad de un cuadro de video (RGBA) para captura automática de documentos.
 * sharpness: varianza del Laplaciano en escala de grises (más alto = más nítido).
 * motion: diferencia media absoluta contra el cuadro anterior (0-255).
 */
export function analyzeFrame(
  frame: Uint8ClampedArray,
  prev: Uint8ClampedArray | null,
  width: number,
  height: number,
): { sharpness: number; motion: number } {
  const gray = new Float32Array(width * height);
  let diff = 0;
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * frame[p] + 0.587 * frame[p + 1] + 0.114 * frame[p + 2];
    if (prev) {
      const g2 = 0.299 * prev[p] + 0.587 * prev[p + 1] + 0.114 * prev[p + 2];
      diff += Math.abs(gray[i] - g2);
    }
  }
  let sum = 0, sumSq = 0, n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
      sum += lap; sumSq += lap * lap; n++;
    }
  }
  const mean = n ? sum / n : 0;
  return {
    sharpness: n ? sumSq / n - mean * mean : 0,
    motion: prev ? diff / gray.length : 0,
  };
}

export interface AutoCaptureOptions {
  /** Exigir movimiento antes de disparar (p. ej. tras una lectura fallida, para no repetir la misma escena). */
  requireMotion?: boolean;
  warmupMs?: number;
  timeoutMs?: number;
}

export type GateResult = { fire: false; progress: number } | { fire: true; reason: 'stable' | 'timeout'; progress: 1 };

/**
 * Decide cuándo capturar automáticamente. No exige movimiento previo (salvo requireMotion),
 * usa nitidez relativa al pico observado por esta cámara y tolera el ruido de exposición/enfoque.
 */
export class AutoCaptureGate {
  private smooth = 0;
  private peak = 0;
  private stable = 0;
  private armed: boolean;
  private armedAt: number;
  private readonly warmup: number;
  private readonly timeout: number;
  constructor(private readonly start: number, opts: AutoCaptureOptions = {}) {
    this.armed = !opts.requireMotion;
    this.armedAt = start;
    this.warmup = opts.warmupMs ?? 600;
    this.timeout = opts.timeoutMs ?? 4000;
  }
  push(sharpness: number, motion: number, now: number): GateResult {
    this.smooth = this.smooth * 0.5 + motion * 0.5;
    if (motion > 12) {
      this.stable = 0;
      if (!this.armed) { this.armed = true; this.armedAt = now; }
      return { fire: false, progress: 0 };
    }
    this.peak = Math.max(this.peak, sharpness);
    if (!this.armed || now - this.start < this.warmup) return { fire: false, progress: 0 };
    const sharpOk = sharpness >= Math.max(8, this.peak * 0.55);
    if (this.smooth < 8 && sharpOk) this.stable++; else this.stable = 0;
    if (this.stable >= 3) return { fire: true, reason: 'stable', progress: 1 };
    if (now - this.armedAt >= this.timeout && this.peak >= 15 && this.smooth < 12) {
      return { fire: true, reason: 'timeout', progress: 1 };
    }
    return { fire: false, progress: Math.min(0.95, this.stable / 3 * 0.7 + (now - this.armedAt) / this.timeout * 0.3) };
  }
}
