CREATE POLICY "Admin can delete access_logs for assigned events"
ON public.cedula_access_logs
FOR DELETE
TO authenticated
USING (
  user_can_access_event(event_id) 
  AND user_has_role_secure(auth.uid(), 'admin'::user_role)
);