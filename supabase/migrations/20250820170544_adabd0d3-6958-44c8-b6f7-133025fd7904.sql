-- Fix critical security vulnerability: Restrict QR template access to admin users only
-- This prevents exposure of QR code generation patterns that could enable ticket forgery

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to select from qr_templates" ON public.qr_templates;
DROP POLICY IF EXISTS "Allow authenticated users to insert into qr_templates" ON public.qr_templates;
DROP POLICY IF EXISTS "Allow authenticated users to update qr_templates" ON public.qr_templates;
DROP POLICY IF EXISTS "Allow authenticated users to delete from qr_templates" ON public.qr_templates;

-- Create secure admin-only policies for QR templates
CREATE POLICY "Admin users can view QR templates" 
ON public.qr_templates 
FOR SELECT 
USING (get_current_user_role() = 'admin'::user_role);

CREATE POLICY "Admin users can create QR templates" 
ON public.qr_templates 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin'::user_role);

CREATE POLICY "Admin users can update QR templates" 
ON public.qr_templates 
FOR UPDATE 
USING (get_current_user_role() = 'admin'::user_role)
WITH CHECK (get_current_user_role() = 'admin'::user_role);

CREATE POLICY "Admin users can delete QR templates" 
ON public.qr_templates 
FOR DELETE 
USING (get_current_user_role() = 'admin'::user_role);