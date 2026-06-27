
-- 1) Revoke anon execute on public SECURITY DEFINER RPCs
REVOKE EXECUTE ON FUNCTION public.find_attendee_by_ticket_public(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_control_access_public(text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_attendee_by_ticket_public(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_control_access_public(text, uuid) TO authenticated, service_role;

-- 2) Restrict profile self-update to safe columns (no attendee_id, no role, no email hijack)
DROP POLICY IF EXISTS "Users can update own profile basic info" ON public.profiles;
CREATE POLICY "Users can update own profile basic info"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND email IS NOT DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
  AND attendee_id IS NOT DISTINCT FROM (SELECT p.attendee_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- 3) Scope admin profile access to shared events (or super_admin)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view profiles in shared events"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_event_assignments admin_uea
    JOIN public.user_event_assignments target_uea
      ON target_uea.event_id = admin_uea.event_id
    WHERE admin_uea.user_id = auth.uid()
      AND admin_uea.role_in_event = 'admin'
      AND target_uea.user_id = public.profiles.id
  )
);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update profiles in shared events"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_event_assignments admin_uea
    JOIN public.user_event_assignments target_uea
      ON target_uea.event_id = admin_uea.event_id
    WHERE admin_uea.user_id = auth.uid()
      AND admin_uea.role_in_event = 'admin'
      AND target_uea.user_id = public.profiles.id
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_event_assignments admin_uea
    JOIN public.user_event_assignments target_uea
      ON target_uea.event_id = admin_uea.event_id
    WHERE admin_uea.user_id = auth.uid()
      AND admin_uea.role_in_event = 'admin'
      AND target_uea.user_id = public.profiles.id
  )
);
