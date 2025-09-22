-- Security Fix: Comprehensive protection for asistentes table (final corrected version)
-- Analysis: Table is legacy, empty, but contains sensitive PII schema

-- 1. Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation_type text NOT NULL,
  user_id uuid,
  user_email text,
  accessed_at timestamp with time zone NOT NULL DEFAULT NOW(),
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (public.is_super_admin());

-- 2. Create audit function for modification tracking
CREATE OR REPLACE FUNCTION public.audit_asistentes_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all modification attempts to asistentes table
  INSERT INTO public.security_audit_log (
    table_name,
    operation_type,
    user_id,
    user_email,
    accessed_at,
    details
  ) VALUES (
    'asistentes',
    TG_OP,
    auth.uid(),
    auth.email(),
    NOW(),
    json_build_object(
      'record_id', COALESCE(NEW.id, OLD.id),
      'sensitive_fields', array['nombre', 'email', 'empresa'],
      'operation', TG_OP
    )
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Remove existing policies and create stronger ones
DROP POLICY IF EXISTS "Admins can manage legacy asistentes" ON public.asistentes;

-- Separate policies for each operation (PostgreSQL requirement)
CREATE POLICY "Super admins can insert asistentes"
ON public.asistentes
FOR INSERT
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update asistentes"
ON public.asistentes
FOR UPDATE
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete asistentes"
ON public.asistentes
FOR DELETE
USING (public.is_super_admin());

-- Read-only access for regular admins
CREATE POLICY "Admins can view asistentes read-only"
ON public.asistentes
FOR SELECT
USING (
  public.get_current_user_role() = 'admin' 
  OR public.is_super_admin()
);

-- 4. Add audit triggers for data modifications
CREATE TRIGGER audit_asistentes_insert
  AFTER INSERT ON public.asistentes
  FOR EACH ROW EXECUTE FUNCTION public.audit_asistentes_access();

CREATE TRIGGER audit_asistentes_update
  AFTER UPDATE ON public.asistentes
  FOR EACH ROW EXECUTE FUNCTION public.audit_asistentes_access();

CREATE TRIGGER audit_asistentes_delete
  AFTER DELETE ON public.asistentes
  FOR EACH ROW EXECUTE FUNCTION public.audit_asistentes_access();

-- 5. Add table-level security documentation
COMMENT ON TABLE public.asistentes IS 
'LEGACY TABLE - CONTAINS SENSITIVE PII - DEPRECATED
Security Level: MAXIMUM
Access: Super Admin modify, Admin read-only
Audit: Modification logging enabled
Status: Legacy/Deprecated - Use attendees table instead
Contains: Personal names, emails, company information
Current State: Empty (0 records) - SECURE';

-- 6. Create security monitoring function
CREATE OR REPLACE FUNCTION public.get_asistentes_security_report()
RETURNS TABLE(
  total_records bigint,
  last_access timestamp with time zone,
  access_count_24h bigint,
  unique_users_accessed_24h bigint,
  security_status text,
  recommendations text[]
)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM public.asistentes) as total_records,
    (SELECT MAX(accessed_at) FROM public.security_audit_log WHERE table_name = 'asistentes') as last_access,
    (SELECT COUNT(*) FROM public.security_audit_log 
     WHERE table_name = 'asistentes' 
     AND accessed_at > NOW() - INTERVAL '24 hours') as access_count_24h,
    (SELECT COUNT(DISTINCT user_id) FROM public.security_audit_log 
     WHERE table_name = 'asistentes' 
     AND accessed_at > NOW() - INTERVAL '24 hours') as unique_users_accessed_24h,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.asistentes) = 0 THEN 'SECURE - No data present'
      WHEN (SELECT COUNT(*) FROM public.asistentes) > 0 THEN 'ALERT - Contains PII data'
      ELSE 'UNKNOWN'
    END as security_status,
    ARRAY[
      'Table is currently empty (secure state)',
      'Only super admins can modify data', 
      'Regular admins have read-only access',
      'All modifications are logged',
      'Consider using attendees table for new data',
      'Monitor audit logs regularly'
    ] as recommendations;
$$;