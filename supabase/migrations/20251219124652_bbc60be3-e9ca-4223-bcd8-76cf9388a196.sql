
-- =====================================================
-- FIX: Multi-event RLS policies
-- Replace get_active_event_id() with user_can_access_event(event_id)
-- =====================================================

-- =====================================================
-- 1. CONTROL_TYPES - Update policies
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view control types" ON control_types;
DROP POLICY IF EXISTS "Admins can manage control types" ON control_types;
DROP POLICY IF EXISTS "Viewers can view control types" ON control_types;

CREATE POLICY "Users can view control types for assigned events"
ON control_types FOR SELECT
USING (user_can_access_event(event_id) OR is_super_admin());

CREATE POLICY "Admins can manage control types for assigned events"
ON control_types FOR ALL
USING (
  (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'admin'::user_role))
  OR is_super_admin()
)
WITH CHECK (
  (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'admin'::user_role))
  OR is_super_admin()
);

-- =====================================================
-- 2. TICKET_CATEGORIES - Update policies
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view ticket categories" ON ticket_categories;
DROP POLICY IF EXISTS "Admins can insert ticket categories" ON ticket_categories;
DROP POLICY IF EXISTS "Admins can update ticket categories" ON ticket_categories;
DROP POLICY IF EXISTS "Admins can delete ticket categories" ON ticket_categories;
DROP POLICY IF EXISTS "Viewers can view ticket categories" ON ticket_categories;

CREATE POLICY "Users can view ticket categories for assigned events"
ON ticket_categories FOR SELECT
USING (user_can_access_event(event_id) OR is_super_admin());

CREATE POLICY "Admins can insert ticket categories for assigned events"
ON ticket_categories FOR INSERT
WITH CHECK (
  (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'admin'::user_role))
  OR is_super_admin()
);

CREATE POLICY "Admins can update ticket categories for assigned events"
ON ticket_categories FOR UPDATE
USING (
  (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'admin'::user_role))
  OR is_super_admin()
)
WITH CHECK (
  (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'admin'::user_role))
  OR is_super_admin()
);

CREATE POLICY "Admins can delete ticket categories for assigned events"
ON ticket_categories FOR DELETE
USING (
  (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'admin'::user_role))
  OR is_super_admin()
);

-- =====================================================
-- 3. ATTENDEES - Update policies
-- =====================================================
DROP POLICY IF EXISTS "Admin and control can view attendees" ON attendees;
DROP POLICY IF EXISTS "Admin and control can insert attendees" ON attendees;
DROP POLICY IF EXISTS "Admin and control can update attendees" ON attendees;
DROP POLICY IF EXISTS "Admin and control can delete attendees" ON attendees;
DROP POLICY IF EXISTS "Attendees can view own record" ON attendees;
DROP POLICY IF EXISTS "Viewers can view attendees" ON attendees;

CREATE POLICY "Admin and control can view attendees for assigned events"
ON attendees FOR SELECT
USING (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
);

CREATE POLICY "Admin and control can insert attendees for assigned events"
ON attendees FOR INSERT
WITH CHECK (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
);

CREATE POLICY "Admin and control can update attendees for assigned events"
ON attendees FOR UPDATE
USING (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
)
WITH CHECK (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
);

CREATE POLICY "Admin and control can delete attendees for assigned events"
ON attendees FOR DELETE
USING (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
);

CREATE POLICY "Viewers can view attendees for assigned events"
ON attendees FOR SELECT
USING (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'viewer'::user_role));

CREATE POLICY "Attendees can view own record"
ON attendees FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'attendee'::user_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.attendee_id = attendees.id)
);

-- =====================================================
-- 4. CEDULAS_AUTORIZADAS - Update policies
-- =====================================================
DROP POLICY IF EXISTS "Admin and control can manage cedulas_autorizadas" ON cedulas_autorizadas;
DROP POLICY IF EXISTS "Scanner can view cedulas_autorizadas" ON cedulas_autorizadas;

CREATE POLICY "Admin and control can manage cedulas_autorizadas for assigned events"
ON cedulas_autorizadas FOR ALL
USING (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
)
WITH CHECK (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
);

CREATE POLICY "Scanner can view cedulas_autorizadas for assigned events"
ON cedulas_autorizadas FOR SELECT
USING (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'scanner'::user_role));

-- =====================================================
-- 5. CEDULA_REGISTROS - Update policies
-- =====================================================
DROP POLICY IF EXISTS "Admin and control can manage cedula_registros" ON cedula_registros;
DROP POLICY IF EXISTS "Scanners can insert cedula_registros" ON cedula_registros;
DROP POLICY IF EXISTS "Viewers can view cedula_registros" ON cedula_registros;

CREATE POLICY "Admin and control can manage cedula_registros for assigned events"
ON cedula_registros FOR ALL
USING (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
)
WITH CHECK (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
);

CREATE POLICY "Scanners can insert cedula_registros for assigned events"
ON cedula_registros FOR INSERT
WITH CHECK (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'scanner'::user_role));

CREATE POLICY "Scanners can view cedula_registros for assigned events"
ON cedula_registros FOR SELECT
USING (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'scanner'::user_role));

CREATE POLICY "Viewers can view cedula_registros for assigned events"
ON cedula_registros FOR SELECT
USING (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'viewer'::user_role));

-- =====================================================
-- 6. CEDULA_CONTROL_USAGE - Update policies
-- =====================================================
DROP POLICY IF EXISTS "Admin and control can manage cedula_control_usage" ON cedula_control_usage;
DROP POLICY IF EXISTS "Scanner can insert cedula_control_usage" ON cedula_control_usage;
DROP POLICY IF EXISTS "Scanner can view cedula_control_usage" ON cedula_control_usage;

CREATE POLICY "Admin and control can manage cedula_control_usage for assigned events"
ON cedula_control_usage FOR ALL
USING (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
)
WITH CHECK (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
);

CREATE POLICY "Scanner can insert cedula_control_usage for assigned events"
ON cedula_control_usage FOR INSERT
WITH CHECK (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'scanner'::user_role));

CREATE POLICY "Scanner can view cedula_control_usage for assigned events"
ON cedula_control_usage FOR SELECT
USING (user_can_access_event(event_id) AND user_has_role_secure(auth.uid(), 'scanner'::user_role));

-- =====================================================
-- 7. CEDULA_ACCESS_LOGS - Update policies
-- =====================================================
DROP POLICY IF EXISTS "Admin and control can view access_logs" ON cedula_access_logs;
DROP POLICY IF EXISTS "Admin control scanner can insert access_logs" ON cedula_access_logs;

CREATE POLICY "Admin and control can view access_logs for assigned events"
ON cedula_access_logs FOR SELECT
USING (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
);

CREATE POLICY "Admin control scanner can insert access_logs for assigned events"
ON cedula_access_logs FOR INSERT
WITH CHECK (
  user_can_access_event(event_id) AND 
  (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role) OR user_has_role_secure(auth.uid(), 'scanner'::user_role))
);
