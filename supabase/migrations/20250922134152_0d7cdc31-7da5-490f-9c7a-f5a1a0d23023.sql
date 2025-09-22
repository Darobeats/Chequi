-- Phase 1: Critical Security Fixes

-- Create super_admins table to replace hardcoded email system
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on super_admins table
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for super_admins table
CREATE POLICY "Super admins can view all super admin records"
ON public.super_admins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.super_admins sa 
    WHERE sa.user_id = auth.uid() AND sa.is_active = true
  )
);

CREATE POLICY "Super admins can manage super admin records"
ON public.super_admins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.super_admins sa 
    WHERE sa.user_id = auth.uid() AND sa.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.super_admins sa 
    WHERE sa.user_id = auth.uid() AND sa.is_active = true
  )
);

-- Insert the current hardcoded admin as the first super admin
INSERT INTO public.super_admins (user_id, email, notes)
SELECT 
  au.id,
  'iacristiandigital@gmail.com',
  'Initial super admin - migrated from hardcoded system'
FROM auth.users au
WHERE au.email = 'iacristiandigital@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Create security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins 
    WHERE user_id = check_user_id AND is_active = true
  );
$$;

-- Update existing database functions to use proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = required_role
  );
$$;

-- Update RLS policies to secure event configuration data
-- Remove overly permissive public access to ticket_categories
DROP POLICY IF EXISTS "Allow public read access to ticket_categories" ON public.ticket_categories;

-- Add authenticated-only access to ticket_categories
CREATE POLICY "Authenticated users can view ticket categories"
ON public.ticket_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Remove overly permissive public access to control_types  
DROP POLICY IF EXISTS "Everyone can view control types" ON public.control_types;

-- Add authenticated-only access to control_types
CREATE POLICY "Authenticated users can view control types"
ON public.control_types
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Remove overly permissive public access to category_controls
DROP POLICY IF EXISTS "Everyone can view category controls" ON public.category_controls;

-- Add authenticated-only access to category_controls
CREATE POLICY "Authenticated users can view category controls"
ON public.category_controls
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Clean up legacy tables with proper access control
-- Update asistentes table to have proper RLS instead of blanket denial
DROP POLICY IF EXISTS "Deny all access by default" ON public.asistentes;

CREATE POLICY "Admins can manage legacy asistentes"
ON public.asistentes
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Update logs_entrada table to have proper RLS instead of blanket denial  
DROP POLICY IF EXISTS "Deny all access by default" ON public.logs_entrada;

CREATE POLICY "Admins can manage legacy logs"
ON public.logs_entrada
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Add audit trigger for super_admins table
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_super_admins_updated_at
    BEFORE UPDATE ON public.super_admins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();