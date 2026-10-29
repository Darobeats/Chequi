import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { bogotaDateKey, bogotaTime } from '@/lib/timezone';
import type { RegField } from '@/lib/registrationForm';

const RegistrationSubmissions: React.FC<{ eventId: string }> = ({ eventId }) => {
  const db = supabase as any;
  const qc = useQueryClient();
  const { isAdmin } = useUserRole();
  const [q, setQ] = useState('');
  const { data: form } = useQuery({
    queryKey: ['registration-form', eventId],
    queryFn: async () => (await db.from('event_registration_forms').select('*').eq('event_id', eventId).maybeSingle()).data,
  });
  const { data: rows = [] } = useQuery({
    queryKey: ['registration-submissions', eventId],
    queryFn: async () => {
      const all: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await db.from('event_form_submissions').select('id,data,created_at').eq('event_id', eventId)
          .order('created_at', { ascending: false }).range(from, from + 999);
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });
  const fields: RegField[] = form?.fields ?? [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r: any) => Object.values(r.data).join(' ').toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await db.from('event_form_submissions').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['registration-submissions', eventId] });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-hueso">Total: <b className="text-dorado">{rows.length}</b></span>
        <Input className="max-w-xs" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-auto max-h-[60vh] rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 sticky top-0"><tr>
            <th className="p-2 text-left text-dorado">Fecha</th>
            {fields.map((f) => <th key={f.key} className="p-2 text-left text-dorado whitespace-nowrap">{f.label}</th>)}
            {isAdmin && <th />}
          </tr></thead>
          <tbody>
            {filtered.slice(0, 500).map((r: any) => (
              <tr key={r.id} className="border-t border-gray-800 text-hueso">
                <td className="p-2 whitespace-nowrap">{bogotaDateKey(new Date(r.created_at))} {bogotaTime(new Date(r.created_at))}</td>
                {fields.map((f) => <td key={f.key} className="p-2">{r.data?.[f.key] ?? ''}</td>)}
                {isAdmin && <td className="p-1"><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button></td>}
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={fields.length + 2} className="p-6 text-center text-gray-400">Sin registros todavía</td></tr>}
          </tbody>
        </table>
      </div>
      {filtered.length > 500 && <p className="text-xs text-gray-400">Mostrando 500 de {filtered.length}. Usa la búsqueda o el Excel del resumen.</p>}
    </div>
  );
};

export default RegistrationSubmissions;
