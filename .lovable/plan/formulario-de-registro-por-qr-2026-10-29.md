# Formulario de registro por QR

## Qué se construye
1. **Constructor de formulario (solo super admin)**, dentro de la configuración de cada evento:
   - Activar/desactivar el registro.
   - Agregar, quitar, reordenar y renombrar campos: Nombres, Correo, Empresa, Celular, Cédula, y campos personalizados (texto, número, lista de opciones, fecha).
   - Marcar cada campo como obligatorio u opcional.
   - Elegir qué campo evita duplicados (cédula y/o correo).
   - Título y mensaje de bienvenida/confirmación.
2. **QR del formulario**: se genera automáticamente con el enlace `chequi.online/registro/<evento>`; se puede descargar en PNG para imprimir o proyectar, y copiar el enlace.
3. **Página pública del formulario**: con la marca del evento, los campos configurados, la casilla de consentimiento obligatoria y el enlace al aviso de privacidad. Al enviar muestra "Registro recibido". Si la cédula/correo ya existe, muestra "Ya estás registrado".
4. **Lista de registros** en el panel del evento: búsqueda, conteo total, eliminar (solo admin).
5. **Reporte**: nueva hoja "Registros formulario" en el Excel de cierre del evento y un contador en el Resumen. Los usuarios Scanner no ven ni descargan estos datos.

## Detalles técnicos
- Tablas nuevas: `event_registration_forms` (event_id único, is_enabled, title, messages, fields jsonb, dedupe_keys) y `event_form_submissions` (event_id, data jsonb, dedupe_value, consent_version, consent_at, user_agent; índice único event_id+dedupe_value).
- RLS: forms editables solo por `is_super_admin`; lectura de submissions por `user_can_access_event`; borrado por admin del evento. Sin acceso directo anónimo.
- Envío público vía Edge Function `submit-registration` (service role): valida campos contra la configuración con zod, límites de largo, normaliza cédula/correo, rechaza duplicado (409), límite básico por IP. Una función pública de solo lectura entrega la configuración del formulario habilitado.
- Ruta `/registro/:eventId` en `App.tsx`; constructor en el área Admin; QR con la librería `qrcode` ya usada.
- Extender `get_event_summary_report` y la función de Excel de cierre con los registros.
