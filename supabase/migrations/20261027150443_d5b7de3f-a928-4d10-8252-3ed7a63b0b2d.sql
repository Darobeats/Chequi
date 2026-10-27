CREATE OR REPLACE FUNCTION public.cascade_cedula_usage_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.cedula_control_usage
   WHERE event_id = OLD.event_id AND numero_cedula = OLD.numero_cedula
     AND NOT EXISTS (SELECT 1 FROM public.cedula_registros r WHERE r.event_id = OLD.event_id AND r.numero_cedula = OLD.numero_cedula AND r.id <> OLD.id);
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.cascade_cedula_usage_delete() FROM anon, authenticated, public;
DROP TRIGGER IF EXISTS trg_cascade_cedula_usage_delete ON public.cedula_registros;
CREATE TRIGGER trg_cascade_cedula_usage_delete AFTER DELETE ON public.cedula_registros
FOR EACH ROW EXECUTE FUNCTION public.cascade_cedula_usage_delete();
DELETE FROM public.cedula_control_usage u
 WHERE NOT EXISTS (SELECT 1 FROM public.cedula_registros r WHERE r.event_id = u.event_id AND r.numero_cedula = u.numero_cedula);