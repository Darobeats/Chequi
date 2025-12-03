-- =====================================================
-- SISTEMA DE CONTROL DE ACCESO POR LISTA BLANCA
-- =====================================================

-- 1. Agregar columna de configuración a event_configs
ALTER TABLE public.event_configs 
ADD COLUMN IF NOT EXISTS require_whitelist BOOLEAN DEFAULT false;

-- 2. Crear tabla cedulas_autorizadas
CREATE TABLE IF NOT EXISTS public.cedulas_autorizadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.event_configs(id) ON DELETE CASCADE,
  numero_cedula TEXT NOT NULL,
  nombre_completo TEXT,
  categoria TEXT,
  empresa TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  
  -- Evitar duplicados por evento
  CONSTRAINT cedulas_autorizadas_event_cedula_unique UNIQUE(event_id, numero_cedula)
);

-- 3. Crear tabla cedula_access_logs (intentos de acceso)
CREATE TABLE IF NOT EXISTS public.cedula_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.event_configs(id) ON DELETE CASCADE,
  numero_cedula TEXT NOT NULL,
  nombre_detectado TEXT,
  access_result TEXT NOT NULL CHECK (access_result IN ('authorized', 'denied', 'duplicate')),
  denial_reason TEXT,
  scanned_by UUID,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_cedulas_autorizadas_lookup 
ON public.cedulas_autorizadas(event_id, numero_cedula);

CREATE INDEX IF NOT EXISTS idx_cedula_access_logs_event 
ON public.cedula_access_logs(event_id, created_at DESC);

-- 5. Habilitar RLS
ALTER TABLE public.cedulas_autorizadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cedula_access_logs ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para cedulas_autorizadas
-- Admin y Control pueden gestionar todo
CREATE POLICY "Admin and control can manage cedulas_autorizadas"
ON public.cedulas_autorizadas
FOR ALL
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role) OR 
  user_has_role_secure(auth.uid(), 'control'::user_role)
)
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin'::user_role) OR 
  user_has_role_secure(auth.uid(), 'control'::user_role)
);

-- Scanner puede consultar (para validación)
CREATE POLICY "Scanner can view cedulas_autorizadas"
ON public.cedulas_autorizadas
FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'scanner'::user_role) AND 
  event_id = get_active_event_id()
);

-- 7. Políticas RLS para cedula_access_logs
-- Admin y Control pueden ver todos los logs
CREATE POLICY "Admin and control can view access_logs"
ON public.cedula_access_logs
FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role) OR 
  user_has_role_secure(auth.uid(), 'control'::user_role)
);

-- Admin, Control y Scanner pueden insertar logs
CREATE POLICY "Admin control scanner can insert access_logs"
ON public.cedula_access_logs
FOR INSERT
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin'::user_role) OR 
  user_has_role_secure(auth.uid(), 'control'::user_role) OR
  user_has_role_secure(auth.uid(), 'scanner'::user_role)
);