DROP POLICY IF EXISTS "Admins can manage template versions" ON public.ticket_template_versions;

CREATE POLICY "Event admins can manage template versions"
ON public.ticket_template_versions
FOR ALL
USING (
  public.can_modify_data(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.ticket_templates tt
    WHERE tt.id = ticket_template_versions.template_id
      AND (
        tt.event_config_id IS NULL
        OR public.user_can_access_event(tt.event_config_id, auth.uid())
      )
  )
)
WITH CHECK (
  public.can_modify_data(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.ticket_templates tt
    WHERE tt.id = ticket_template_versions.template_id
      AND (
        tt.event_config_id IS NULL
        OR public.user_can_access_event(tt.event_config_id, auth.uid())
      )
  )
);