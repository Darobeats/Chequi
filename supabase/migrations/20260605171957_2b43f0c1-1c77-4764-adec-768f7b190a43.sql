ALTER TABLE public.cedula_registros REPLICA IDENTITY FULL;
ALTER TABLE public.cedula_control_usage REPLICA IDENTITY FULL;
ALTER TABLE public.cedula_access_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cedula_registros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cedula_control_usage;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cedula_access_logs;