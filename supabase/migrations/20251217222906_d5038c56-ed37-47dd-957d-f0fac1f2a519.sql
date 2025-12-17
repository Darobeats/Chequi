-- Create SECURITY DEFINER function to check if user can manage event team
-- This avoids RLS recursion by bypassing policies internally
CREATE OR REPLACE FUNCTION public.can_manage_event_team(check_event_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin(check_user_id) OR 
    EXISTS (
      SELECT 1 FROM user_event_assignments
      WHERE user_id = check_user_id 
      AND event_id = check_event_id 
      AND role_in_event = 'admin'
    );
$$;

-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Event admins can view their event assignments" ON user_event_assignments;
DROP POLICY IF EXISTS "Event admins can manage their event assignments" ON user_event_assignments;
DROP POLICY IF EXISTS "Event admins can update their event assignments" ON user_event_assignments;
DROP POLICY IF EXISTS "Event admins can delete their event assignments" ON user_event_assignments;

-- Create new policies using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Users and admins can view event assignments"
ON user_event_assignments FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  can_manage_event_team(event_id, auth.uid())
);

CREATE POLICY "Event admins can insert assignments"
ON user_event_assignments FOR INSERT
TO authenticated
WITH CHECK (can_manage_event_team(event_id, auth.uid()));

CREATE POLICY "Event admins can update assignments"
ON user_event_assignments FOR UPDATE
TO authenticated
USING (can_manage_event_team(event_id, auth.uid()))
WITH CHECK (can_manage_event_team(event_id, auth.uid()));

CREATE POLICY "Event admins can delete assignments"
ON user_event_assignments FOR DELETE
TO authenticated
USING (can_manage_event_team(event_id, auth.uid()));

-- Seed: Add existing super admins as event admins for all active events
INSERT INTO user_event_assignments (user_id, event_id, role_in_event, is_primary)
SELECT 
  sa.user_id,
  ec.id,
  'admin',
  true
FROM super_admins sa
CROSS JOIN event_configs ec
WHERE sa.is_active = true 
AND ec.event_status IN ('active', 'draft')
ON CONFLICT DO NOTHING;