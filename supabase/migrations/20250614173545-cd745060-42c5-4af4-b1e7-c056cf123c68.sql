
-- Crear enum para tipos de usuario
CREATE TYPE public.user_role AS ENUM ('admin', 'control', 'attendee');

-- Crear tabla profiles para información adicional de usuarios
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'attendee',
  attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en la tabla profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
-- Los usuarios pueden ver solo su propio perfil
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (public.auth_uid() = id);

-- Los usuarios pueden actualizar solo su propio perfil básico (no el rol)
CREATE POLICY "Users can update own profile basic info" 
  ON public.profiles 
  FOR UPDATE 
  USING (public.auth_uid() = id);

-- Solo admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = public.auth_uid() AND role = 'admin'
    )
  );

-- Solo admins pueden insertar nuevos perfiles
CREATE POLICY "Admins can insert profiles" 
  ON public.profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = public.auth_uid() AND role = 'admin'
    )
  );

-- Solo admins pueden actualizar cualquier perfil
CREATE POLICY "Admins can update all profiles" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = public.auth_uid() AND role = 'admin'
    )
  );

-- Solo admins pueden eliminar perfiles
CREATE POLICY "Admins can delete profiles" 
  ON public.profiles 
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = public.auth_uid() AND role = 'admin'
    )
  );

-- Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'attendee'  -- rol por defecto
  );
  RETURN NEW;
END;
$$;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función helper para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Función helper para verificar si el usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.has_role(required_role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = required_role
  )
$$;

-- Actualizar políticas RLS de attendees para que los asistentes solo vean su propio registro
DROP POLICY IF EXISTS "Enable read access for all users" ON public.attendees;
CREATE POLICY "Attendees can view own record" 
  ON public.attendees 
  FOR SELECT 
  TO authenticated
  USING (
    -- Admins pueden ver todos
    public.has_role('admin') OR
    -- Controles pueden ver todos para scanner
    public.has_role('control') OR
    -- Asistentes solo pueden ver el suyo
    (public.has_role('attendee') AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = public.auth_uid() AND attendee_id = attendees.id
    ))
  );

-- Política para control_usage - solo admins y controles pueden crear registros
ALTER TABLE public.control_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and controls can manage usage" 
  ON public.control_usage 
  FOR ALL 
  TO authenticated
  USING (public.has_role('admin') OR public.has_role('control'));

CREATE POLICY "Users can view relevant usage records" 
  ON public.control_usage 
  FOR SELECT 
  TO authenticated
  USING (
    -- Admins pueden ver todos
    public.has_role('admin') OR
    -- Controles pueden ver todos
    public.has_role('control') OR
    -- Asistentes pueden ver solo los suyos
    (public.has_role('attendee') AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.attendees a ON p.attendee_id = a.id
      WHERE p.id = public.auth_uid() AND a.id = control_usage.attendee_id
    ))
  );
