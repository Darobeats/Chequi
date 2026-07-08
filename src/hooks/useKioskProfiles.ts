import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface KioskProfile {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  control_type_ids: string[];
  default_control_type_id: string | null;
  auto_select_mode: 'fixed' | 'time_based' | 'sequential';
  time_schedule: Array<{ from: string; to: string; control_type_id: string }>;
  allow_operator_override: boolean;
  lock_ui: boolean;
  auto_resume_ms: number;
  require_pin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useKioskProfiles = (eventId?: string | null) => {
  return useQuery({
    queryKey: ['kiosk_profiles', eventId],
    queryFn: async () => {
      if (!eventId) return [] as KioskProfile[];
      const { data, error } = await supabase
        .from('kiosk_profiles' as any)
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as KioskProfile[];
    },
    enabled: !!eventId,
    staleTime: 30_000,
  });
};

export const useUpsertKioskProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Partial<KioskProfile> & { event_id: string; name: string }) => {
      const payload: any = { ...profile };
      if (profile.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from('kiosk_profiles' as any).update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('kiosk_profiles' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['kiosk_profiles', vars.event_id] });
      toast({ title: 'Perfil de kiosko guardado' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useDeleteKioskProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; eventId: string }) => {
      const { error } = await supabase.from('kiosk_profiles' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['kiosk_profiles', vars.eventId] });
      toast({ title: 'Perfil eliminado' });
    },
  });
};
