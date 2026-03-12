CREATE POLICY "Admin and control can delete control usage"
ON public.control_usage
FOR DELETE
TO public
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role) 
  OR user_has_role_secure(auth.uid(), 'control'::user_role)
);