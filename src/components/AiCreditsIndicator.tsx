import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export const LOW_CREDITS_THRESHOLD = 50;
export const CRITICAL_CREDITS_THRESHOLD = 10;

export type CreditLevel = 'ok' | 'low' | 'critical' | 'unset';

export function getCreditLevel(balance: number | null, exhausted: boolean): CreditLevel {
  if (exhausted) return 'critical';
  if (balance === null) return 'unset';
  if (balance < CRITICAL_CREDITS_THRESHOLD) return 'critical';
  if (balance < LOW_CREDITS_THRESHOLD) return 'low';
  return 'ok';
}

export const useAiCredits = () =>
  useQuery({
    queryKey: ['ai-credit-balance'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_ai_credit_balance');
      if (error) throw error;
      const row = (data as any[])?.[0];
      return {
        balance: row?.last_set_at ? Number(row.balance) : null,
        exhausted: !!row?.exhausted,
        lastSetAt: row?.last_set_at as string | null,
      };
    },
    refetchInterval: 60_000,
  });

const levelClass: Record<CreditLevel, string> = {
  ok: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  low: 'border-amber-500/50 text-amber-400 bg-amber-500/15 animate-pulse',
  critical: 'border-red-500/60 text-red-400 bg-red-500/15 animate-pulse',
  unset: 'border-gray-600 text-gray-400 bg-gray-800/40',
};

const AiCreditsIndicator: React.FC = () => {
  const qc = useQueryClient();
  const { data } = useAiCredits();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ch = supabase
      .channel(`ai-credits-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_credit_ledger' }, () =>
        qc.invalidateQueries({ queryKey: ['ai-credit-balance'] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const balance = data?.balance ?? null;
  const level = getCreditLevel(balance, !!data?.exhausted);

  const save = async (type: 'set_balance' | 'topup') => {
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) { toast.error('Ingresa un número válido'); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase.from as any)('ai_credit_ledger').insert({
      entry_type: type, credits: n, created_by: u.user?.id, note: type === 'topup' ? 'Recarga' : 'Saldo actual',
    });
    setSaving(false);
    if (error) { toast.error('No se pudo guardar', { description: error.message }); return; }
    setValue('');
    toast.success(type === 'topup' ? 'Recarga registrada' : 'Saldo actualizado');
    qc.invalidateQueries({ queryKey: ['ai-credit-balance'] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Créditos de IA"
          className={`flex items-center gap-1 rounded-full border px-2.5 h-9 text-xs font-semibold flex-shrink-0 touch-manipulation ${levelClass[level]}`}
        >
          {level === 'low' || level === 'critical' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span className="tabular-nums">{balance === null ? '—' : balance.toFixed(balance < 10 ? 2 : 0)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-gray-950 border-gray-700 text-hueso z-[9999]" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400">Créditos de IA estimados</p>
            <p className="text-3xl font-bold tabular-nums">{balance === null ? 'Sin configurar' : balance.toFixed(2)}</p>
            {data?.exhausted && <p className="text-xs text-red-400 mt-1">La IA reportó créditos agotados. Recarga y registra la recarga aquí.</p>}
            {!data?.exhausted && level === 'low' && <p className="text-xs text-amber-400 mt-1">Menos de {LOW_CREDITS_THRESHOLD} créditos: recarga para asegurar el evento.</p>}
            {!data?.exhausted && level === 'critical' && <p className="text-xs text-red-400 mt-1">Saldo crítico: recarga ya.</p>}
            {level === 'unset' && <p className="text-xs text-gray-400 mt-1">Escribe tu saldo actual de Lovable para empezar el conteo.</p>}
          </div>
          <Input
            inputMode="decimal" placeholder="Ej. 100" value={value}
            onChange={(e) => setValue(e.target.value)} className="bg-gray-900 border-gray-700 h-11"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="h-10" disabled={saving} onClick={() => save('set_balance')}>Fijar saldo</Button>
            <Button size="sm" className="h-10 bg-dorado text-empresarial hover:bg-dorado/90" disabled={saving} onClick={() => save('topup')}>Sumar recarga</Button>
          </div>
          <a href="https://lovable.dev/settings/billing" target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-dorado underline">
            Ir a recargar créditos
          </a>
          <p className="text-[10px] text-gray-500 leading-snug">
            Estimación: descuenta cada lectura de cédula con IA según los tokens usados. El saldo real se ve en Facturación de Lovable.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AiCreditsIndicator;
