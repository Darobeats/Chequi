
-- 1. Revoke public RPC access from authenticated users (only edge functions via service_role should call these)
REVOKE EXECUTE ON FUNCTION public.find_attendee_by_ticket_public(text) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.validate_control_access_public(text, uuid) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.find_attendee_by_ticket_public(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_control_access_public(text, uuid) TO service_role;

-- 2. Allow scanner role to SELECT cedula_access_logs for their assigned events (needed for realtime delivery)
DROP POLICY IF EXISTS "Scanners can view cedula access logs for assigned events" ON public.cedula_access_logs;
CREATE POLICY "Scanners can view cedula access logs for assigned events"
ON public.cedula_access_logs
FOR SELECT
TO authenticated
USING (
  public.user_can_access_event(event_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'control', 'scanner')
  )
);

-- 3. Harden user_event_assignments INSERT policy: explicitly require caller to already be admin
-- of the target event (or super admin) via a direct check, not relying solely on can_manage_event_team.
DROP POLICY IF EXISTS "Admins can add team members to their events" ON public.user_event_assignments;
DROP POLICY IF EXISTS "Event admins can insert team assignments" ON public.user_event_assignments;
CREATE POLICY "Event admins can insert team assignments"
ON public.user_event_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_event_assignments existing
    WHERE existing.user_id = auth.uid()
      AND existing.event_id = user_event_assignments.event_id
      AND existing.role_in_event = 'admin'
  )
);
