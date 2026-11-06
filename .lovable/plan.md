# Envíos: selección masiva y control total del seguimiento

## 1. Destinatarios — selección masiva clara
- Casilla en el encabezado de la tabla: marca/desmarca todos los filtrados con correo válido (estado intermedio si hay selección parcial).
- Barra de selección: "Seleccionar todos (N)", "Invertir selección", "Quitar selección", y contador visible "X seleccionados de Y".
- Filtro de envío por defecto pasa a "Todos" con aviso, para que nunca aparezca la tabla vacía sin explicación; los ya enviados se siguen omitiendo salvo que se elija "reenviar".
- Atajo "Seleccionar categoría completa" desde el filtro de categoría.

## 2. Seguimiento — gestión completa de cada envío
Por cada envío (campaña):
- **Detener envío** mientras se está enviando: se cancela tras el lote actual; los que faltan quedan "Cancelados".
- **Cancelar pendientes**: marca como cancelados los que están en cola o fallidos (no se envían más).
- **Reintentar pendientes** (se mantiene).
- **Editar asunto/mensaje** de un envío no terminado (carga el texto en la sección 1 para reanudar con cambios).
- **Eliminar envío**: borra la campaña y su historial con doble confirmación (advierte que los asistentes ya enviados volverán a aparecer como "Sin enviar").
Por cada destinatario:
- Reenviar (se mantiene), **Quitar de la cola** y **Eliminar del historial**.
- Casillas en la lista para acciones masivas: reenviar, cancelar o eliminar seleccionados.
- Filtro rápido por estado (enviados / fallidos / en cola / cancelados).

## Detalles técnicos
- Todo en `src/components/email/TicketEmailCampaigns.tsx`; nuevo estado `cancelled` en badges y en la lógica de `pickRecipients` (cancelado = no enviado).
- Detener: ref `abortRef` revisada entre lotes en `runSend`; campaña queda `status='cancelled'`.
- Eliminar: borrar `email_campaign_recipients` por `campaign_id` y luego `email_campaigns` (las políticas DELETE/UPDATE ya existen). Sin migración, salvo que `status` tenga un CHECK que no permita `cancelled` — se verificará y, si existe, se amplía.
- Invalidar consultas de historial y campañas tras cada acción.
