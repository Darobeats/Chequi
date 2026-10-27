/** Crop the visible guide, accounting for object-cover on portrait mobile cameras. */
export function documentCaptureBounds(width: number, height: number, viewWidth: number, viewHeight: number, guided: boolean) {
  let sw = width, sh = height;
  if (guided && viewWidth > 0 && viewHeight > 0) {
    const ratio = viewWidth / viewHeight;
    if (width / height > ratio) sw = height * ratio;
    else sh = width / ratio;
  }
  const inset = guided ? 0.12 : 0;
  return { sx: (width - sw) / 2 + sw * inset, sy: (height - sh) / 2 + sh * inset, sw: sw * (1 - inset * 2), sh: sh * (1 - inset * 2) };
}

export function documentCaptureSize(width: number, height: number) {
  const scale = Math.min(1, 1280 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Bound upload bytes without further reducing text resolution. JPEG works on iOS Safari. */
export async function encodeDocumentImage(canvas: HTMLCanvasElement): Promise<string> {
  let blob: Blob | null = null;
  for (const quality of [0.78, 0.7, 0.62]) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('No se pudo preparar la imagen');
    if (blob.size <= 300 * 1024) break;
  }
  if (!blob) throw new Error('No se pudo preparar la imagen');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagen inválida'));
    reader.onerror = () => reject(new Error('No se pudo preparar la imagen'));
    reader.readAsDataURL(blob);
  });
}