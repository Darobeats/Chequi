import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthorizeUserManagement } from '@/hooks/useAuthorizeUserManagement';
import { useLoginPartnerLogos, LoginPartnerLogo } from '@/hooks/useLoginPartnerLogos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

const table = () => (supabase.from as any)('login_partner_logos');

const LoginPartnerLogosManager: React.FC = () => {
  const { canManageUsers: isSuperAdmin } = useAuthorizeUserManagement();
  const { data: logos = [] } = useLoginPartnerLogos(true);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [kind, setKind] = useState<'sponsor' | 'partner'>('sponsor');
  const [busy, setBusy] = useState(false);

  if (!isSuperAdmin) return null;
  const refresh = () => qc.invalidateQueries({ queryKey: ['login-partner-logos'] });

  const upload = async (file: File) => {
    if (!name.trim()) { toast.error('Escribe el nombre del patrocinador primero'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2MB por logo'); return; }
    setBusy(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `login-partners/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('event-assets').upload(path, file, { cacheControl: '3600' });
      if (error) throw error;
      const { data } = supabase.storage.from('event-assets').getPublicUrl(path);
      let url = link.trim();
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      const { error: e2 } = await table().insert({
        name: name.trim(), logo_url: data.publicUrl, link_url: url || null, kind,
        sort_order: (logos.at(-1)?.sort_order ?? 0) + 1,
      });
      if (e2) throw e2;
      setName(''); setLink('');
      toast.success('Logo agregado a la pantalla de ingreso');
      refresh();
    } catch (e: any) {
      toast.error('No se pudo subir el logo', { description: e.message });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const update = async (id: string, patch: Partial<LoginPartnerLogo>) => {
    const { error } = await table().update(patch).eq('id', id);
    if (error) toast.error('Error', { description: error.message }); else refresh();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const a = logos[i], b = logos[i + dir];
    if (!a || !b) return;
    await Promise.all([table().update({ sort_order: b.sort_order }).eq('id', a.id), table().update({ sort_order: a.sort_order }).eq('id', b.id)]);
    refresh();
  };
  const remove = async (l: LoginPartnerLogo) => {
    const { error } = await table().delete().eq('id', l.id);
    if (error) { toast.error('Error', { description: error.message }); return; }
    const p = l.logo_url.split('/event-assets/')[1];
    if (p) await supabase.storage.from('event-assets').remove([p]);
    refresh();
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <CardTitle className="text-dorado text-lg">Logos en pantalla de ingreso</CardTitle>
        <CardDescription>Patrocinadores o aliados que verán todos en la página de inicio de sesión.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-950 border-gray-700 h-11" />
          <Input placeholder="Enlace (opcional)" value={link} onChange={(e) => setLink(e.target.value)} className="bg-gray-950 border-gray-700 h-11" />
          <Select value={kind} onValueChange={(v) => setKind(v as any)}>
            <SelectTrigger className="bg-gray-950 border-gray-700 h-11 sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="sponsor">Patrocinador</SelectItem>
              <SelectItem value="partner">Aliado</SelectItem>
            </SelectContent>
          </Select>
          <Button className="h-11 bg-dorado text-empresarial hover:bg-dorado/90" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Subir logo
          </Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>

        {logos.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay logos.</p>
        ) : (
          <ul className="space-y-2">
            {logos.map((l, i) => (
              <li key={l.id} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950/60 p-2">
                <div className="h-12 w-20 flex items-center justify-center rounded bg-hueso/5 flex-shrink-0">
                  <img src={l.logo_url} alt={l.name} className="max-h-10 max-w-[72px] object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${l.is_visible ? 'text-hueso' : 'text-gray-500 line-through'}`}>{l.name}</p>
                  <p className="text-xs text-gray-500">{l.kind === 'partner' ? 'Aliado' : 'Patrocinador'}</p>
                </div>
                <div className="flex items-center">
                  <Button size="icon" variant="ghost" className="h-10 w-10" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10" disabled={i === logos.length - 1} onClick={() => move(i, 1)} aria-label="Bajar"><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => update(l.id, { is_visible: !l.is_visible })} aria-label="Mostrar u ocultar">
                    {l.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-red-400" onClick={() => remove(l)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginPartnerLogosManager;
