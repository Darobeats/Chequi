import { test, expect } from 'bun:test';
import { pickRecipients, isValidEmail, fillTemplate } from './ticketEmail.ts';

test('attendees without a valid email are skipped', () => {
  const r = pickRecipients([{ id: '1', email: 'a@b.co' }, { id: '2', email: '' }, { id: '3', email: 'malo@' }], new Set());
  expect(r.send.map((x) => x.id)).toEqual(['1']);
  expect(r.invalid.map((x) => x.id)).toEqual(['2', '3']);
});

test('a ticket already sent is not sent again by default', () => {
  const r = pickRecipients([{ id: '1', email: 'a@b.co' }, { id: '2', email: 'c@d.co' }], new Set(['1']));
  expect(r.send.map((x) => x.id)).toEqual(['2']);
  expect(r.skippedSent.map((x) => x.id)).toEqual(['1']);
});

test('explicit resend includes already-sent attendees', () => {
  const r = pickRecipients([{ id: '1', email: 'a@b.co' }], new Set(['1']), true);
  expect(r.send.length).toBe(1);
});

test('the same attendee is never queued twice', () => {
  const r = pickRecipients([{ id: '1', email: 'A@B.co' }, { id: '1', email: 'A@B.co' }], new Set());
  expect(r.send).toEqual([{ id: '1', email: 'a@b.co' }]);
});

test('email validation and template variables', () => {
  expect(isValidEmail('contacto@chequi.online')).toBe(true);
  expect(isValidEmail('sin arroba')).toBe(false);
  expect(fillTemplate('Hola {nombre}, te esperamos en {evento}', { nombre: 'Ana', evento: 'Feria' })).toBe('Hola Ana, te esperamos en Feria');
});
