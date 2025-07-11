-- Eliminar la política problemática que causa recursión
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Crear una política que use la función existing para evitar recursión
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (get_current_user_role() = 'admin');