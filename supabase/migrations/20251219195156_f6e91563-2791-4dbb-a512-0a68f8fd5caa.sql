-- URGENT: de-duplicate existing rows then enforce unique usage per (event_id, numero_cedula, control_type_id)
-- 1) Remove duplicates (keep earliest by used_at/created_at)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY event_id, numero_cedula, control_type_id
      ORDER BY used_at ASC, created_at ASC, id ASC
    ) AS rn
  FROM public.cedula_control_usage
)
DELETE FROM public.cedula_control_usage c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;

-- 2) Add UNIQUE constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cedula_control_usage_unique_event_cedula_control'
      AND conrelid = 'public.cedula_control_usage'::regclass
  ) THEN
    ALTER TABLE public.cedula_control_usage
      ADD CONSTRAINT cedula_control_usage_unique_event_cedula_control
      UNIQUE (event_id, numero_cedula, control_type_id);
  END IF;
END $$;
