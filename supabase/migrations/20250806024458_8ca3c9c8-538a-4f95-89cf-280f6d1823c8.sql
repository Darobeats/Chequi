-- Enable RLS policies for ticket categories management
-- Allow admins to manage ticket categories

-- Add INSERT policy for admins
CREATE POLICY "Admins can insert ticket categories" 
ON public.ticket_categories 
FOR INSERT 
TO authenticated
WITH CHECK (get_current_user_role() = 'admin'::user_role);

-- Add UPDATE policy for admins
CREATE POLICY "Admins can update ticket categories" 
ON public.ticket_categories 
FOR UPDATE 
TO authenticated
USING (get_current_user_role() = 'admin'::user_role)
WITH CHECK (get_current_user_role() = 'admin'::user_role);

-- Add DELETE policy for admins
CREATE POLICY "Admins can delete ticket categories" 
ON public.ticket_categories 
FOR DELETE 
TO authenticated
USING (get_current_user_role() = 'admin'::user_role);