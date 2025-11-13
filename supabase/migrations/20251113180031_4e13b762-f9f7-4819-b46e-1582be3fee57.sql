-- =====================================================
-- PASO 1: Actualizar enum y migrar datos
-- =====================================================

-- 1. Agregar el nuevo rol 'scanner' al enum existente
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'scanner';

-- 2. Migrar todos los usuarios con rol 'viewer' a 'control'
UPDATE public.user_roles 
SET role = 'control' 
WHERE role = 'viewer';

-- 3. Verificar migración
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'viewer') THEN
    RAISE EXCEPTION 'Aún existen usuarios con rol viewer';
  END IF;
END $$;