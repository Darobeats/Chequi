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
