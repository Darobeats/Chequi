-- Eliminar la política pública insegura que permite bypass de controles de acceso
DROP POLICY IF EXISTS "Public scanner access for control usage" ON public.control_usage;

-- La funcionalidad del scanner público debe manejarse a través de Edge Functions
-- que pueden validar y registrar de manera segura sin exponer la tabla directamente