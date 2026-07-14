
-- Harden EXECUTE permissions on SQL functions.
-- Strategy: revoke EXECUTE from PUBLIC + anon on every function in public,
-- then re-grant EXECUTE to the roles that actually need it. Idempotent.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      r.proname, r.args
    );
    -- service_role always keeps EXECUTE (edge functions / admin)
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
      r.proname, r.args
    );
  END LOOP;
END $$;

-- Re-grant EXECUTE to authenticated for functions used by the logged-in app.
GRANT EXECUTE ON FUNCTION public.get_active_event_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role_secure(uuid, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_scanner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_modify_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_events(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_event(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_in_event(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_event_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_attendee_by_ticket(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_control_access(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_cedula_control_limit(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_analytics_summary(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_recent_activity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_attendee_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_qr_code(uuid) TO authenticated;

-- Public-facing functions (login screen / scanner without JWT).
GRANT EXECUTE ON FUNCTION public.get_active_event_config() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_attendee_by_ticket_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_control_access_public(text, uuid) TO anon, authenticated;
