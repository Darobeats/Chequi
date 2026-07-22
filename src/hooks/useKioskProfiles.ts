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
  /** True when the profile has a PIN configured. The PIN itself is never sent to the client. */
  has_pin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PROFILE_COLUMNS =
  'id,event_id,name,description,control_type_ids,default_control_type_id,auto_select_mode,time_schedule,allow_operator_override,lock_ui,auto_resume_ms,pin_hash,is_active,created_at,updated_at';

export const useKioskProfiles = (eventId?: string | null) => {
  return useQuery({
    queryKey: ['kiosk_profiles', eventId],
    queryFn: async () => {
      if (!eventId) return [] as KioskProfile[];
      const { data, error } = await supabase
        .from('kiosk_profiles' as any)
        .select(PROFILE_COLUMNS)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map(({ pin_hash, ...rest }) => ({
        ...(rest as any),
        has_pin: !!pin_hash,
      })) as KioskProfile[];
    },
    enabled: !!eventId,
    staleTime: 30_000,
  });
};

export const useUpsertKioskProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      profile: Partial<KioskProfile> & { event_id: string; name: string; pin?: string | null }
    ) => {
      const { pin, has_pin: _has_pin, ...rest } = profile as any;
      let profileId = rest.id as string | undefined;
      if (profileId) {
        const { id, ...update } = rest;
        const { error } = await supabase.from('kiosk_profiles' as any).update(update).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('kiosk_profiles' as any)
          .insert(rest)
          .select('id')
          .single();
        if (error) throw error;
        profileId = (data as any)?.id;
      }
      if (pin !== undefined && profileId) {
        const { error: pinErr } = await supabase.rpc('set_kiosk_pin' as any, {
          _profile_id: profileId,
          _pin: pin ?? null,
        });
        if (pinErr) throw pinErr;
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

export const verifyKioskPin = async (profileId: string, pin: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('verify_kiosk_pin' as any, {
    _profile_id: profileId,
    _pin: pin,
  });
  if (error) throw error;
  return !!data;
};
