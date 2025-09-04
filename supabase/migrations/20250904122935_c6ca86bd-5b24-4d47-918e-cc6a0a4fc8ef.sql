-- Update the user digsa@chequi.com to have viewer role
UPDATE profiles 
SET role = 'viewer'
WHERE email = 'digsa@chequi.com';

-- Update RLS policies to allow viewer role to see attendees (read-only)
CREATE POLICY "Viewers can view attendees" 
ON public.attendees 
FOR SELECT 
USING (get_current_user_role() = 'viewer'::user_role);

-- Allow viewer to see control usage (read-only)
CREATE POLICY "Viewers can view control usage" 
ON public.control_usage 
FOR SELECT 
USING (get_current_user_role() = 'viewer'::user_role);

-- Allow viewer to see ticket categories
CREATE POLICY "Viewers can view ticket categories" 
ON public.ticket_categories 
FOR SELECT 
USING (get_current_user_role() = 'viewer'::user_role);

-- Allow viewer to see control types
CREATE POLICY "Viewers can view control types" 
ON public.control_types 
FOR SELECT 
USING (get_current_user_role() = 'viewer'::user_role);

-- Allow viewer to see category controls
CREATE POLICY "Viewers can view category controls" 
ON public.category_controls 
FOR SELECT 
USING (get_current_user_role() = 'viewer'::user_role);

-- Allow viewer to insert control usage (for scanner functionality)
CREATE POLICY "Viewers can insert control usage" 
ON public.control_usage 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'viewer'::user_role);