-- Limpiar todos los registros de asistentes y control de uso para empezar pruebas limpias

-- Primero eliminar registros de control_usage (tabla dependiente)
DELETE FROM public.control_usage;

-- Luego eliminar todos los asistentes
DELETE FROM public.attendees;

-- Opcionalmente resetear las secuencias si es necesario
-- (No aplicable ya que usamos UUID por defecto)