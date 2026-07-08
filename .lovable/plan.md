
## 1. Módulo "Asistentes" — Escalar a 10k

**Problema:** `AttendeesManager` bloquea la UI mientras `useAttendees` descarga los 8k asistentes + `useCedulasAutorizadas` + `useAllEventConfigs`, y `AttendeeList` además cruza con `useControlUsage`. Cada `QRCodeDisplay` renderiza un `<canvas>` para cada fila → 8000 canvases = colapso.

**Solución — virtualización + paginación server-side + lazy QR:**

- Nuevo hook `useAttendeesPage({ eventId, search, page, pageSize })` que usa `.range()` sobre 50 filas y `count: 'exact'` con `ilike` en `name`, `cedula`, `ticket_id`, `qr_code`. Debounce 300ms en búsqueda.
- Reemplazar `useAttendees` en `AttendeesManager` y `AttendeeList` por el nuevo hook (mantener `useAttendees` sólo para exportación completa, on-demand con toast de progreso).
- Tabla virtualizada con `@tanstack/react-virtual` (fila fija 84px) — sólo se pintan ~15 filas visibles.
- `QRCodeDisplay` en lista sólo se genera cuando la fila entra en viewport (o bajo demanda con botón "Ver QR"). En tabla principal mostrar sólo un badge con los últimos 6 chars del `qr_code` y abrir modal para el QR grande.
- KPIs de cabecera ("Total registros: X/Y") pasan a un RPC ligero `get_event_attendee_counts(event_id)` → devuelve `{ total, with_usage }` sin traer filas.

**Resultado:** carga inicial <500ms independientemente del número de asistentes; búsqueda instantánea; scroll fluido a 8k+.

## 2. Modo Kiosko autónomo — Perfiles remotos + auto-selección

**Concepto:** un super admin define "Perfiles de Kiosko" desde el panel; el operador en el scanner sólo escoge un perfil y activa; opcionalmente el scanner rota el tipo de control por horario.

**Base de datos** (nueva tabla `kiosk_profiles`):
- `event_id`, `name`, `description`
- `control_type_ids uuid[]` — controles habilitados
- `auto_select_mode text` — `'fixed'` | `'time_based'` | `'sequential'`
- `time_schedule jsonb` — ej. `[{"from":"08:00","to":"12:00","control_type_id":"..."}, ...]`
- `default_control_type_id uuid`
- `allow_operator_override boolean` (default true)
- `lock_ui boolean` — oculta selectores y botones ajenos al escaneo
- `auto_resume_ms int` (default 1500) — tiempo antes de re-activar cámara
- `require_pin text` (nullable) — PIN de 4 dígitos para desactivar
- RLS: `SELECT` con `user_can_access_event`; `INSERT/UPDATE/DELETE` con `can_manage_event_team` o `is_super_admin`.

**UI Super Admin — nueva pestaña "Kiosko" en `EventConfig`:**
- CRUD de perfiles con formulario visual (selector de horarios, drag&drop de controles).
- Preview de cómo se verá el scanner con ese perfil.

**Scanner:**
- Nuevo componente `KioskProfileSelector` reemplaza el `KioskToggle` actual cuando existen perfiles para el evento.
- Al activar un perfil: bloquea `EventSelector` y `ControlTypeSelector` (si `lock_ui`), activa wake lock, y arranca el motor de auto-selección:
  - `time_based` → hook `useKioskAutoControl` observa `Date.now()` cada minuto y hace `setSelectedControlType(match)`.
  - `sequential` → rota `control_type_ids` con cada scan.
  - `fixed` → usa `default_control_type_id`.
- Desactivación requiere PIN si `require_pin` está set; sino, mantiene el hold-1.5s actual.
- `useKioskMode` se extiende para persistir el `profileId` activo por `(eventId, deviceId)`.

## 3. Plantillas — Editor de fondo + multi-plantilla por categoría

### 3a. Fondo interactivo en `VisualTicketEditor`
Actualmente el fondo se aplica como `backgroundImage` de Fabric (no seleccionable). Cambios:
- Cargar el fondo como `FabricImage` normal **con `elementType: 'background'`**, en el índice 0 (siempre atrás) y con handles activos.
- Botón toggle "🔒 Bloquear fondo" / "🔓 Editar fondo" para evitar selección accidental.
- Al mover/redimensionar/rotar: persistir `x, y, scaleX, scaleY, angle, opacity` en un nuevo campo `background_transform jsonb` en `ticket_templates`.
- Preservar calidad: renderizar el original en resolución nativa (no `scaleToWidth`); usar `imageSmoothingEnabled=true` y exportar con `multiplier: max(1, targetDPI/96)` en `canvas.toDataURL`.
- Nuevo modo `background_mode: 'full_ticket'` — el canvas adopta las dimensiones exactas de la imagen y el aspect-ratio queda bloqueado; ideal para artes ya diseñados donde encima sólo van QR + textos.

### 3b. Multi-plantilla por categoría con override
- Nueva tabla `ticket_template_category_bindings`: `template_id`, `category_id` (unique juntos), `is_default boolean`.
- En `TicketTemplateEditor` — nueva Card "Categorías asignadas" con multiselect de `ticket_categories` del evento + toggle "default".
- En `ExportTicketsPNG` / `ExportTicketsPrint`:
  - Por defecto, para cada asistente resolver `template = binding_por_category ?? default_del_evento`.
  - Nuevo selector arriba: `[ ] Forzar plantilla → <Select plantillas del evento>` que sobreescribe la resolución por categoría.
  - Progreso por lote (barras separadas por plantilla usada).
- Duplicar plantilla: botón "Duplicar" en el listado para crear rápidamente variantes (invitados/socios) desde una plantilla existente.

## Sección técnica

**Nuevas migraciones (una sola):**
- `kiosk_profiles` con GRANTs y RLS descritos.
- `ticket_template_category_bindings` con GRANTs y RLS descritos.
- `ALTER TABLE ticket_templates ADD COLUMN background_transform jsonb DEFAULT '{}'::jsonb`.
- `ALTER TYPE` no aplica: `background_mode` ya es `text` con check-free — añadir valor `'full_ticket'` sólo si es enum (verificar).
- RPC `get_event_attendee_counts(event_id uuid)` → `(total bigint, with_usage bigint)` con `user_can_access_event`.

**Dependencias nuevas:**
- `@tanstack/react-virtual` (virtualización).

**Archivos nuevos:**
- `src/hooks/useAttendeesPage.ts`, `src/hooks/useAttendeeCounts.ts`
- `src/hooks/useKioskProfiles.ts`, `src/hooks/useKioskAutoControl.ts`
- `src/components/scanner/KioskProfileSelector.tsx`
- `src/components/kiosk/KioskProfilesManager.tsx` (dentro de EventConfig)
- `src/hooks/useTemplateCategoryBindings.ts`

**Archivos modificados:**
- `AttendeesManager.tsx`, `AttendeeList.tsx` → paginación + virtualización + lazy QR.
- `Scanner.tsx` → integra `KioskProfileSelector` cuando hay perfiles.
- `EventConfig.tsx` → nueva pestaña "Kiosko".
- `TicketTemplateEditor.tsx` + `VisualTicketEditor.tsx` → fondo editable, modo `full_ticket`, bindings.
- `ExportTicketsPNG.tsx`, `ExportTicketsPrint.tsx` → resolución de plantilla por categoría + override.
- `useKioskMode.ts` → agregar `activeProfileId`.

**No disruptivo:** las plantillas y kiosko existentes siguen funcionando; los nuevos campos tienen defaults compatibles.

## Orden de implementación

1. Migración DB (kiosk_profiles + bindings + background_transform + RPC counts).
2. Asistentes: paginación + virtualización + lazy QR (impacto inmediato para las 8k QR que vas a generar).
3. Plantillas: fondo editable + modo full_ticket + duplicar plantilla + bindings por categoría + override al exportar.
4. Kiosko: manager en super admin + selector en scanner + motor de auto-selección.
