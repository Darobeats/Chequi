import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LoginPartnerLogo {
  id: string;
  name: string;
  logo_url: string;
  link_url: string | null;
  kind: 'sponsor' | 'partner';
  sort_order: number;
  is_visible: boolean;
}

export const useLoginPartnerLogos = (includeHidden = false) =>
  useQuery({
    queryKey: ['login-partner-logos', includeHidden],
    queryFn: async () => {
      let q = (supabase.from as any)('login_partner_logos').select('*').order('sort_order').order('created_at');
      if (!includeHidden) q = q.eq('is_visible', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LoginPartnerLogo[];
    },
    staleTime: 5 * 60_000,
  });
