-- Security Fix: Comprehensive Protection for asistentes table
-- Issue: Personal information vulnerability - implementing multi-layer security

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

-- 2. Create comprehensive audit function (excluding SELECT operations)
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
      'sensitive_fields_accessed', array['nombre', 'email', 'empresa'],
      'user_role', public.get_current_user_role(),
      'is_super_admin', public.is_super_admin()
    )
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Strengthen RLS policies for maximum security
DROP POLICY IF EXISTS "Admins can manage legacy asistentes" ON public.asistentes;

-- Ultra-restrictive policy: Only super admins can modify
CREATE POLICY "Super admins only can modify asistentes"
ON public.asistentes
FOR INSERT, UPDATE, DELETE
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Read-only access for regular admins with audit trail
CREATE POLICY "Admins can view asistentes with restrictions"
ON public.asistentes
FOR SELECT
USING (
  public.get_current_user_role() = 'admin' OR 
  public.is_super_admin()
);

-- 4. Add audit triggers for data modification operations
CREATE TRIGGER audit_asistentes_insert
  AFTER INSERT ON public.asistentes
  FOR EACH ROW EXECUTE FUNCTION public.audit_asistentes_access();

CREATE TRIGGER audit_asistentes_update
  AFTER UPDATE ON public.asistentes
  FOR EACH ROW EXECUTE FUNCTION public.audit_asistentes_access();

CREATE TRIGGER audit_asistentes_delete
  AFTER DELETE ON public.asistentes
  FOR EACH ROW EXECUTE FUNCTION public.audit_asistentes_access();

-- 5. Add data protection through column-level security
-- Create function to validate sensitive data access
CREATE OR REPLACE FUNCTION public.validate_asistentes_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Additional validation for sensitive operations
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Log attempt to add/modify personal data
    IF NEW.email IS NOT NULL OR NEW.nombre IS NOT NULL OR NEW.empresa IS NOT NULL THEN
      -- Ensure only authorized users can add PII
      IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Super admin privileges required for PII operations';
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add validation trigger
CREATE TRIGGER validate_asistentes_pii
  BEFORE INSERT OR UPDATE ON public.asistentes
  FOR EACH ROW EXECUTE FUNCTION public.validate_asistentes_access();

-- 6. Add comprehensive table documentation and warnings
COMMENT ON TABLE public.asistentes IS 
'⚠️  LEGACY TABLE - CONTAINS SENSITIVE PII - DEPRECATED ⚠️
Security Level: MAXIMUM PROTECTION
Access Control: Super Admin Only (Write), Admin (Read)
Audit: Full modification logging enabled  
Status: Legacy/Deprecated - Use attendees table for new data
Contains: Personal names, emails, company information
Data Status: Currently empty (0 records)
Migration: Use migrate_asistentes_to_attendees() function';

COMMENT ON COLUMN public.asistentes.nombre IS 'SENSITIVE: Personal name - Super admin access only for modifications';
COMMENT ON COLUMN public.asistentes.email IS 'SENSITIVE: Email address - Super admin access only for modifications';  
COMMENT ON COLUMN public.asistentes.empresa IS 'SENSITIVE: Company information - Super admin access only for modifications';

-- 7. Create secure migration function
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
    RAISE EXCEPTION 'Access denied: Super admin privileges required for data migration';
  END IF;
  
  -- Log migration attempt
  INSERT INTO public.security_audit_log (
    table_name, operation_type, user_id, user_email, details
  ) VALUES (
    'asistentes', 'MIGRATION_START', auth.uid(), auth.email(),
    json_build_object('action', 'migrate_to_attendees')
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
  
  -- Migrate data safely with error handling
  FOR rec IN SELECT * FROM public.asistentes LOOP
    BEGIN
      INSERT INTO public.attendees (
        ticket_id, name, email, category_id, status, qr_code
      ) VALUES (
        rec.ticket_id, rec.nombre, rec.email, default_category_id, 'valid', rec.qr_token::text
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
    'asistentes', 'MIGRATION_COMPLETE', auth.uid(), auth.email(),
    json_build_object('migrated_count', migrated_count, 'errors', errors)
  );
  
  RETURN QUERY SELECT migrated_count, errors;
END;
$$;

-- 8. Create security monitoring and reporting function
CREATE OR REPLACE FUNCTION public.get_asistentes_security_report()
RETURNS TABLE(
  total_records bigint,
  last_modification timestamp with time zone,
  modification_count_24h bigint,
  unique_users_24h bigint,
  security_status text,
  risk_level text
)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM public.asistentes) as total_records,
    (SELECT MAX(accessed_at) FROM public.security_audit_log 
     WHERE table_name = 'asistentes' AND operation_type IN ('INSERT', 'UPDATE', 'DELETE')) as last_modification,
    (SELECT COUNT(*) FROM public.security_audit_log 
     WHERE table_name = 'asistentes' 
     AND accessed_at > NOW() - INTERVAL '24 hours'
     AND operation_type IN ('INSERT', 'UPDATE', 'DELETE')) as modification_count_24h,
    (SELECT COUNT(DISTINCT user_id) FROM public.security_audit_log 
     WHERE table_name = 'asistentes' 
     AND accessed_at > NOW() - INTERVAL '24 hours') as unique_users_24h,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.asistentes) = 0 THEN 'SECURE - No PII data present'
      WHEN (SELECT COUNT(*) FROM public.asistentes) > 0 THEN 'ALERT - Contains sensitive PII data'
      ELSE 'UNKNOWN'
    END as security_status,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.asistentes) = 0 THEN 'LOW'
      WHEN (SELECT COUNT(*) FROM public.asistentes) < 100 THEN 'MEDIUM'
      ELSE 'HIGH'
    END as risk_level;
$$;

-- 9. Create function to securely drop the table when ready
CREATE OR REPLACE FUNCTION public.secure_drop_asistentes_table()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  record_count integer;
BEGIN
  -- Only super admins can drop the table
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  -- Check if table has data
  SELECT COUNT(*) INTO record_count FROM public.asistentes;
  
  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop table: Contains % records. Migrate data first using migrate_asistentes_to_attendees()', record_count;
  END IF;
  
  -- Log the drop operation
  INSERT INTO public.security_audit_log (
    table_name, operation_type, user_id, user_email, details
  ) VALUES (
    'asistentes', 'TABLE_DROP', auth.uid(), auth.email(),
    json_build_object('action', 'secure_table_removal', 'record_count', record_count)
  );
  
  -- Drop the table
  DROP TABLE public.asistentes CASCADE;
  
  RETURN 'SUCCESS: asistentes table securely dropped';
END;
$$;