## 1. Bug crítico: se descargan 150 de 250

**Causa raíz** (`src/components/TicketExportCenter.tsx`, `resolveTemplate` línea 78–82):

```ts
const b = bindings.find((b) => b.category_id === categoryId);
if (b) return eventTemplates.find((t) => t.id === b.template_id); // ← puede ser undefined
return defaultTemplate;
```

Si la categoría "Cortesia Bomberos" tiene un binding hacia una plantilla que **no está en `eventTemplates`** (por no tener `use_visual_editor=true` o `elements.length>0`, o por estar archivada), la función devuelve `undefined` en vez de caer al `defaultTemplate`. Esas ~100 filas entran en `filtered` (por eso el botón dice 250), pero en el loop `runBulkExport` caen en `if (!tpl) { skipped.push(a.name); continue; }` y no se añaden al ZIP. El aviso queda oculto dentro del toast final.

**Fix (mínimo y quirúrgico):**

1. `resolveTemplate` cae a `defaultTemplate` cuando el binding apunta a una plantilla inválida:
   ```ts
   const b = bindings.find((b) => b.category_id === categoryId);
   const bound = b ? eventTemplates.find((t) => t.id === b.template_id) : undefined;
   return bound ?? defaultTemplate;
   ```
2. Contadores del botón usan `withTpl` real:
   - "Descargar filtrados (X)" muestra `filtered.filter(r=>r.template).length`.
   - Si hay filas sin plantilla, mostrar chip amarillo "N sin plantilla" al lado.
3. Antes de exportar, si `skippedPreview > 0`, mostrar `AlertDialog` de confirmación listando las categorías afectadas (para que el usuario sepa qué faltará y pueda asignar binding antes).
4. `lastReport.skipped` se muestra siempre al terminar (hoy solo aparece en toast).

Con esto, "Cortesia Bomberos" bajará los 250 completos (usando la plantilla por defecto si el binding roto no se corrige, y avisando).

## 2. Endurecimiento de permisos EXECUTE en funciones SQL

Migración que:
- Revoca `EXECUTE ... FROM anon, PUBLIC` en funciones internas que no deben ser llamadas desde la app pública:
  `get_asistentes_security_report`, `handle_new_user`, `set_ticket_template_version_number`, `auto_generate_qr_code`, `generate_qr_code`, `update_updated_at_column`, `validar_ticket`, `auth_uid`, `auth_role`, `get_user_role`, `get_user_role_secure`, `user_has_role_secure`, `get_current_user_role`, `has_role`, `is_authenticated`, `can_modify_data`.
- Deja `EXECUTE` a `authenticated` (o `anon` solo cuando corresponde) en las funciones usadas por el frontend/scanner público:
  `find_attendee_by_ticket_public`, `validate_control_access_public`, `get_active_event_config` (anon+authenticated), `find_attendee_by_ticket`, `validate_control_access`, `check_cedula_control_limit`, `get_event_analytics_summary`, `get_event_recent_activity`, `get_event_attendee_counts`, `get_user_events`, `user_can_access_event`, `can_access_scanner`, `can_access_dashboard`, `can_manage_event_team`, `get_user_role_in_event`, `is_super_admin`, `get_active_event_id` (authenticated).
- Correr `supabase--linter` después y reportar warnings pendientes al usuario (no auto-cerrar RLS que rompa la app).

**No se tocan** políticas RLS ni columnas — solo `REVOKE`/`GRANT EXECUTE`. Idempotente.

## 3. Precarga offline por lotes (evitar bloqueo con 9.500)

`src/hooks/useOfflinePrecharge.ts` + `src/lib/offlineDB.ts`:

- **Lotes de escritura en IndexedDB**: `putAttendees` y `putWhitelistEntries` reciben el array completo y hoy hacen una sola transacción. Trocearlas en chunks de **2.000 registros** con `await` entre chunks para no bloquear el hilo principal en móviles gama media.
- **Progreso real**: el hook reporta `{step, current, total}` mientras escribe (hoy solo salta al 100% al final). En `OfflinePrecharge.tsx` la barra ya está lista, solo hay que alimentarla con:
  ```
  step: "Guardando asistentes 4000/9500"
  ```
- **Paginación de red**: mantener `PAGE_SIZE=1000` (óptimo para PostgREST) y añadir progreso "Descargando página N de M" usando `count: 'exact'` en la primera llamada para estimar total.
- No cambia la forma de los datos ni el esquema de IndexedDB; solo cómo se escriben.

## Detalles técnicos

- Ningún cambio en `renderTicket`, editor visual, ni schema de tablas.
- Migración de permisos EXECUTE es **reversible** (solo GRANT/REVOKE, sin DROP).
- Se validará build limpio y se corre `supabase--linter` tras la migración.

## Fuera de alcance

- Rediseño del centro de exportación.
- Cambios en RLS de tablas.
- Nueva UI para offline (solo mejor progreso en la existente).
