-- Phase 1: Fix Critical Privilege Escalation
-- Remove existing problematic policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access to attendees" ON public.attendees;
DROP POLICY IF EXISTS "Allow public update to attendees" ON public.attendees;
DROP POLICY IF EXISTS "Allow public read access to control_usage" ON public.control_usage;
DROP POLICY IF EXISTS "Allow public insert to control_usage" ON public.control_usage;

-- Create secure profile update policy (excluding role changes)
CREATE POLICY "Users can update own profile basic info" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    -- Prevent role modification by regular users
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admin-only policy for role management
CREATE POLICY "Admins can update any profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Phase 2: Secure Data Access Policies
-- Restrict attendees access to authenticated admin/control users only
CREATE POLICY "Admin and control can view attendees" 
  ON public.attendees 
  FOR SELECT 
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'control'));

CREATE POLICY "Admin and control can update attendees" 
  ON public.attendees 
  FOR UPDATE 
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'control'))
  WITH CHECK (get_current_user_role() IN ('admin', 'control'));

CREATE POLICY "Admin and control can insert attendees" 
  ON public.attendees 
  FOR INSERT 
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin', 'control'));

-- Restrict control_usage to admin/control users
CREATE POLICY "Admin and control can view control usage" 
  ON public.control_usage 
  FOR SELECT 
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'control'));

CREATE POLICY "Admin and control can insert control usage" 
  ON public.control_usage 
  FOR INSERT 
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('admin', 'control'));

-- Update event_configs to use profiles-based auth instead of admin_users
DROP POLICY IF EXISTS "Admin users can create event configs" ON public.event_configs;
DROP POLICY IF EXISTS "Admin users can update event configs" ON public.event_configs;
DROP POLICY IF EXISTS "Admin users can view event configs" ON public.event_configs;

CREATE POLICY "Admins can manage event configs - select" 
  ON public.event_configs 
  FOR SELECT 
  TO authenticated
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage event configs - insert" 
  ON public.event_configs 
  FOR INSERT 
  TO authenticated
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage event configs - update" 
  ON public.event_configs 
  FOR UPDATE 
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Secure control_types and category_controls for modifications
DROP POLICY IF EXISTS "Allow public read access to control_types" ON public.control_types;
DROP POLICY IF EXISTS "Allow public read access to category_controls" ON public.category_controls;

CREATE POLICY "Everyone can view control types" 
  ON public.control_types 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage control types" 
  ON public.control_types 
  FOR ALL 
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Everyone can view category controls" 
  ON public.category_controls 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage category controls" 
  ON public.category_controls 
  FOR ALL 
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');