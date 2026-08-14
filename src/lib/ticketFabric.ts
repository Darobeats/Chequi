import QRCode from 'qrcode';
import { FabricImage, Text } from 'fabric';
import type { TicketElement, Attendee } from '@/types/database';

export const QR_MIN_SIZE = 100;
export const QR_DEFAULT_SIZE = 150;
export const QR_QUIET_ZONE_MODULES = 4;

/** Square size actually used for a QR element (never below the readable minimum). */
export const resolveQrSize = (el: Pick<TicketElement, 'width' | 'height'>) =>
  Math.max(
    QR_MIN_SIZE,
    Math.round(el.width || QR_DEFAULT_SIZE),
    Math.round(el.height || QR_DEFAULT_SIZE),
  );

/** Single place where QR image parameters live: editor and export must match. */
export const buildQrDataUrl = (data: string, size: number) =>
  QRCode.toDataURL(data, {
    width: size,
    margin: QR_QUIET_ZONE_MODULES,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

/** QR payload for an attendee. Keeps already distributed codes valid. */
export const getTicketQrPayload = (attendee: Attendee) =>
  (attendee.qr_code || attendee.ticket_id || '').trim();

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

export const getSampleText = (field?: string) => {
  switch (field) {
    case 'name': return 'Juan Pérez';
    case 'email': return 'juan@example.com';
    case 'ticket_id': return 'EVT-VIP-ABC1-2024';
    case 'category': return 'VIP';
    case 'cedula': return 'Cc 1234567890';
    default: return 'Texto de ejemplo';
  }
};

/**
 * Creates the Fabric QR object exactly the same way in the editor and in the
 * export engine, so positions can never drift between the two.
 */
export async function createQrObject(element: TicketElement, data: string) {
  const qrSize = resolveQrSize(element);
  const dataUrl = await buildQrDataUrl(data, qrSize);
  const img = await FabricImage.fromURL(dataUrl);
  img.set({
    left: element.x,
    top: element.y,
    originX: 'left',
    originY: 'top',
    scaleX: qrSize / (img.width || 1),
    scaleY: qrSize / (img.height || 1),
  });
  return img;
}

/** Creates the Fabric text object shared by editor and export engine. */
export function createTextObject(element: TicketElement, text: string) {
  return new Text(text, {
    left: element.x,
    top: element.y,
    originX: 'left',
    originY: 'top',
    fontSize: element.fontSize || 14,
    fontFamily: element.fontFamily || 'Arial',
    fill: element.color || '#000000',
    fontWeight: element.bold ? 'bold' : 'normal',
    textAlign: element.textAlign || 'left',
    lineHeight: 1,
    charSpacing: 0,
  });
}

/** Waits for webfonts so text metrics match between editor and export. */
export async function waitForFonts() {
  try {
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
  } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Simple mode (no artwork): elements are derived from the field switches.
// ---------------------------------------------------------------------------

export const SIMPLE_TICKET_WIDTH = 600;
export const SIMPLE_TICKET_HEIGHT = 800;

export interface SimpleTicketConfig {
  qr_size?: number;
  show_name?: boolean;
  show_email?: boolean;
  show_category?: boolean;
  show_ticket_id?: boolean;
}

/**
 * Builds the element list for a ticket without artwork: QR always present and
 * centered on top, active fields stacked underneath.
 */
export function buildSimpleElements(config: SimpleTicketConfig): TicketElement[] {
  const qrSize = Math.max(QR_MIN_SIZE, Math.round(config.qr_size || 250));
  const elements: TicketElement[] = [];

  const qrX = Math.round((SIMPLE_TICKET_WIDTH - qrSize) / 2);
  const qrY = 80;
  elements.push({
    id: 'simple-qr',
    type: 'qr',
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  const fields: Array<{ field: TicketElement['field']; fontSize: number; bold: boolean }> = [];
  if (config.show_name !== false) fields.push({ field: 'name', fontSize: 34, bold: true });
  if (config.show_email) fields.push({ field: 'cedula', fontSize: 24, bold: false });
  if (config.show_category) fields.push({ field: 'category', fontSize: 24, bold: false });
  if (config.show_ticket_id) fields.push({ field: 'ticket_id', fontSize: 20, bold: false });

  let y = qrY + qrSize + 48;
  fields.forEach((f, i) => {
    elements.push({
      id: `simple-${f.field}-${i}`,
      type: 'text',
      x: 40,
      y,
      width: SIMPLE_TICKET_WIDTH - 80,
      height: f.fontSize,
      field: f.field,
      fontSize: f.fontSize,
      fontFamily: 'Arial',
      textAlign: 'center',
      color: '#000000',
      bold: f.bold,
    });
    y += f.fontSize + 22;
  });

  return elements;
}
