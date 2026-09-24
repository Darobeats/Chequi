# Auditoría técnica de Chequi — estado actual (solo lectura)

Fecha: 24/09/2026. No se modificó código. Las restricciones de base de datos se verificaron contra la base en vivo. Este documento es un informe, no un plan de cambios: aprobarlo no ejecuta nada.

## Resumen

| Área | Estado |
|---|---|
| 1. Modo offline — cédula | ✅ Implementado |
| 1. Modo offline — QR | 🟡 Parcial (no hay protección contra duplicados entre dispositivos) |
| 2. Modo kiosko | 🟡 Solo validación |
| 3. Autorregistro | 🔴 No implementado |
| 4. Código visible de 8 dígitos | 🔴 No existe (se puede agregar) |
| 5. Multi-día / sesiones | 🟡 Solo hay fechas del evento; no existen jornadas ni sesiones |
| 6. Envío de QR (email/WhatsApp/SMS) | 🔴 No implementado |

---

## 1. Modo offline

**Cómo se habilita / instala**
- PWA con `vite-plugin-pwa` (`vite.config.ts`), `public/manifest.webmanifest` (`start_url: /scanner`, standalone), página `/install` (`src/pages/Install.tsx`).
- `src/lib/swRegistration.ts`: el service worker solo se registra en producción; queda desactivado en la vista previa, iframes y localhost. Se actualiza solo (autoUpdate) y busca versiones nuevas cada 60 s.
- Caché: navegación NetworkFirst (3 s), archivos estáticos StaleWhileRevalidate, imágenes y fuentes CacheFirst. Supabase, `/functions/v1` y `/auth` quedan excluidos.
- La precarga es manual: botón "Preparar evento offline" (`OfflinePrecharge.tsx` → `useOfflinePrecharge.ts`).

**Qué se precarga** (IndexedDB `chequi_offline` v1, `src/lib/offlineDB.ts`)
- `whitelist` (cédulas autorizadas), `attendees` (id, ticket_id, qr_code, name, category_id, status), `controlTypes`, `categoryControls` (max_uses), `eventConfig`, `meta` (conteos y hora de la última sincronización). La escritura se hace en lotes de 2.000.

**Operaciones sin conexión**
- Validación de cédula contra la lista autorizada en caché (`useOfflineAuthorization.ts`).
- Límite de usos: `useOfflineControlLimit.ts` usa un **máximo fijo de 1 sin conexión** (línea 65). Los límites por categoría descargados **no se aplican offline**.
- Registro manual de cédula (`CedulaManualRegistro` → `useOfflineCedulaScans.enqueue`).
- Escaneo QR contra `attendees` en caché y contadores locales (`localAttendeeUsage`).
- Respaldo de emergencia: exportación a Excel de la cola pendiente (`offlineBackupExport.ts`, `OfflineQueueDialog.tsx`).

**Almacenamiento temporal**
- Cédula: IndexedDB `pendingCedulaScans` y `localCedulaUsage`.
- QR: el hook `useOfflineScans.ts` guarda su cola en **localStorage**, aunque también existe un almacén `pendingQRScans` en IndexedDB. Conviven dos mecanismos.

**Sincronización**
- Cédula: se dispara sola al volver la conexión, en lotes de 50 hacia la Edge Function `process-cedula-scan`. También hay botón manual (`OfflineSyncStatus.tsx`).
- QR: se envía uno por uno a `process-qr-scan`.

**Identificación de operaciones offline**
- Cada elemento guarda uuid, eventId, cédula o ticket, controlTypeId, usuario, timestamp, retryCount, status y una firma HMAC-SHA256 (`src/lib/scanSignature.ts`) sobre `clave|control|timestamp|usuario`, con clave diaria por usuario.
- No hay un ID de dispositivo estable (la cola QR solo guarda una etiqueta `device`).
- La clave HMAC se deriva en el cliente, así que sirve como control de integridad, no como prueba criptográfica fuerte.

**Reintentos, errores y conflictos**
- Máximo 5 reintentos en ambas colas. Después, **el registro se descarta** (con aviso en la cola QR). No hay cola de revisión manual, aparte del Excel de respaldo.
- Cédula: si el servidor devuelve un conflicto (código 23505), el elemento queda como `duplicate_skipped` y no cuenta como error.

**Protección contra duplicados con varios dispositivos offline**
- Cédula: ✅ la restricción en vivo `UNIQUE (event_id, numero_cedula, control_type_id)` en `cedula_control_usage` evita duplicados **al sincronizar**. Mientras están sin conexión, cada dispositivo solo ve sus propios usos, así que dos dispositivos pueden dar acceso a la misma persona en la puerta. El duplicado se descarta después, en el servidor.
  - Consecuencia: esta restricción impide cualquier uso mayor a 1 por cédula y control, aunque `max_uses` sea mayor.
- QR: 🔴 `control_usage` **no tiene restricción única** (verificado en vivo: solo tiene la clave primaria). `process-qr-scan` consulta el RPC `validate_control_access_public` y luego inserta, sin bloqueo. Una sincronización tardía o dos dispositivos pueden registrar **usos duplicados**.

---

## 2. Modo kiosko — 🟡

- Archivos: `useKioskMode.ts` (activación guardada en localStorage, Wake Lock, contador de sesión), `useKioskAutoControl.ts` (elige el control solo: modos `fixed` y `time_based` cada 30 s), `useKioskProfiles.ts`, `KioskProfilesManager.tsx`, `KioskProfileSelector.tsx`, `KioskToggle.tsx`.
- Tabla `kiosk_profiles`: control_type_ids, default_control_type_id, auto_select_mode, time_schedule, lock_ui, auto_resume_ms, pin_hash/has_pin. RPCs `verify_kiosk_pin` y `set_kiosk_pin` (bcrypt, SECURITY DEFINER).
- Solo valida QR y cédula. **No tiene autorregistro, no captura datos nuevos y no genera códigos ni QR.**
- El modo `sequential` está permitido en la base de datos pero **no está implementado** en el hook.
- Funciona offline igual que el escáner, siempre que el evento se haya precargado antes. No tiene sincronización propia: usa las colas descritas en el punto 1.

## 3. Autorregistro — 🔴

- Rutas actuales (`src/App.tsx`): `/`, `/auth`, `/dashboard`, `/install`, `/legal`, `/legal/:slug`, además del escáner y el panel de administración protegidos. No existe ninguna ruta pública de registro.
- Piezas reutilizables:
  - `AttendeeForm.tsx` (formulario del personal, genera ticket_id en el cliente)
  - `CedulaManualRegistro.tsx`
  - `ConsentCheckbox` / `buildConsentRecord` y `PrivacyNotice` (consentimiento versionado, hora de Bogotá)
  - `useTicketCategories`, `QRCodeDisplay`, `renderTicket.ts` (generar el ticket PNG)
- Qué falta:
  - una ruta pública
  - una vía de escritura anónima segura (Edge Function pública con validación y límite de peticiones, o política RLS para anon)
  - selección de evento y categoría
  - guardar el consentimiento (hoy no hay columna para ello)
  - protección contra abuso (captcha o límite de peticiones)
  - entregar el QR al asistente
- Las dos Edge Functions de escaneo exigen JWT y rol (admin, control o scanner).

## 4. Códigos — 🔴 (factible)

- `qr_code`: trigger `auto_generate_qr_code` → `generate_qr_code(category_id)`. Formato `EVT-<CAT>-<4 hex>-<año>`, con verificación de que no se repita. Es **único a nivel global**.
- `ticket_id`: lo genera el cliente (`AttendeeForm.tsx:98`, `generateTicketId()`) o viene de la importación / generador masivo (`BulkQRGenerator.tsx`). En vivo hay **dos** restricciones: `UNIQUE (ticket_id)` global y `UNIQUE (event_id, ticket_id)`. La global impide repetir un ticket_id entre eventos distintos.
- No existe una columna de código numérico corto.
- Viabilidad: se puede agregar un código visible de 8 dígitos como columna nueva, sin tocar `qr_code` ni `ticket_id`, siguiendo el mismo patrón de trigger con reintento y una restricción única por evento. El QR y el token interno quedarían intactos.

## 5. Multi-día / sesiones — 🟡

- `event_configs` tiene `event_date`, `event_start_date` y `event_end_date`, que se usan en el Resumen (RPC `get_event_summary_report`, hora de Bogotá).
- **No existen** tablas de jornadas, sesiones, estaciones ni puntos. Lo más parecido a una estación son `control_types` y `kiosk_profiles`.
- `control_usage` y `cedula_control_usage` no tienen dimensión de día ni de sesión. `category_controls.max_uses` cuenta durante toda la vida del evento, sin reinicio diario.
- QR: técnicamente permite varias asistencias por participante (no hay restricción única).
- Cédula: la restricción única limita a **1 uso por control** en todo el evento. Varias asistencias solo son posibles creando un control distinto por día (por ejemplo "Ingreso Día 1" e "Ingreso Día 2").
- La memoria del proyecto registra "solo eventos de un día" como restricción de diseño.

## 6. Envío de QR — 🔴

- No hay integración con Resend, SendGrid, Twilio, WhatsApp Business API ni SMS.
- WhatsApp solo aparece como enlace `wa.me` de contacto comercial (`src/lib/contact.ts`, `FloatingWhatsApp.tsx`). `mailto:` solo aparece en las páginas legales.
- Edge Functions existentes: create-user, delete-user, update-user-role, export-attendees-report, export-event-summary, monitor-event-activity, process-qr-scan, process-cedula-scan, scan-cedula-ai. Ninguna envía mensajes.
- Mecanismos compatibles con la arquitectura actual:
  - Email: correo integrado de Lovable Cloud o proveedor externo.
  - WhatsApp / SMS: proveedor externo desde una Edge Function nueva con clave guardada como secreto.
  - Imagen del ticket: el PNG del QR se puede reutilizar desde `renderTicket.ts` o generar en el servidor.

---

## Riesgos principales

1. QR: posibles usos duplicados al sincronizar desde varios dispositivos (no hay restricción única ni inserción atómica).
2. Sin conexión, los límites por categoría se ignoran (máximo fijo de 1). Con conexión, la restricción única de cédula anula `max_uses` mayor a 1.
3. Cada dispositivo offline solo ve sus propios usos: puede haber doble acceso en la puerta antes de sincronizar.
4. Después de 5 reintentos los registros se descartan; solo queda el respaldo en Excel.
5. Dos colas QR (localStorage e IndexedDB) y ninguna identificación estable del dispositivo.
6. `ticket_id` único global: puede chocar al reutilizar numeraciones entre eventos.
7. No hay dimensión de jornada ni sesión para un evento internacional de varios días.
8. La precarga es manual y el service worker no funciona en la vista previa; hay que probar el modo offline en el sitio publicado.
