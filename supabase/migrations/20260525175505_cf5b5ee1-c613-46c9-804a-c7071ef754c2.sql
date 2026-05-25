
-- Tighten category_controls reads to event-scoped access
DROP POLICY IF EXISTS "Authenticated users can view category controls" ON public.category_controls;
DROP POLICY IF EXISTS "Viewers can view category controls" ON public.category_controls;

CREATE POLICY "Users can view category controls for assigned events"
ON public.category_controls
FOR SELECT
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.ticket_categories tc
    WHERE tc.id = category_controls.category_id
      AND public.user_can_access_event(tc.event_id)
  )
);
