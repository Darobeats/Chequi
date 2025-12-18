-- =====================================================
-- LIMPIEZA Y OPTIMIZACIÓN DE BASE DE DATOS
-- Elimina tablas legacy vacías y agrega índices de optimización
-- =====================================================

-- 1. Eliminar tablas legacy que ya no se usan (todas están vacías)
DROP TABLE IF EXISTS public.logs_entrada CASCADE;
DROP TABLE IF EXISTS public.asistentes CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- 2. Eliminar funciones legacy asociadas a las tablas eliminadas
DROP FUNCTION IF EXISTS public.validar_ticket() CASCADE;
DROP FUNCTION IF EXISTS public.audit_asistentes_access() CASCADE;

-- 3. Agregar índice compuesto para optimizar búsquedas de access_logs por resultado
CREATE INDEX IF NOT EXISTS idx_cedula_access_logs_result 
ON public.cedula_access_logs(event_id, access_result);

-- 4. Agregar índice para búsquedas rápidas de registros por evento y fecha
CREATE INDEX IF NOT EXISTS idx_cedula_registros_event_date 
ON public.cedula_registros(event_id, scanned_at DESC);

-- 5. Agregar índice para búsquedas de cédulas autorizadas por número
CREATE INDEX IF NOT EXISTS idx_cedulas_autorizadas_numero 
ON public.cedulas_autorizadas(event_id, numero_cedula);