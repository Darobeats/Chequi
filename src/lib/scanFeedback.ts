/**
 * Audio + haptic feedback for scanner events.
 * Uses Web Audio API to synthesize short tones (no asset download required → works offline).
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  try {
    const Ctor =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function beep(freq: number, durationMs: number, type: OscillatorType = "sine", volume = 0.15) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // silent
  }
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignored
    }
  }
}

export const scanFeedback = {
  success() {
    beep(880, 120, "sine", 0.18);
    setTimeout(() => beep(1320, 100, "sine", 0.15), 90);
    vibrate(80);
  },
  offlineSuccess() {
    beep(660, 100, "triangle", 0.16);
    setTimeout(() => beep(880, 100, "triangle", 0.14), 70);
    vibrate([60, 40, 60]);
  },
  duplicate() {
    beep(220, 220, "square", 0.18);
    vibrate([200, 100, 200, 100, 200]);
  },
  denied() {
    beep(180, 350, "sawtooth", 0.2);
    vibrate([300, 100, 300]);
  },
  warning() {
    beep(440, 200, "triangle", 0.15);
    vibrate(150);
  },
};
