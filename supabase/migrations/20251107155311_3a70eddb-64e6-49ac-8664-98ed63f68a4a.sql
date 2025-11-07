-- ============================================================================
-- ACTUALIZACIÓN DEL TRIGGER handle_new_user
-- ============================================================================

-- El trigger anterior insertaba roles en profiles, ahora debe usar user_roles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert into profiles (without role)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Insert default role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'attendee');
  
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user IS 'Trigger function that creates profile and assigns default attendee role when new user signs up';

-- ============================================================================
-- ELIMINAR POLICIES QUE DEPENDEN DE profiles.role
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own profile basic info" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can create own profile with attendee role o" ON public.profiles;

-- Recrear policies sin dependencia de role
CREATE POLICY "Users can update own profile basic info"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can create own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id AND email = auth.email());

-- ============================================================================
-- LIMPIEZA: Eliminar columna role de profiles (AHORA ES SEGURO)
-- ============================================================================

-- Ahora que todo el código usa user_roles, podemos eliminar la columna role de profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

COMMENT ON TABLE public.profiles IS 'User profiles - roles are now stored separately in user_roles table for security';