import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  label: string | null;
  snapshot: any;
  created_by: string | null;
  created_at: string;
}

export const useTicketTemplateVersions = (templateId: string | null | undefined) => {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['ticket-template-versions', templateId],
    queryFn: async (): Promise<TemplateVersion[]> => {
      if (!templateId) return [];
      const { data, error } = await (supabase as any)
        .from('ticket_template_versions')
        .select('*')
        .eq('template_id', templateId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data || []) as TemplateVersion[];
    },
    enabled: !!templateId,
  });

  const create = useMutation({
    mutationFn: async ({ snapshot, label }: { snapshot: any; label?: string }) => {
      if (!templateId) throw new Error('No templateId');
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from('ticket_template_versions')
        .insert({
          template_id: templateId,
          label: label || null,
          snapshot,
          created_by: userRes?.user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-template-versions', templateId] });
      toast({ title: 'Versión guardada', description: 'Se creó un snapshot de la plantilla.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const remove = useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await (supabase as any)
        .from('ticket_template_versions')
        .delete()
        .eq('id', versionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-template-versions', templateId] });
      toast({ title: 'Versión eliminada' });
    },
  });

  return { list, create, remove };
};
