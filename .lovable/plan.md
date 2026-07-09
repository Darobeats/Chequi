## Objetivo

Reemplazar el botón único "Exportar N tickets por categoría" por un **Centro de Exportación de Tickets** con filtros, búsqueda, selección y descargas individuales o masivas.

## Nuevo componente: `src/components/TicketExportCenter.tsx`

Sustituye a `ExportTicketsByCategory` en `EventConfig.tsx`. Reutiliza la función `renderTicket()` (extraída a `src/lib/renderTicket.ts` para compartirla).

### UI (Dialog "Exportar Tickets")

Se abre desde un botón "Exportar Tickets" en la misma tarjeta donde vive hoy el export. Dentro del diálogo:

**Barra de filtros (arriba):**
- Buscador por nombre / cédula / ticket_id.
- Multi-select de **Categorías** (checkboxes con conteo por categoría).
- Multi-select de **Plantilla asignada** (útil cuando varias categorías comparten plantilla o para detectar categorías sin plantilla).
- Filtro de **Estado** (`valid` / `used` / `blocked`).
- Botones: "Limpiar filtros", "Seleccionar todos los filtrados", "Deseleccionar todo".

**Tabla de asistentes (centro, virtualizada si >500):**
Columnas: checkbox · Nombre · Cédula · Ticket ID · Categoría (chip color) · Plantilla resuelta · Acción (botón "Descargar PNG" individual).

- Checkbox por fila + checkbox master en el header (aplica sólo a filas visibles/filtradas).
- Filas sin plantilla resuelta se marcan con badge rojo "Sin plantilla" y quedan deshabilitadas para descarga.

**Barra de acciones (abajo, sticky):**
- Contador: "X de Y seleccionados · Z categorías · N plantillas".
- Selector de **estructura del ZIP**: `Por categoría` (default, subcarpetas) · `Por plantilla` · `Plano` (todo en la raíz).
- Selector de **formato de nombre**: `{cedula}_{nombre}` · `{ticket_id}_{nombre}` · `{nombre}` · `{ticket_id}`.
- Botón primario: **"Descargar seleccionados (ZIP)"** con progreso y % en vivo.
- Botón secundario: **"Descargar filtrados"** (ignora selección, usa lo que muestra la tabla).

### Descarga individual
Click en "Descargar PNG" de una fila → genera un solo PNG con `renderTicket()` y dispara `saveAs()` (sin ZIP). Muestra loader inline en el botón.

### Descarga masiva
- Usa la lógica actual de `ExportTicketsByCategory.handleExport` (JSZip + `renderTicket` + progreso).
- Cambia el armado de rutas según la estructura elegida.
- Reporte final: total generados, omitidos por falta de plantilla, y errores de render (con listado colapsable).

## Refactor menor

- Extraer `renderTicket`, `loadImage`, `sanitize`, `getFieldValue` de `ExportTicketsByCategory.tsx` a `src/lib/renderTicket.ts` para reutilizarlos en el nuevo componente sin duplicar código.
- `ExportTicketsByCategory.tsx` puede eliminarse (o dejarse como wrapper deprecado) tras montar el nuevo Centro.

## Archivos a modificar / crear

- **Crear** `src/lib/renderTicket.ts` (extracción pura del renderer actual).
- **Crear** `src/components/TicketExportCenter.tsx` (nuevo diálogo con filtros, tabla, selección y export).
- **Editar** `src/components/EventConfig.tsx` para reemplazar `<ExportTicketsByCategory />` por `<TicketExportCenter />`.
- **Eliminar** `src/components/ExportTicketsByCategory.tsx` una vez migrado.

## Fuera de alcance

- No se cambia el editor visual, ni las plantillas, ni los bindings, ni el pipeline de render.
- No se toca DB ni RLS.
