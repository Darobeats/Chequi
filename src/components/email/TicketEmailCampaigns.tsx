import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Mail, Send, RotateCw, FlaskConical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTicketTemplates } from '@/hooks/useTicketTemplates';
import { useAllTemplateBindings } from '@/hooks/useTemplateCategoryBindings';
import { renderTicketCanvas } from '@/lib/renderTicket';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';
import { bogotaTime, bogotaDateKey } from '@/lib/timezone';
import { fillTemplate, isValidEmail, pickRecipients } from '@/lib/ticketEmail';
import type { Attendee, TicketTemplate } from '@/types/database';

const db = supabase as any;
const CHUNK = 25;

type Row = Attendee & { ticket_category?: { id: string; name: string; color: string } };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En cola', cls: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', cls: 'bg-primary text-primary-foreground' },
  failed: { label: 'Fallido', cls: 'bg-destructive text-destructive-foreground' },
};

async function invokeSend(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('send-ticket-campaign', { body });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    let msg = details;
    try { const j = JSON.parse(details); msg = j.details || j.error || details; } catch { /* raw */ }
    throw new Error(msg);
  }
  return data as { sent: number; failed: number; firstError?: string };
}

const TicketEmailCampaigns: React.FC<{ eventId: string; eventName: string }> = ({ eventId, eventName }) => {
  const qc = useQueryClient();
  const { data: templates = [] } = useTicketTemplates();
  const { data: bindings = [] } = useAllTemplateBindings();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sendFilter, setSendFilter] = useState<'unsent' | 'sent' | 'failed' | 'all'>('unsent');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('Tu boleta para {evento}');
  const [greeting, setGreeting] = useState('Hola {nombre},');
  const [body, setBody] = useState('Te compartimos tu boleta de acceso. Presenta el código QR en la entrada desde tu celular o impreso.\n\n¡Te esperamos!');
  const [testEmail, setTestEmail] = useState('');
  const [busy, setBusy] = useState<null | 'test' | 'send'>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ['email-attendees', eventId],
    queryFn: () => fetchAllPaginated<Row>((f, t) =>
      supabase.from('attendees').select('*, ticket_category:ticket_categories(id,name,color)')
        .eq('event_id', eventId).order('name').range(f, t) as any),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['email-recipients', eventId],
    queryFn: () => fetchAllPaginated<any>((f, t) =>
      db.from('email_campaign_recipients').select('id,campaign_id,attendee_id,email,status,error,sent_at,created_at')
        .eq('event_id', eventId).order('created_at', { ascending: false }).range(f, t)),
    refetchInterval: busy ? 4000 : false,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['email-campaigns', eventId],
    queryFn: async () => (await db.from('email_campaigns').select('*').eq('event_id', eventId).order('created_at', { ascending: false }).limit(20)).data ?? [],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['email-recipients', eventId] });
    qc.invalidateQueries({ queryKey: ['email-campaigns', eventId] });
  };

  // Latest status per attendee across campaigns
  const lastStatus = useMemo(() => {
    const m = new Map<string, any>();
    for (const h of history) if (!m.has(h.attendee_id) || h.status === 'sent') {
      const prev = m.get(h.attendee_id);
      if (!prev || prev.status !== 'sent') m.set(h.attendee_id, h);
    }
    return m;
  }, [history]);
  const alreadySent = useMemo(() => new Set([...lastStatus.values()].filter((h) => h.status === 'sent').map((h) => h.attendee_id)), [lastStatus]);

  const eventTemplates = useMemo(() => templates.filter((t) => t.event_config_id === eventId && (t.elements?.length ?? 0) > 0), [templates, eventId]);
  const resolveTemplate = useCallback((categoryId: string): TicketTemplate | undefined => {
    const b = bindings.find((x) => x.category_id === categoryId);
    const bound = b ? eventTemplates.find((t) => t.id === b.template_id) : undefined;
    const def = bindings.find((x) => x.is_default && eventTemplates.some((t) => t.id === x.template_id));
    return bound ?? (def ? eventTemplates.find((t) => t.id === def.template_id) : eventTemplates[0]);
  }, [bindings, eventTemplates]);

  const categories = useMemo(() => {
    const m = new Map<string, string>();
    attendees.forEach((a) => m.set(a.category_id, a.ticket_category?.name || 'Sin categoría'));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [attendees]);

  const withEmail = attendees.filter((a) => isValidEmail(a.email)).length;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return attendees.filter((a) => {
      if (category !== 'all' && a.category_id !== category) return false;
      const st = lastStatus.get(a.id)?.status;
      if (sendFilter === 'unsent' && st === 'sent') return false;
      if (sendFilter === 'sent' && st !== 'sent') return false;
      if (sendFilter === 'failed' && st !== 'failed') return false;
      if (s && !`${a.name} ${a.email ?? ''} ${a.cedula ?? ''} ${a.ticket_id}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [attendees, search, category, sendFilter, lastStatus]);

  const selectedRows = attendees.filter((a) => selected.has(a.id));
  const plan = pickRecipients(selectedRows, alreadySent, sendFilter === 'sent' || sendFilter === 'all');
  const sample = plan.send[0] ?? filtered[0];
  const vars = {
    nombre: sample?.name ?? 'Nombre Apellido', evento: eventName, fecha: '',
    categoria: sample?.ticket_category?.name ?? '',
  };

  const toggleAll = () => {
    const ids = filtered.filter((a) => isValidEmail(a.email)).map((a) => a.id);
    const all = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
    setSelected(next);
  };

  const saveCampaign = async (): Promise<string> => {
    const payload = { subject: subject.trim(), greeting: greeting.trim(), body: body.trim() };
    if (campaignId) { await db.from('email_campaigns').update(payload).eq('id', campaignId); return campaignId; }
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await db.from('email_campaigns').insert({ ...payload, event_id: eventId, created_by: u.user?.id, status: 'draft' }).select('id').single();
    if (error) throw error;
    setCampaignId(data.id);
    return data.id;
  };

  const uploadTicket = async (a: Row): Promise<string | null> => {
    const tpl = resolveTemplate(a.category_id);
    if (!tpl) return null;
    const canvas = await renderTicketCanvas(tpl, a);
    const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo generar la boleta'))), 'image/jpeg', 0.92));
    const path = `${eventId}/tickets/${a.id}.jpg`;
    const { error } = await supabase.storage.from('event-assets').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (error) throw error;
    return `${supabase.storage.from('event-assets').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  };

  const ensureRecipients = async (cid: string, rows: (Row & { email: string })[]) => {
    for (let i = 0; i < rows.length; i += 500) {
      const part = rows.slice(i, i + 500).map((a) => ({ campaign_id: cid, event_id: eventId, attendee_id: a.id, email: a.email, status: 'pending' }));
      const { error } = await db.from('email_campaign_recipients').upsert(part, { onConflict: 'campaign_id,attendee_id', ignoreDuplicates: true });
      if (error) throw error;
    }
    const { data } = await db.from('email_campaign_recipients').select('id,attendee_id,status,ticket_url').eq('campaign_id', cid);
    return (data ?? []) as { id: string; attendee_id: string; status: string; ticket_url: string | null }[];
  };

  const prepare = async (recs: { id: string; attendee_id: string; ticket_url: string | null }[]) => {
    for (const r of recs) {
      const a = attendees.find((x) => x.id === r.attendee_id);
      if (!a) continue;
      const url = await uploadTicket(a);
      if (!url) throw new Error(`No hay plantilla de boleta para la categoría de ${a.name}`);
      await db.from('email_campaign_recipients').update({ ticket_url: url }).eq('id', r.id);
      r.ticket_url = url;
    }
  };

  const sendTest = async () => {
    if (!isValidEmail(testEmail)) return toast({ title: 'Correo de prueba inválido', variant: 'destructive' });
    const pick = plan.send[0] ?? attendees.find((a) => isValidEmail(a.email));
    if (!pick) return toast({ title: 'Selecciona al menos un asistente con correo', variant: 'destructive' });
    setBusy('test');
    try {
      const cid = await saveCampaign();
      const recs = await ensureRecipients(cid, [{ ...pick, email: pick.email!.trim().toLowerCase() }]);
      const rec = recs.find((r) => r.attendee_id === pick.id)!;
      await prepare([rec]);
      await invokeSend({ campaign_id: cid, recipient_ids: [rec.id], test_email: testEmail.trim().toLowerCase() });
      toast({ title: 'Prueba enviada', description: `Revisa ${testEmail} (boleta de ${pick.name}).` });
    } catch (e) {
      toast({ title: 'No se pudo enviar la prueba', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(null); refresh(); }
  };

  const runSend = async (cid: string, recs: { id: string; attendee_id: string; ticket_url: string | null }[]) => {
    setBusy('send');
    setProgress({ done: 0, total: recs.length });
    let sent = 0; let failed = 0; let firstError = '';
    try {
      await db.from('email_campaigns').update({ status: 'sending', total: recs.length }).eq('id', cid);
      for (let i = 0; i < recs.length; i += CHUNK) {
        const chunk = recs.slice(i, i + CHUNK);
        await prepare(chunk.filter((r) => !r.ticket_url));
        const res = await invokeSend({ campaign_id: cid, recipient_ids: chunk.map((r) => r.id) });
        sent += res.sent; failed += res.failed;
        if (res.firstError && !firstError) firstError = res.firstError;
        setProgress({ done: Math.min(i + CHUNK, recs.length), total: recs.length });
        refresh();
      }
      toast({
        title: failed ? `Enviadas ${sent}, fallidas ${failed}` : `¡${sent} boletas enviadas!`,
        description: firstError ? firstError.slice(0, 200) : undefined,
        variant: failed ? 'destructive' : undefined,
      });
    } catch (e) {
      toast({ title: 'El envío se detuvo', description: `${(e as Error).message}. Puedes reanudarlo con "Reintentar pendientes".`, variant: 'destructive' });
    } finally { setBusy(null); refresh(); }
  };

  const sendAll = async () => {
    setConfirmOpen(false);
    try {
      const cid = await saveCampaign();
      const recs = await ensureRecipients(cid, plan.send);
      const wanted = new Set(plan.send.map((a) => a.id));
      // Drop pending rows left by a test that are not part of this selection
      const stale = recs.filter((r) => r.status === 'pending' && !wanted.has(r.attendee_id)).map((r) => r.id);
      if (stale.length) await db.from('email_campaign_recipients').delete().in('id', stale);
      await runSend(cid, recs.filter((r) => wanted.has(r.attendee_id) && r.status !== 'sent'));
      setSelected(new Set());
      setCampaignId(null);
    } catch (e) {
      toast({ title: 'No se pudo iniciar el envío', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const retryCampaign = async (cid: string) => {
    const { data } = await db.from('email_campaign_recipients').select('id,attendee_id,ticket_url').eq('campaign_id', cid).in('status', ['pending', 'failed']);
    if (!data?.length) return toast({ title: 'No hay correos pendientes o fallidos' });
    await runSend(cid, data);
  };

  const resendOne = async (h: any) => {
    setBusy('send');
    try {
      const { data: r } = await db.from('email_campaign_recipients').select('id,attendee_id,ticket_url').eq('id', h.id).single();
      await prepare([{ ...r, ticket_url: null }]);
      const res = await invokeSend({ campaign_id: h.campaign_id, recipient_ids: [h.id] });
      toast(res.failed ? { title: 'Falló el reenvío', description: res.firstError, variant: 'destructive' } : { title: `Boleta reenviada a ${h.email}` });
    } catch (e) {
      toast({ title: 'Falló el reenvío', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(null); refresh(); }
  };

  const stats = {
    sent: alreadySent.size,
    failed: [...lastStatus.values()].filter((h) => h.status === 'failed').length,
    pending: [...lastStatus.values()].filter((h) => h.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Asistentes', attendees.length], ['Con correo', withEmail],
          ['Boletas enviadas', stats.sent], ['Fallidas', stats.failed],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-bold text-primary">{v as number}</p>
          </div>
        ))}
      </div>

      {withEmail === 0 && !isLoading && (
        <p className="text-sm rounded-md border border-border bg-muted p-3 text-foreground">
          Ningún asistente tiene correo todavía. Agrégalo al crear o editar un asistente, o importa un archivo con una columna <b>correo</b>.
        </p>
      )}

      <section className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3">
        <h3 className="font-semibold text-primary">1. Mensaje</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div><Label>Asunto</Label><Input value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label>Saludo</Label><Input value={greeting} maxLength={120} onChange={(e) => setGreeting(e.target.value)} /></div>
            <div><Label>Mensaje</Label><Textarea rows={5} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Puedes usar {'{nombre}'}, {'{evento}'}, {'{fecha}'} y {'{categoria}'}. Remitente: contacto@ticket.chequi.online</p>
          </div>
          <div className="rounded-md border border-border bg-background p-3 text-sm space-y-2">
            <p className="text-xs text-muted-foreground">Vista previa</p>
            <p className="font-semibold">{fillTemplate(subject, vars)}</p>
            <p className="font-bold">{fillTemplate(greeting, vars)}</p>
            <p className="whitespace-pre-line">{fillTemplate(body, vars)}</p>
            <div className="rounded border border-dashed border-border p-4 text-center text-muted-foreground text-xs">[ Imagen de la boleta con su QR ]</div>
            <div className="text-center"><span className="inline-block rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">Ver mi boleta</span></div>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]"><Label>Enviarme una prueba a</Label><Input type="email" placeholder="tu@correo.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} /></div>
          <Button variant="outline" onClick={sendTest} disabled={!!busy}>
            {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Enviar prueba
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3">
        <h3 className="font-semibold text-primary">2. Destinatarios</h3>
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Buscar nombre, correo, cédula…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sendFilter} onValueChange={(v) => setSendFilter(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unsent">Sin enviar</SelectItem>
              <SelectItem value="failed">Fallidos</SelectItem>
              <SelectItem value="sent">Ya enviados (reenviar)</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={toggleAll}>Seleccionar filtrados con correo</Button>
          {selected.size > 0 && <Button variant="ghost" onClick={() => setSelected(new Set())}>Limpiar ({selected.size})</Button>}
        </div>
        <div className="overflow-auto max-h-[50vh] rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card"><tr className="text-left text-muted-foreground">
              <th className="p-2 w-8" /><th className="p-2">Nombre</th><th className="p-2">Correo</th><th className="p-2 hidden sm:table-cell">Categoría</th><th className="p-2">Envío</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="p-4 text-center"><Loader2 className="inline h-4 w-4 animate-spin" /></td></tr>}
              {filtered.slice(0, 1000).map((a) => {
                const ok = isValidEmail(a.email);
                const st = lastStatus.get(a.id);
                return (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-2"><Checkbox disabled={!ok} checked={selected.has(a.id)} onCheckedChange={() => {
                      const n = new Set(selected); n.has(a.id) ? n.delete(a.id) : n.add(a.id); setSelected(n);
                    }} /></td>
                    <td className="p-2">{a.name}</td>
                    <td className="p-2 break-all">{a.email || <span className="text-muted-foreground">Sin correo</span>}{a.email && !ok && <span className="text-destructive"> (inválido)</span>}</td>
                    <td className="p-2 hidden sm:table-cell">{a.ticket_category?.name}</td>
                    <td className="p-2">{st ? <Badge className={STATUS[st.status]?.cls}>{STATUS[st.status]?.label ?? st.status}</Badge> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 1000 && <p className="text-xs text-muted-foreground">Mostrando 1.000 de {filtered.length}; "Seleccionar filtrados" incluye a todos.</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setConfirmOpen(true)} disabled={!!busy || plan.send.length === 0}>
            {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar {plan.send.length} boletas
          </Button>
          {plan.skippedSent.length > 0 && <span className="text-xs text-muted-foreground">{plan.skippedSent.length} ya recibieron su boleta y se omiten.</span>}
          {plan.invalid.length > 0 && <span className="text-xs text-destructive">{plan.invalid.length} sin correo válido.</span>}
        </div>
        {busy === 'send' && progress.total > 0 && (
          <div className="space-y-1">
            <Progress value={(progress.done / progress.total) * 100} />
            <p className="text-xs text-muted-foreground">{progress.done} de {progress.total}. Mantén esta pantalla abierta hasta que termine.</p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3">
        <h3 className="font-semibold text-primary">3. Seguimiento</h3>
        {campaigns.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay envíos.</p>}
        {campaigns.map((c: any) => {
          const rows = history.filter((h: any) => h.campaign_id === c.id);
          const s = rows.filter((h: any) => h.status === 'sent').length;
          const f = rows.filter((h: any) => h.status === 'failed').length;
          const p = rows.length - s - f;
          return (
            <details key={c.id} className="rounded-md border border-border">
              <summary className="cursor-pointer p-2 flex flex-wrap items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium">{c.subject}</span>
                <span className="text-muted-foreground">{bogotaDateKey(c.created_at)} {bogotaTime(c.created_at)}</span>
                <Badge className={STATUS.sent.cls}>{s} enviados</Badge>
                {f > 0 && <Badge className={STATUS.failed.cls}>{f} fallidos</Badge>}
                {p > 0 && <Badge className={STATUS.pending.cls}>{p} en cola</Badge>}
                {(f > 0 || p > 0) && (
                  <Button size="sm" variant="outline" className="ml-auto" disabled={!!busy} onClick={(e) => { e.preventDefault(); retryCampaign(c.id); }}>
                    <RotateCw className="h-3 w-3" /> Reintentar pendientes
                  </Button>
                )}
              </summary>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {rows.map((h: any) => {
                      const a = attendees.find((x) => x.id === h.attendee_id);
                      return (
                        <tr key={h.id} className="border-t border-border">
                          <td className="p-2">{a?.name ?? '—'}</td>
                          <td className="p-2 break-all">{h.email}</td>
                          <td className="p-2"><Badge className={STATUS[h.status]?.cls}>{STATUS[h.status]?.label ?? h.status}</Badge>{h.error && <span className="block text-destructive max-w-xs truncate" title={h.error}>{h.error}</span>}</td>
                          <td className="p-2 whitespace-nowrap">{h.sent_at ? bogotaTime(h.sent_at) : ''}</td>
                          <td className="p-2"><Button size="sm" variant="ghost" disabled={!!busy} onClick={() => resendOne(h)}>Reenviar</Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vas a enviar {plan.send.length} boletas</AlertDialogTitle>
            <AlertDialogDescription>
              Cada asistente recibirá su boleta desde contacto@ticket.chequi.online. Mantén esta pantalla abierta hasta que termine (unos segundos por cada 25 correos).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={sendAll}>Enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TicketEmailCampaigns;
