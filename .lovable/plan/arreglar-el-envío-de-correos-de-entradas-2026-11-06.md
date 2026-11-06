# Arreglar el envío de correos de entradas

## Causa
Resend verificó el dominio **ticket.chequi.online**, pero Chequi envía desde **contacto@chequi.online** (dominio raíz, no verificado). Resend rechaza todo correo cuyo remitente no pertenezca a un dominio verificado, por eso falla incluso la prueba.

## Solución
1. Cambiar el remitente a **contacto@ticket.chequi.online** (nombre visible: "Chequi" o el nombre del evento, como hoy).
2. Poner "Responder a" = **contacto@chequi.online**, para que las respuestas de los asistentes lleguen a su correo corporativo habitual.
3. Mostrar en la pantalla de Envíos el motivo exacto cuando Resend rechace un correo (en lugar de un error genérico).
4. Enviar un correo de prueba real y confirmar que llega.
5. Actualizar la nota guardada del remitente.

## Detalles técnicos
- `supabase/functions/send-ticket-campaign/index.ts`: `FROM_EMAIL = "contacto@ticket.chequi.online"`, añadir `reply_to: ["contacto@chequi.online"]`, propagar status/cuerpo de error del gateway al cliente; redeploy.
- Revisar logs de la función para confirmar el error 403 de dominio no verificado antes del cambio.
- Actualizar `mem://features/ticket-email-sending`.

Alternativa (si prefieren remitente @chequi.online): verificar también `chequi.online` en Resend con sus registros DNS en Hostinger; no es necesario para enviar.
