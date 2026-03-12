CREATE OR REPLACE FUNCTION public.validar_ticket(qr uuid, punto text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  usos int;
begin
  -- Verificar existencia
  select usos_disponibles into usos from public.asistentes where qr_token = qr;

  if usos is null then
    return 'QR inválido';
  elsif usos <= 0 then
    return 'Ya utilizado';
  else
    -- Registrar ingreso
    insert into public.logs_entrada(qr_token, punto_control) values (qr, punto);
    -- Actualizar uso
    update public.asistentes set usos_disponibles = usos_disponibles - 1 where qr_token = qr;
    return 'Acceso permitido';
  end if;
end;
$function$;