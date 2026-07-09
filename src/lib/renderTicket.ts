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

export async function renderTicket(template: TicketTemplate, attendee: Attendee): Promise<Blob> {
  const canvas = document.createElement('canvas');
  let cw = template.canvas_width || 800;
  let ch = template.canvas_height || 600;
  let bgImage: HTMLImageElement | null = null;
  if (template.background_image_url) {
    try { bgImage = await loadImage(template.background_image_url); } catch { /* noop */ }
  }
  if (bgImage && template.background_mode === 'full_ticket') {
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
    const t: any = (template as any).background_transform || {};
    ctx.globalAlpha = typeof t.opacity === 'number' ? t.opacity : (template.background_opacity ?? 0.15);
    if (template.background_mode === 'tile') {
      const p = ctx.createPattern(bgImage, 'repeat');
      if (p) { ctx.fillStyle = p; ctx.fillRect(0, 0, cw, ch); }
    } else {
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
    }
    ctx.globalAlpha = 1;
  }

  for (const el of template.elements || []) {
    if (el.type === 'qr') {
      const data = attendee.qr_code || attendee.ticket_id;
      const url = await QRCode.toDataURL(data, { width: el.width, margin: 0, errorCorrectionLevel: 'M' });
      const img = await loadImage(url);
      ctx.drawImage(img, el.x, el.y, el.width, el.height);
    } else if (el.type === 'text') {
      ctx.font = `${el.bold ? 'bold' : 'normal'} ${el.fontSize || 14}px ${el.fontFamily || 'Arial'}`;
      ctx.fillStyle = el.color || '#000000';
      ctx.textAlign = (el.textAlign || 'left') as CanvasTextAlign;
      const text = getFieldValue(attendee, el.field);
      const tx = el.textAlign === 'center'
        ? el.x + el.width / 2
        : el.textAlign === 'right' ? el.x + el.width : el.x;
      ctx.fillText(text, tx, el.y + (el.fontSize || 14));
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('blob null')), 'image/png', 1.0);
  });
}
