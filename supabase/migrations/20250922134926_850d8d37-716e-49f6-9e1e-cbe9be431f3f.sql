-- Security Fix: Comprehensive protection for asistentes table (corrected version)
-- Analysis: Table is legacy, empty, but contains sensitive PII schema

-- 1. Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation_type text NOT NULL,
  user_id uuid,
  user_email text,
  accessed_at timestamp with time zone NOT NULL DEFAULT NOW(),
  ip_address text,
  user_agent text,
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

-- 2. Create audit function (without SELECT trigger which is invalid)
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

-- 3. Strengthen RLS policies for asistentes with additional security layers
DROP POLICY IF EXISTS "Admins can manage legacy asistentes" ON public.asistentes;

-- More restrictive policy: Only super admins can modify asistentes
CREATE POLICY "Super admins only can modify asistentes"
ON public.asistentes
FOR INSERT, UPDATE, DELETE
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Add read-only access for regular admins (view only, no modify)
CREATE POLICY "Admins can view asistentes read-only"
ON public.asistentes
FOR SELECT
USING (
  public.get_current_user_role() = 'admin' 
  OR public.is_super_admin()
);

-- 4. Add audit triggers for data modifications only (SELECT triggers don't exist)
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
Empty: Currently contains 0 records (secure state)';

-- 6. Create secure migration function to move data to new attendees table
CREATE OR REPLACE FUNCTION public.migrate_asistentes_to_attendees()
RETURNS TABLE(migrated_count integer, errors text[]) 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec RECORD;
  migrated_count integer := 0;
  errors text[] := '{}';
  default_category_id uuid;
BEGIN
  -- Only super admins can run migration
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  -- Log migration attempt
  INSERT INTO public.security_audit_log (
    table_name, operation_type, user_id, user_email, details
  ) VALUES (
    'asistentes', 'MIGRATION_ATTEMPT', auth.uid(), auth.email(),
    json_build_object('function', 'migrate_asistentes_to_attendees')
  );
  
  -- Get or create default category for migration
  SELECT id INTO default_category_id 
  FROM public.ticket_categories 
  WHERE name = 'Migrated Legacy' 
  LIMIT 1;
  
  IF default_category_id IS NULL THEN
    INSERT INTO public.ticket_categories (name, description, color)
    VALUES ('Migrated Legacy', 'Migrated from legacy asistentes table', '#666666')
    RETURNING id INTO default_category_id;
  END IF;
  
  -- Migrate data safely
  FOR rec IN SELECT * FROM public.asistentes LOOP
    BEGIN
      INSERT INTO public.attendees (
        ticket_id,
        name,
        email,
        category_id,
        status,
        qr_code
      ) VALUES (
        rec.ticket_id,
        rec.nombre,
        rec.email,
        default_category_id,
        'valid',
        rec.qr_token::text
      );
      migrated_count := migrated_count + 1;
    EXCEPTION WHEN OTHERS THEN
      errors := errors || (SQLERRM || ' for record: ' || rec.id);
    END;
  END LOOP;
  
  -- Log migration completion
  INSERT INTO public.security_audit_log (
    table_name, operation_type, user_id, user_email, details
  ) VALUES (
    'asistentes', 'MIGRATION_COMPLETED', auth.uid(), auth.email(),
    json_build_object('migrated_count', migrated_count, 'error_count', array_length(errors, 1))
  );
  
  RETURN QUERY SELECT migrated_count, errors;
END;
$$;

-- 7. Add security monitoring function
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
      'Consider migrating any future data to attendees table',
      'Monitor audit logs regularly'
    ] as recommendations;
$$;

-- 8. Create emergency lockdown function
CREATE OR REPLACE FUNCTION public.emergency_lockdown_asistentes()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only super admins can execute emergency lockdown
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  -- Remove all access policies
  DROP POLICY IF EXISTS "Super admins only can modify asistentes" ON public.asistentes;
  DROP POLICY IF EXISTS "Admins can view asistentes read-only" ON public.asistentes;
  
  -- Create ultra-restrictive policy
  CREATE POLICY "Emergency lockdown - no access"
  ON public.asistentes
  FOR ALL
  USING (false)
  WITH CHECK (false);
  
  -- Log emergency action
  INSERT INTO public.security_audit_log (
    table_name, operation_type, user_id, user_email, details
  ) VALUES (
    'asistentes', 'EMERGENCY_LOCKDOWN', auth.uid(), auth.email(),
    json_build_object('action', 'emergency_lockdown_activated', 'timestamp', NOW())
  );
  
  RETURN 'Emergency lockdown activated - All access to asistentes table blocked';
END;
$$;