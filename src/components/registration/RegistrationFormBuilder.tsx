import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowDown, ArrowUp, Copy, Download, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_FIELDS, FIELD_TYPE_LABELS, registrationUrl, slugKey, type RegField, type RegFieldType } from '@/lib/registrationForm';

const RegistrationFormBuilder: React.FC<{ eventId: string; eventName?: string }> = ({ eventId, eventName }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const db = supabase as any;
  const { data, isLoading } = useQuery({
    queryKey: ['registration-form', eventId],
    queryFn: async () => (await db.from('event_registration_forms').select('*').eq('event_id', eventId).maybeSingle()).data,
  });
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('Registro');
  const [welcome, setWelcome] = useState('');
  const [success, setSuccess] = useState('');
  const [fields, setFields] = useState<RegField[]>(DEFAULT_FIELDS);
  const [dedupe, setDedupe] = useState<string[]>(['cedula']);
  const [qr, setQr] = useState('');
  const [saving, setSaving] = useState(false);
  const url = registrationUrl(eventId);

  useEffect(() => {
    if (isLoading) return;
    setEnabled(data?.is_enabled ?? false); setTitle(data?.title ?? 'Registro');
    setWelcome(data?.welcome_message ?? ''); setSuccess(data?.success_message ?? '');
    setFields(data?.fields?.length ? data.fields : DEFAULT_FIELDS); setDedupe(data?.dedupe_keys ?? ['cedula']);
  }, [data, isLoading]);

  useEffect(() => { QRCode.toDataURL(url, { width: 1024, margin: 4, errorCorrectionLevel: 'M' }).then(setQr); }, [url]);

  const update = (i: number, patch: Partial<RegField>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: number) => {
    const n = [...fields]; const t = i + d; if (t < 0 || t >= n.length) return;
    [n[i], n[t]] = [n[t], n[i]]; setFields(n);
  };
  const add = () => {
    let key = 'campo'; let k = 1;
    while (fields.some((f) => f.key === key)) key = `campo_${k++}`;
    setFields([...fields, { key, label: 'Nuevo campo', type: 'text', required: false }]);
  };

  const save = async () => {
    const keys = fields.map((f) => f.key);
    if (!fields.length || new Set(keys).size !== keys.length || fields.some((f) => !f.label.trim())) {
      toast({ title: 'Revisa los campos', description: 'Cada campo necesita un nombre único.', variant: 'destructive' }); return;
    }
    setSaving(true);
    const { error } = await db.from('event_registration_forms').upsert({
      event_id: eventId, is_enabled: enabled, title: title.trim() || 'Registro',
      welcome_message: welcome || null, success_message: success || null,
      fields: fields.map((f) => ({ ...f, options: f.type === 'select' ? (f.options ?? []).filter(Boolean) : undefined })),
      dedupe_keys: dedupe,
    }, { onConflict: 'event_id' });
    setSaving(false);
    if (error) toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Formulario guardado' }); qc.invalidateQueries({ queryKey: ['registration-form', eventId] }); }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[1fr_220px]">
        <div className="space-y-4">
          <div className="flex items-center gap-3"><Switch checked={enabled} onCheckedChange={setEnabled} id="reg-on" /><Label htmlFor="reg-on">Formulario activo</Label></div>
          <div className="space-y-1.5"><Label>Título</Label><Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Mensaje de bienvenida</Label><Textarea value={welcome} maxLength={500} onChange={(e) => setWelcome(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Mensaje al terminar</Label><Input value={success} maxLength={200} placeholder="Registro recibido" onChange={(e) => setSuccess(e.target.value)} /></div>
        </div>
        <div className="space-y-2 text-center">
          {qr && <img src={qr} alt="QR del formulario" className="w-full rounded-md bg-hueso" />}
          <Button size="sm" variant="outline" className="w-full" onClick={() => { const a = document.createElement('a'); a.href = qr; a.download = `qr-registro-${(eventName || eventId).replace(/\s+/g, '_')}.png`; a.click(); }}><Download className="h-4 w-4 mr-1" />Descargar QR</Button>
          <Button size="sm" variant="ghost" className="w-full" onClick={() => { navigator.clipboard.writeText(url); toast({ title: 'Enlace copiado' }); }}><Copy className="h-4 w-4 mr-1" />Copiar enlace</Button>
          {!enabled && <p className="text-xs text-gray-400">Activa y guarda el formulario para que el QR funcione.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-dorado">Campos</h4>
        {fields.map((f, i) => (
          <div key={i} className="rounded-lg border border-gray-800 p-3 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <Input className="flex-1 min-w-[160px]" value={f.label} maxLength={80}
                onChange={(e) => update(i, { label: e.target.value, ...(data?.fields?.some((x: RegField) => x.key === f.key) ? {} : { key: slugKey(e.target.value) }) })} />
              <select value={f.type} onChange={(e) => update(i, { type: e.target.value as RegFieldType })}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground">
                {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <label className="flex items-center gap-1 text-sm"><Switch checked={f.required} onCheckedChange={(v) => update(i, { required: v })} />Obligatorio</label>
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setFields(fields.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {f.type === 'select' && (
              <Input placeholder="Opciones separadas por coma" value={(f.options ?? []).join(', ')}
                onChange={(e) => update(i, { options: e.target.value.split(',').map((s) => s.trim()) })} />
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Agregar campo</Button>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-dorado">Evitar registros duplicados por</h4>
        <div className="flex gap-4">
          {[['cedula', 'Cédula'], ['email', 'Correo']].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <Switch checked={dedupe.includes(k)} onCheckedChange={(v) => setDedupe(v ? [...dedupe, k] : dedupe.filter((d) => d !== k))} />{l}
            </label>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-dorado text-empresarial hover:bg-dorado/90">{saving ? 'Guardando…' : 'Guardar formulario'}</Button>
    </div>
  );
};

export default RegistrationFormBuilder;
