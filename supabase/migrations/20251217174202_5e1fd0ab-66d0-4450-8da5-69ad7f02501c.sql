-- Drop existing foreign key constraint on cedula_registros.scanned_by
ALTER TABLE public.cedula_registros 
DROP CONSTRAINT IF EXISTS cedula_registros_scanned_by_fkey;

-- Recreate with ON DELETE SET NULL so users can be deleted
ALTER TABLE public.cedula_registros 
ADD CONSTRAINT cedula_registros_scanned_by_fkey 
FOREIGN KEY (scanned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Also fix cedula_access_logs.scanned_by if it has the same issue
ALTER TABLE public.cedula_access_logs 
DROP CONSTRAINT IF EXISTS cedula_access_logs_scanned_by_fkey;

ALTER TABLE public.cedula_access_logs 
ADD CONSTRAINT cedula_access_logs_scanned_by_fkey 
FOREIGN KEY (scanned_by) REFERENCES auth.users(id) ON DELETE SET NULL;