# Envío masivo de boletas QR por correo desde Chequi

## Objetivo
Desde el panel del evento, enviar a cada asistente un correo con su boleta (la misma imagen del Centro de Exportación) y su código QR, con seguimiento de quién la recibió y reenvío individual.

## Qué verá el administrador
1. **Nueva pestaña "Envíos"** en el evento (Admin y super admin; Scanner y Control no la ven).
2. **Selección de destinatarios** con los mismos filtros del Centro de Exportación (categoría, plantilla, estado, búsqueda) y selección masiva. Se omiten los asistentes sin correo o con correo inválido, y se muestra cuántos son.
3. **Plantilla del correo editable**: asunto, saludo y mensaje, con variables `{nombre}`, `{evento}`, `{fecha}`, `{categoria}`. Vista previa antes de enviar y botón "Enviarme una prueba".
4. **Enviar**: una confirmación con el total ("Vas a enviar 300 boletas"). El envío sigue en segundo plano aunque se cierre la pantalla.
5. **Panel de seguimiento** en vivo: En cola / Enviado / Rebotado / Fallido por asistente, con "Reintentar fallidos" y "Reenviar" individual. Evita enviar dos veces la misma boleta salvo reenvío explícito.
6. **Excel del evento**: hoja nueva "ENVÍOS" con estado y hora (Bogotá) por asistente.

## Qué recibe el asistente
Correo desde `boletas@notify.chequi.online` (subdominio de envío de chequi.online) con el logo del evento, sus datos, la boleta como imagen y un botón "Ver mi boleta" que abre una página pública con la boleta lista para mostrar en la entrada. Pie con aviso de privacidad y enlace a `/legal/aviso`.

## Pasos de puesta en marcha
1. Configurar el dominio de envío de chequi.online (registros DNS; la verificación puede tardar hasta unas horas). Se hace primero para que esté listo antes del evento.
2. Construir el módulo y probarlo con 3–5 correos internos (Gmail, Outlook, corporativo) revisando que el QR se lea desde la pantalla del celular.
3. Envío real a los 300 asistentes con varios días de anticipación, y luego "Reintentar fallidos".

## Detalles técnicos
- **Proveedor**: Lovable Emails con dominio `chequi.online` (cola con reintentos, control de ritmo, supresión de rebotes y bajas). Si el backend externo del proyecto no lo admite, alternativa: conector Resend con el mismo dominio verificado. Se confirma en el primer paso.
- **Boleta**: el navegador del admin ya renderiza la boleta con `renderTicket.ts` (Fabric). Para garantizar que el correo sea idéntico a la impresión, al enviar se renderizan los PNG en el navegador por lotes de 50 y se suben al bucket `event-assets` en `<event_id>/tickets/<attendee_id>.png`. El correo muestra la imagen por URL firmada de larga duración (no adjunto) → correos livianos y mejor entrega; el enlace "Ver mi boleta" usa un token aleatorio por asistente.
- **Tablas nuevas**: `email_campaigns` (event_id, asunto, cuerpo, estado, totales, created_by) y `email_campaign_recipients` (campaign_id, attendee_id, email, estado, message_id, error, sent_at, view_token; único campaign_id+attendee_id). RLS con `user_can_access_event`; escritura solo admins del evento.
- **Edge Function `send-ticket-campaign`**: valida sesión y rol, encola destinatarios en lotes, respeta límites del proveedor; actualiza estados con webhooks/log de envíos. Página pública `/boleta/:token` vía Edge Function con service role (sin acceso anónimo a tablas), igual que el formulario de registro.
- **Correo de asistentes**: validación de formato y deduplicación por correo dentro de la campaña.
- Excel: `export-event-summary` agrega hoja "ENVÍOS".
- Prueba automatizada de reglas: no reenvío duplicado, omisión de correos inválidos, solo admins pueden crear campañas.

## Fuera de alcance por ahora
WhatsApp/SMS, campañas de marketing y programación de envío a una hora específica (se puede añadir después).
