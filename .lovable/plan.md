## Objetivos

Tres mejoras independientes:

### 1. Vista previa por ticket (Centro de Exportación)

En `TicketExportCenter.tsx`:

- Añadir botón "👁 Ver" por fila (junto a "PNG"). Al click abre un `Dialog` con:
  - Preview del PNG renderizado en vivo (usando `renderTicket()` → `URL.createObjectURL(blob)`).
  - Nombre de archivo resuelto según `nameFormat` actual (editable inline en el diálogo — sólo afecta esta descarga).
  - Metadatos: categoría, plantilla usada, dimensiones, ticket_id, cédula.
  - Botones: "Descargar este ticket" y "Cerrar".
- Cache local (Map por `attendee.id + template.id + nameFormat`) para no re-renderizar si vuelve a abrir el mismo preview.
- Loader mientras renderiza. Liberar `URL.createObjectURL` al cerrar/desmontar.

### 2. Selección automática por filtros combinados

En la barra de acciones del Centro de Exportación:

- Nuevo bloque "Auto-selección" con toggle **"Sincronizar selección con filtros"**.
- Cuando está ON: cada cambio en búsqueda/categorías/plantillas/estado actualiza `selectedIds` = ids filtrados que tengan plantilla. Los checkboxes manuales quedan deshabilitados (badge "auto").
- Cuando está OFF (default): comportamiento actual manual.
- Además, un botón separado "Aplicar filtros a selección" (one-shot) para quienes no quieran el modo automático.
- Contador ya existente muestra "auto: N seleccionados por filtros".

### 3. Módulo "Asignar" — selección masiva con filtros

Reemplazar la UI actual de `BulkTicketAssignment.tsx` por una versión con:

**Filtros combinados (arriba):**
- Buscador por nombre / cédula / ticket_id.
- Multi-select de **Categoría actual** (checkboxes con conteo, incluye opción "Sin categoría").
- Filtro de **Estado** (`valid` / `used` / `blocked` / todos).
- Filtro rápido: "Solo sin categoría" (mantiene el existente como shortcut).
- Botón "Limpiar filtros".

**Acciones de selección:**
- Checkbox master en header aplica sólo a filas visibles.
- Botones: "Seleccionar visibles" · "Deseleccionar todos" · "Invertir selección".
- Contador "X de Y visibles · Z seleccionados".

**Tabla:**
- Igual estructura actual (Nombre / Cédula / Categoría actual / Ticket ID) + checkbox por fila.
- Scroll vertical con `max-h-[500px]` y header sticky.
- Si >1000 filas visibles, mostrar aviso "Mostrando primeros 1000 — refina filtros" (asignación masiva sigue procesando toda la selección real, no sólo lo pintado).

**Barra inferior sticky (acción):**
- Select "Nueva categoría de destino" (obligatorio).
- Botón "Asignar a N asistentes" con progreso (%) durante el `for` loop.
- Reporte final: OK vs. errores.
- Al terminar exitosamente: `queryClient.invalidateQueries(['attendees'])` (ya lo hace el hook).

**Optimización:**
- El `for` loop actual actualiza uno a uno; mantener eso pero mostrar progreso (`setProgress(((i+1)/N)*100)`).

## Archivos a modificar

- `src/components/TicketExportCenter.tsx` — añadir diálogo preview + toggle auto-selección.
- `src/components/BulkTicketAssignment.tsx` — reescritura con filtros combinados, búsqueda, selección avanzada y barra de progreso.

## Fuera de alcance

- No se cambia el renderer, ni bindings, ni la lógica DB, ni RLS.
- No se tocan hooks existentes.
