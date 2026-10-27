import { describe, expect, test } from 'bun:test';
import { documentCaptureBounds, documentCaptureSize } from './cedulaImage.ts';
import { AutoCaptureGate } from './frameQuality.ts';

describe('document preparation', () => {
  test('portrait camera captures the visible guide, not the full portrait frame', () => {
    const b = documentCaptureBounds(1080, 1920, 320, 180, true);
    expect(b.sw).toBeCloseTo(820.8);
    expect(b.sh).toBeCloseTo(461.7);
    expect(b.sy).toBeCloseTo(729.15);
  });
  test('4K image is bounded without upscaling smaller cameras', () => {
    expect(documentCaptureSize(3840, 2160)).toEqual({ width: 1280, height: 720 });
    expect(documentCaptureSize(640, 480)).toEqual({ width: 640, height: 480 });
  });
  test('manual capture preserves the whole frame', () => {
    expect(documentCaptureBounds(1080, 1920, 320, 180, false)).toEqual({ sx: 0, sy: 0, sw: 1080, sh: 1920 });
  });
});

describe('consecutive kiosk documents', () => {
  test('stationary first document fires, no initial motion required', () => {
    const gate = new AutoCaptureGate(0);
    const results = [300, 600, 900, 1200].map(t => gate.push(100, 0, t));
    expect(results.at(-1)?.fire).toBe(true);
  });
  test('same document after a result cannot trigger again, new motion rearms', () => {
    const gate = new AutoCaptureGate(0, { requireMotion: true });
    for (let t = 300; t <= 6000; t += 300) expect(gate.push(100, 0, t).fire).toBe(false);
    expect(gate.push(100, 25, 6300).fire).toBe(false);
    let fired = false;
    for (let t = 6600; t <= 8100; t += 300) fired ||= gate.push(100, 0, t).fire;
    expect(fired).toBe(true);
  });
});