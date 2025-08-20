-- Add missing DELETE policy so admins/controls can remove attendees
CREATE POLICY IF NOT EXISTS "Admin and control can delete attendees"
ON public.attendees
FOR DELETE
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'control'::user_role]));