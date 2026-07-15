DROP POLICY IF EXISTS "Authenticated users can view template versions" ON public.ticket_template_versions;

CREATE POLICY "Users can view template versions for accessible events"
ON public.ticket_template_versions
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.ticket_templates tt
    WHERE tt.id = ticket_template_versions.template_id
      AND tt.event_config_id IS NOT NULL
      AND public.user_can_access_event(tt.event_config_id, auth.uid())
  )
);