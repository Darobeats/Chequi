export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (e?: string | null) => !!e && e.length <= 255 && EMAIL_RE.test(e.trim());

export interface EmailCandidate { id: string; email?: string | null }

/**
 * Decide who receives a campaign:
 * - attendees without a valid email are skipped (reported as `invalid`)
 * - attendees that already received their ticket are skipped unless `includeAlreadySent`
 * - each attendee appears once
 */
export function pickRecipients<T extends EmailCandidate>(
  selected: T[],
  alreadySent: Set<string>,
  includeAlreadySent = false,
) {
  const seen = new Set<string>();
  const send: (T & { email: string })[] = [];
  const invalid: T[] = [];
  const skippedSent: T[] = [];
  for (const a of selected) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    if (!isValidEmail(a.email)) { invalid.push(a); continue; }
    if (!includeAlreadySent && alreadySent.has(a.id)) { skippedSent.push(a); continue; }
    send.push({ ...a, email: a.email!.trim().toLowerCase() });
  }
  return { send, invalid, skippedSent };
}

export const fillTemplate = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(nombre|evento|fecha|categoria)\}/g, (_, k) => vars[k] ?? '');

export const ticketViewUrl = () =>
  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ticket-view`;
