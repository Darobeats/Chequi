import QRCode from 'qrcode';
import { Attendee, TicketTemplate } from '@/types/database';

export const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

export const sanitize = (s: string) =>
  (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'sin_categoria';

export const getFieldValue = (a: Attendee, field?: string) => {
  switch (field) {
    case 'name': return a.name;
    case 'ticket_id': return a.ticket_id;
    case 'category': return a.ticket_category?.name || 'N/A';
    case 'cedula': return a.cedula ? `Cc ${a.cedula}` : 'N/A';
    case 'email': return 'N/A';
    default: return '';
  }
};

const QR_MIN_SIZE = 100;
const QR_QUIET_ZONE_MODULES = 4;

export const getTicketQrPayload = (attendee: Attendee) =>
  (attendee.qr_code || attendee.ticket_id || '').trim();

export async function renderTicket(template: TicketTemplate, attendee: Attendee): Promise<Blob> {
  // Ensure any @font-face loaded via CSS is available before we measure/draw text
  // so exports use the same font metrics as the Fabric editor preview.
  try { if (typeof document !== 'undefined' && (document as any).fonts?.ready) await (document as any).fonts.ready; } catch { /* noop */ }

  const canvas = document.createElement('canvas');
  let cw = template.canvas_width || 800;
  let ch = template.canvas_height || 600;
  let bgImage: HTMLImageElement | null = null;
  if (template.background_image_url) {
    try { bgImage = await loadImage(template.background_image_url); } catch { /* noop */ }
  }
  const isVisualFullTicket = !!bgImage && (template.use_visual_editor || template.background_mode === 'full_ticket');
  if (isVisualFullTicket) {
    cw = bgImage.naturalWidth || bgImage.width;
    ch = bgImage.naturalHeight || bgImage.height;
  }
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);

  if (bgImage) {
    if (isVisualFullTicket) {
      ctx.globalAlpha = 1;
      ctx.drawImage(bgImage, 0, 0, cw, ch);
    } else if (template.background_mode === 'tile') {
      const t: any = (template as any).background_transform || {};
      ctx.globalAlpha = typeof t.opacity === 'number' ? t.opacity : (template.background_opacity ?? 0.15);
      const p = ctx.createPattern(bgImage, 'repeat');
      if (p) { ctx.fillStyle = p; ctx.fillRect(0, 0, cw, ch); }
      ctx.globalAlpha = 1;
    } else {
      const t: any = (template as any).background_transform || {};
      ctx.globalAlpha = typeof t.opacity === 'number' ? t.opacity : (template.background_opacity ?? 0.15);
      let scaleX = t.scaleX, scaleY = t.scaleY, x = t.x, y = t.y;
      const bw = bgImage.width, bh = bgImage.height;
      if (scaleX == null || scaleY == null) {
        const s = template.background_mode === 'contain'
          ? Math.min(cw / bw, ch / bh)
          : Math.max(cw / bw, ch / bh);
        scaleX = s; scaleY = s;
        x = (cw - bw * s) / 2; y = (ch - bh * s) / 2;
      }
      const angle = t.angle || 0;
      if (angle) {
        const centerX = (x ?? 0) + (bw * scaleX) / 2;
        const centerY = (y ?? 0) + (bh * scaleY) / 2;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(bgImage, -(bw * scaleX) / 2, -(bh * scaleY) / 2, bw * scaleX, bh * scaleY);
        ctx.restore();
      } else {
        ctx.drawImage(bgImage, x ?? 0, y ?? 0, bw * scaleX, bh * scaleY);
      }
      ctx.globalAlpha = 1;
    }
  }

  for (const el of template.elements || []) {
    if (el.type === 'qr') {
      const data = getTicketQrPayload(attendee);
      if (!data) continue;
      // QR codes must remain square and include a white quiet zone. A stretched
      // QR or margin: 0 over a designed background can become unreadable.
      const qrSize = Math.max(QR_MIN_SIZE, Math.round(el.width || QR_MIN_SIZE), Math.round(el.height || QR_MIN_SIZE));
      const url = await QRCode.toDataURL(data, {
        width: qrSize,
        margin: QR_QUIET_ZONE_MODULES,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      const img = await loadImage(url);
      ctx.drawImage(img, el.x, el.y, qrSize, qrSize);
    } else if (el.type === 'text') {
      const fontSize = el.fontSize || 14;
      ctx.font = `${el.bold ? 'bold' : 'normal'} ${fontSize}px ${el.fontFamily || 'Arial'}`;
      ctx.fillStyle = el.color || '#000000';
      // Fabric Text in the editor is positioned by its left/top bounding box;
      // for single-line labels textAlign does not move that box. Draw from x
      // so export matches the editor instead of re-centering/re-right-aligning.
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const text = el.content || getFieldValue(attendee, el.field);
      ctx.fillText(text, el.x, el.y);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('blob null')), 'image/png', 1.0);
  });
}
