-- Crear tabla para registro de cédulas colombianas
CREATE TABLE cedula_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_configs(id) ON DELETE CASCADE,
  numero_cedula TEXT NOT NULL,
  primer_apellido TEXT NOT NULL,
  segundo_apellido TEXT,
  nombres TEXT NOT NULL,
  nombre_completo TEXT GENERATED ALWAYS AS (
    TRIM(nombres || ' ' || primer_apellido || ' ' || COALESCE(segundo_apellido, ''))
  ) STORED,
  fecha_nacimiento DATE,
  sexo TEXT CHECK (sexo IN ('M', 'F')),
  rh TEXT,
  lugar_expedicion TEXT,
  fecha_expedicion DATE,
  raw_data TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scanned_by UUID REFERENCES auth.users(id),
  device_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Evitar duplicados por evento
  UNIQUE(event_id, numero_cedula)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_cedula_registros_event ON cedula_registros(event_id);
CREATE INDEX idx_cedula_registros_cedula ON cedula_registros(numero_cedula);
CREATE INDEX idx_cedula_registros_scanned ON cedula_registros(scanned_at);
CREATE INDEX idx_cedula_registros_nombre ON cedula_registros(nombre_completo);

-- Habilitar RLS
ALTER TABLE cedula_registros ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Admin y control pueden gestionar registros
CREATE POLICY "Admin and control can manage cedula_registros"
ON cedula_registros FOR ALL
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role) 
  OR user_has_role_secure(auth.uid(), 'control'::user_role)
)
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin'::user_role) 
  OR user_has_role_secure(auth.uid(), 'control'::user_role)
);

-- Viewers pueden ver registros
CREATE POLICY "Viewers can view cedula_registros"
ON cedula_registros FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'viewer'::user_role)
  AND event_id = get_active_event_id()
);

-- Scanners pueden insertar registros
CREATE POLICY "Scanners can insert cedula_registros"
ON cedula_registros FOR INSERT
WITH CHECK (
  user_has_role_secure(auth.uid(), 'scanner'::user_role)
  AND event_id = get_active_event_id()
);