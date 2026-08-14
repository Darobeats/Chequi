import { StaticCanvas, FabricImage } from 'fabric';
import { Attendee, TicketTemplate } from '@/types/database';
import {
  createQrObject,
  createTextObject,
  getFieldValue,
  getTicketQrPayload,
  sanitize,
  waitForFonts,
} from '@/lib/ticketFabric';

export { sanitize, getFieldValue, getTicketQrPayload };

export const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

/**
 * Renders a ticket using the exact same Fabric engine and object factories as
 * the visual editor, so the exported PNG matches the design 1:1.
 */
export async function renderTicketCanvas(
  template: TicketTemplate,
  attendee: Attendee,
): Promise<HTMLCanvasElement> {
  await waitForFonts();

  let cw = template.canvas_width || 800;
  let ch = template.canvas_height || 600;

  let bgImage: HTMLImageElement | null = null;
  if (template.background_image_url) {
    try { bgImage = await loadImage(template.background_image_url); } catch { /* noop */ }
  }
  if (bgImage) {
    cw = bgImage.naturalWidth || bgImage.width || cw;
    ch = bgImage.naturalHeight || bgImage.height || ch;
  }

  const canvas = new StaticCanvas(undefined, {
    width: cw,
    height: ch,
    backgroundColor: '#ffffff',
    renderOnAddRemove: false,
  });

  try {
    if (bgImage) {
      const bg = new FabricImage(bgImage, {
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        scaleX: cw / (bgImage.naturalWidth || bgImage.width || cw),
        scaleY: ch / (bgImage.naturalHeight || bgImage.height || ch),
        opacity: 1,
      });
      canvas.add(bg);
    }

    for (const el of template.elements || []) {
      if (el.type === 'qr') {
        const data = getTicketQrPayload(attendee);
        if (!data) continue;
        canvas.add(await createQrObject(el, data));
      } else if (el.type === 'text') {
        const text = el.content || getFieldValue(attendee, el.field);
        canvas.add(createTextObject(el, text));
      }
    }

    canvas.renderAll();
    return canvas.toCanvasElement(1);
  } finally {
    canvas.dispose();
  }
}

export async function renderTicket(template: TicketTemplate, attendee: Attendee): Promise<Blob> {
  const el = await renderTicketCanvas(template, attendee);
  return new Promise((resolve, reject) => {
    el.toBlob((b) => (b ? resolve(b) : reject(new Error('blob null'))), 'image/png', 1.0);
  });
}

export async function renderTicketDataUrl(template: TicketTemplate, attendee: Attendee): Promise<string> {
  const el = await renderTicketCanvas(template, attendee);
  return el.toDataURL('image/png');
}
