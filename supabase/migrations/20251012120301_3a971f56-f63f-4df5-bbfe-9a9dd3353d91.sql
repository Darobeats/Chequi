-- Ensure RLS is enabled on security_audit_log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Super admins can view audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "No one can insert audit logs directly" ON public.security_audit_log;
DROP POLICY IF EXISTS "No one can update audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.security_audit_log;

-- Super admins can read audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (is_super_admin());

-- Explicitly deny direct INSERT - only triggers/functions should insert
CREATE POLICY "No one can insert audit logs directly"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Explicitly deny UPDATE - audit logs are immutable
CREATE POLICY "No one can update audit logs"
ON public.security_audit_log
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Explicitly deny DELETE - audit logs must be preserved
CREATE POLICY "No one can delete audit logs"
ON public.security_audit_log
FOR DELETE
TO authenticated
USING (false);

-- Grant necessary permissions for the audit trigger to work
-- The trigger runs with SECURITY DEFINER so it bypasses RLS
GRANT INSERT ON public.security_audit_log TO authenticated;