-- Actualizar el rol del usuario a admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'iacristiandigital@gmail.com';