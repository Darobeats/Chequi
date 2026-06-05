
-- 1) control_usage: scope to event via attendees
DROP POLICY IF EXISTS "Admin and control can delete control usage" ON public.control_usage;
DROP POLICY IF EXISTS "Admin and control can insert control usage" ON public.control_usage;
DROP POLICY IF EXISTS "Admin and control can view control usage" ON public.control_usage;
DROP POLICY IF EXISTS "Viewers can view control usage" ON public.control_usage;

CREATE POLICY "Admin and control can view control usage"
ON public.control_usage FOR SELECT
USING (
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
  AND EXISTS (
    SELECT 1 FROM public.attendees a
    WHERE a.id = control_usage.attendee_id AND user_can_access_event(a.event_id)
  )
);

CREATE POLICY "Admin and control can insert control usage"
ON public.control_usage FOR INSERT
WITH CHECK (
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
  AND EXISTS (
    SELECT 1 FROM public.attendees a
    WHERE a.id = control_usage.attendee_id AND user_can_access_event(a.event_id)
  )
);

CREATE POLICY "Admin and control can delete control usage"
ON public.control_usage FOR DELETE
USING (
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
  AND EXISTS (
    SELECT 1 FROM public.attendees a
    WHERE a.id = control_usage.attendee_id AND user_can_access_event(a.event_id)
  )
);

CREATE POLICY "Viewers can view control usage"
ON public.control_usage FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'viewer'::user_role)
  AND EXISTS (
    SELECT 1 FROM public.attendees a
    WHERE a.id = control_usage.attendee_id AND user_can_access_event(a.event_id)
  )
);

-- 2) category_controls: scope admin manage to event via ticket_categories
DROP POLICY IF EXISTS "Admins can manage category controls" ON public.category_controls;

CREATE POLICY "Admins can manage category controls"
ON public.category_controls FOR ALL
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND EXISTS (
    SELECT 1 FROM public.ticket_categories tc
    WHERE tc.id = category_controls.category_id AND user_can_access_event(tc.event_id)
  )
)
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND EXISTS (
    SELECT 1 FROM public.ticket_categories tc
    WHERE tc.id = category_controls.category_id AND user_can_access_event(tc.event_id)
  )
);

-- 3) qr_templates: scope to event_id
DROP POLICY IF EXISTS "Admin users can create QR templates" ON public.qr_templates;
DROP POLICY IF EXISTS "Admin users can delete QR templates" ON public.qr_templates;
DROP POLICY IF EXISTS "Admin users can update QR templates" ON public.qr_templates;
DROP POLICY IF EXISTS "Admin users can view QR templates" ON public.qr_templates;

CREATE POLICY "Admin users can view QR templates"
ON public.qr_templates FOR SELECT
USING (user_has_role_secure(auth.uid(), 'admin'::user_role) AND user_can_access_event(event_id));

CREATE POLICY "Admin users can create QR templates"
ON public.qr_templates FOR INSERT
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'::user_role) AND user_can_access_event(event_id));

CREATE POLICY "Admin users can update QR templates"
ON public.qr_templates FOR UPDATE
USING (user_has_role_secure(auth.uid(), 'admin'::user_role) AND user_can_access_event(event_id))
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'::user_role) AND user_can_access_event(event_id));

CREATE POLICY "Admin users can delete QR templates"
ON public.qr_templates FOR DELETE
USING (user_has_role_secure(auth.uid(), 'admin'::user_role) AND user_can_access_event(event_id));

-- 4) ticket_templates: scope to event via event_config_id (nullable -> allow super admin or assigned)
DROP POLICY IF EXISTS "Admins can delete ticket templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can insert ticket templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can update ticket templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can view ticket templates" ON public.ticket_templates;

CREATE POLICY "Admins can view ticket templates"
ON public.ticket_templates FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND (
    event_config_id IS NULL AND is_super_admin()
    OR event_config_id IS NOT NULL AND user_can_access_event(event_config_id)
  )
);

CREATE POLICY "Admins can insert ticket templates"
ON public.ticket_templates FOR INSERT
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND event_config_id IS NOT NULL
  AND user_can_access_event(event_config_id)
);

CREATE POLICY "Admins can update ticket templates"
ON public.ticket_templates FOR UPDATE
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND (
    event_config_id IS NULL AND is_super_admin()
    OR event_config_id IS NOT NULL AND user_can_access_event(event_config_id)
  )
)
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND (
    event_config_id IS NULL AND is_super_admin()
    OR event_config_id IS NOT NULL AND user_can_access_event(event_config_id)
  )
);

CREATE POLICY "Admins can delete ticket templates"
ON public.ticket_templates FOR DELETE
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role)
  AND (
    event_config_id IS NULL AND is_super_admin()
    OR event_config_id IS NOT NULL AND user_can_access_event(event_config_id)
  )
);
