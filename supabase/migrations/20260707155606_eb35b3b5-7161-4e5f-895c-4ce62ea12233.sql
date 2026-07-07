
DROP POLICY IF EXISTS "Admins can manage event configs - select" ON public.event_configs;
DROP POLICY IF EXISTS "Admins can manage event configs - insert" ON public.event_configs;
DROP POLICY IF EXISTS "Admins can manage event configs - update" ON public.event_configs;

-- SELECT: admins can only view configs for events they are assigned to (super admins bypass via user_can_access_event)
CREATE POLICY "Admins can view assigned event configs"
ON public.event_configs
FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND public.user_can_access_event(id, auth.uid())
);

-- INSERT: only super admins can create new event configs (new events have no assignments yet)
CREATE POLICY "Super admins can create event configs"
ON public.event_configs
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
);

-- UPDATE: admins can only update configs for events they are assigned to
CREATE POLICY "Admins can update assigned event configs"
ON public.event_configs
FOR UPDATE
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND public.user_can_access_event(id, auth.uid())
)
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND public.user_can_access_event(id, auth.uid())
);

-- DELETE: only super admins can delete event configs
CREATE POLICY "Super admins can delete event configs"
ON public.event_configs
FOR DELETE
USING (
  public.is_super_admin(auth.uid())
);
