import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConsentCheckbox from '@/components/legal/ConsentCheckbox';
import { CONSENT_VERSION } from '@/lib/legal';
import { functionUrl, type RegField } from '@/lib/registrationForm';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const inputType: Record<string, string> = { email: 'email', tel: 'tel', number: 'text', date: 'date', cedula: 'text', text: 'text' };

const PublicRegistration = () => {
  const { eventId } = useParams();
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'done' | 'duplicate'>('loading');
  const [form, setForm] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${functionUrl()}?event_id=${encodeURIComponent(eventId || '')}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    }).then(async (r) => {
      if (!r.ok) return setState('unavailable');
      const d = await r.json();
      setForm(d.form); setEvent(d.event); setState('ready');
      document.title = `${d.form.title} · ${d.event?.event_name ?? 'Chequi'}`;
    }).catch(() => setState('unavailable'));
  }, [eventId]);

  const fields: RegField[] = form?.fields ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    fields.forEach((f) => { if (f.required && !values[f.key]?.trim()) errs[f.key] = 'Obligatorio'; });
    setErrors(errs);
    if (Object.keys(errs).length || !consent) { if (!consent) setMsg('Debes aceptar el tratamiento de datos.'); return; }
    setSending(true); setMsg('');
    try {
      const r = await fetch(functionUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ event_id: eventId, data: values, consent: true, consent_version: CONSENT_VERSION }),
      });
      const d = await r.json();
      if (r.ok) { setMsg(d.message); setState('done'); }
      else if (r.status === 409) setState('duplicate');
      else {
        if (d.fields) setErrors(Object.fromEntries(Object.entries(d.fields).map(([k, v]: any) => [k, v[0]])));
        setMsg(d.error || 'No se pudo enviar');
      }
    } catch { setMsg('Sin conexión. Intenta de nuevo.'); }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-empresarial text-hueso flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900/70 p-5 sm:p-7 space-y-5">
        {event?.logo_url && <img src={event.logo_url} alt={event.event_name} className="h-16 mx-auto object-contain" />}
        {state === 'loading' && <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-dorado" /></div>}
        {state === 'unavailable' && (
          <div className="text-center py-8 space-y-2"><AlertCircle className="h-10 w-10 mx-auto text-dorado" /><p>Este formulario no está disponible.</p></div>
        )}
        {(state === 'done' || state === 'duplicate') && (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="h-12 w-12 mx-auto text-dorado" />
            <h1 className="text-xl font-semibold">{state === 'done' ? (msg || 'Registro recibido') : 'Ya estás registrado'}</h1>
            <p className="text-sm text-gray-400">{event?.event_name}</p>
          </div>
        )}
        {state === 'ready' && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-semibold text-dorado">{form.title}</h1>
              <p className="text-sm text-gray-400">{event?.event_name}</p>
              {form.welcome_message && <p className="text-sm pt-2">{form.welcome_message}</p>}
            </div>
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label}{f.required && <span className="text-red-400"> *</span>}</Label>
                {f.type === 'select' ? (
                  <select id={f.key} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">Selecciona…</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input id={f.key} type={inputType[f.type]} inputMode={f.type === 'cedula' || f.type === 'number' ? 'numeric' : undefined}
                    maxLength={200} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                )}
                {errors[f.key] && <p className="text-xs text-red-400">{errors[f.key]}</p>}
              </div>
            ))}
            <ConsentCheckbox checked={consent} onCheckedChange={setConsent} source="registro-qr" />
            {msg && <p className="text-sm text-red-400">{msg}</p>}
            <Button type="submit" disabled={sending} className="w-full bg-dorado text-empresarial hover:bg-dorado/90">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar registro'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicRegistration;
