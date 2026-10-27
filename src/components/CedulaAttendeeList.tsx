import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEventContext } from '@/context/EventContext';
import { useCedulaControlUsage } from '@/hooks/useCedulaControlUsage';
import { useControlTypes } from '@/hooks/useSupabaseData';
import { bogotaTime } from '@/lib/timezone';

const PAGE_SIZE = 50;

/** Personas registradas por cédula (escáner ID) con sus ingresos/consumos. */
const CedulaAttendeeList: React.FC = () => {
  const { selectedEvent } = useEventContext();
  const eventId = selectedEvent?.id ?? null;
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => { const t = setTimeout(() => { setTerm(input.trim()); setPage(0); }, 300); return () => clearTimeout(t); }, [input]);

  const { data: usage = [] } = useCedulaControlUsage(eventId);
  const { data: controlTypes = [] } = useControlTypes();

  const { data, isLoading } = useQuery({
    queryKey: ['cedula_registros_page', eventId, page, term],
    enabled: !!eventId,
    placeholderData: (p) => p,
    queryFn: async () => {
      let q = supabase.from('cedula_registros')
        .select('id, numero_cedula, nombre_completo, nombres, primer_apellido, scanned_at, was_on_whitelist', { count: 'exact' })
        .eq('event_id', eventId!);
      if (term) {
        const like = `%${term.replace(/[%_,()]/g, '')}%`;
        q = q.or(`numero_cedula.ilike.${like},nombre_completo.ilike.${like},nombres.ilike.${like},primer_apellido.ilike.${like}`);
      }
      const { data, error, count } = await q.order('scanned_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const { data: whitelistTotal = 0 } = useQuery({
    queryKey: ['cedulas_autorizadas_count', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { count } = await supabase.from('cedulas_autorizadas').select('id', { count: 'exact', head: true }).eq('event_id', eventId!);
      return count ?? 0;
    },
  });

  const usesByCedula = new Map<string, string[]>();
  usage.forEach((u: any) => {
    const name = controlTypes.find(c => c.id === u.control_type_id)?.name || 'Control';
    usesByCedula.set(u.numero_cedula, [...(usesByCedula.get(u.numero_cedula) || []), name]);
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="text-sm font-medium">
          Registrados por cédula: <span className="text-dorado">{total.toLocaleString('es-CO')}</span>
          {whitelistTotal > 0 && <span className="text-gray-400 ml-2">· Lista autorizada: {whitelistTotal.toLocaleString('es-CO')}</span>}
        </div>
        <Input type="search" placeholder="Buscar por nombre o cédula..." value={input} onChange={e => setInput(e.target.value)} className="sm:max-w-xs bg-empresarial border-gray-800 text-hueso" />
      </div>
      <div className="border border-gray-800 rounded-lg overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-900">
            <TableRow>
              <TableHead className="text-hueso">Nombre</TableHead>
              <TableHead className="text-hueso">Cédula</TableHead>
              <TableHead className="text-hueso">Hora (Bogotá)</TableHead>
              <TableHead className="text-hueso">Registros</TableHead>
              <TableHead className="text-hueso">Lista</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">Cargando…</TableCell></TableRow>
            ) : rows.map((r: any) => {
              const uses = usesByCedula.get(r.numero_cedula) || [];
              return (
                <TableRow key={r.id} className="border-gray-800">
                  <TableCell className="font-medium text-hueso">{r.nombre_completo || `${r.nombres} ${r.primer_apellido}`}</TableCell>
                  <TableCell className="text-gray-300 font-mono">{r.numero_cedula}</TableCell>
                  <TableCell className="text-gray-300 whitespace-nowrap">{bogotaTime(r.scanned_at)}</TableCell>
                  <TableCell className="text-gray-300 text-xs">{uses.length ? uses.join(', ') : '—'}</TableCell>
                  <TableCell>
                    <Badge className={r.was_on_whitelist === false ? 'bg-red-800/30 text-red-400' : 'bg-green-800/30 text-green-400'}>
                      {r.was_on_whitelist === false ? 'No autorizado' : 'Autorizado'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">No hay personas registradas por cédula</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-4 text-sm text-gray-400">
          <span>Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CedulaAttendeeList;
