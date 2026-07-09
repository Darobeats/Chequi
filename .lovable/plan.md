# Editor de Plantillas: versiones, exportación, previews, controles avanzados + fix de fondo

Cinco mejoras al editor visual de tickets, más un fix crítico de estabilidad del fondo. Se agrupa así para minimizar cambios cruzados.

## 0. FIX: la imagen de fondo desaparece al moverla (bloqueante)

**Síntoma reportado**: al subir el fondo se puede arrastrar, pero al soltar/mover la imagen desaparece del canvas y ya no se puede seguir editando.

**Causa probable en `VisualTicketEditor.tsx`**: el `useEffect` de carga del fondo tiene como dependencias `backgroundImageUrl`, `backgroundOpacity`, `backgroundMode`, `bgEditable`. Cuando el usuario mueve la imagen, `object:modified` llama a `onBackgroundTransformChange`, que hace `setFormData({..., background_opacity})` implícitamente (porque el objeto guarda `opacity` en el transform) y el padre re-renderiza pasando un `backgroundOpacity` recalculado. Ese cambio dispara de nuevo el `useEffect`, que primero llama `remove(bg)` y luego intenta reinstanciar `FabricImage.fromURL(...)` de forma asíncrona — durante esa ventana el objeto queda desmontado. Además, si el `background_transform` recién guardado tiene `left/top` fuera del área visible del canvas, la imagen se reinstancia fuera de vista.

**Fix**:
1. Sacar `backgroundOpacity` de las dependencias del effect y actualizarla en un effect separado que solo hace `bg.set('opacity', ...)` + `renderAll()` sin recrear el objeto.
2. Añadir un `useRef<boolean>` `isUserEditingBgRef` que se pone a `true` en `object:moving/scaling/rotating` del fondo y a `false` en `mouse:up`, y hacer que el effect de carga haga `return` temprano si ese ref está activo.
3. En `onBackgroundTransformChange`, NO mandar `opacity` de vuelta al padre (solo x/y/scale/angle) para romper el ciclo.
4. Clampeo defensivo: al reinstanciar, si `left`/`top` caen fuera de `[-canvasWidth, canvasWidth*2]`, resetear a 0.

Este fix va primero porque desbloquea todo lo demás (snap, guías, undo/redo también dependen de que el objeto siga vivo).

## 1. Versiones de plantilla + exportación PNG/PDF

**Backend**
- Nueva tabla `ticket_template_versions` (migración): `id`, `template_id` (FK a `ticket_templates`), `version_number`, `snapshot` (jsonb con todo el estado: elements, canvas_*, background_*, show_*, qr_size, fuentes, márgenes), `label`, `created_by`, `created_at`.
- GRANTs + RLS igual que `ticket_templates`. Guardado explícito (botón "Guardar versión").

**Frontend**
- `useTicketTemplateVersions(templateId)` con `list`, `create(label)`, `restore(versionId)`.
- `TemplateVersionsPanel` dentro de `TicketTemplateEditor` (cuando `template` existe): lista con fecha/label + "Restaurar" + "Descargar PNG/PDF".
- Exportación cliente:
  - PNG: `fabricCanvas.toDataURL({ format:'png', multiplier: 2 })`.
  - PDF: `jspdf` (nueva dep), una página con el PNG a tamaño real.
  - Botones "📥 PNG" y "📄 PDF" en toolbar del `VisualTicketEditor`, sin requerir versión guardada.

## 2. Panel de vista previa por dispositivo

- `TemplateDevicePreview` como Card colapsable al final del editor.
- Tabs: **Móvil** (375x812), **Tablet** (768x1024), **Impresión** (A4 con la grilla `layout`).
- Renderiza el canvas Fabric en un nodo oculto, exporta PNG y lo pinta escalado dentro del marco simulado (debounced 400ms).
- Aviso si el QR queda < 150 px en el marco simulado.

## 3. Recorte de fondo con preview

- `BackgroundCropDialog` accesible desde nuevo botón "✂️ Recortar" en `VisualTicketEditor`.
- `react-easy-crop` (nueva dep) sobre la URL ORIGINAL del bucket (no el thumbnail del canvas).
- Al aceptar: canvas del recorte a resolución nativa → sube como `<templateId>-crop-<timestamp>.png` a `ticket-backgrounds` → reemplaza `background_image_url` y resetea `background_transform`.

## 4. Guías de alineación + snap-to-grid

- En `VisualTicketEditor`, escuchar `object:moving/scaling/rotating`:
  - **Snap**: si toggle "🧲 Snap" activo, redondear left/top al múltiplo de 10 px y ángulo al múltiplo de 15°.
  - **Guías**: comparar con centros/bordes de otros objetos y del canvas; si diff < 5 px, pegar y dibujar `Line` magenta temporal (limpiada en `mouse:up`).
- Se aplica también al fondo (respetando el fix #0).

## 5. Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)

- Stack en `useRef<HistoryEntry[]>` + cursor.
- Cada entrada = `fabricCanvas.toJSON(['elementId','elementType'])` + `background_transform`.
- Push tras cada `object:modified` (debounce 200ms).
- Botones "↶ Deshacer" y "↷ Rehacer" en toolbar + atajos globales `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` (ignora si foco en input/textarea).
- Historial se resetea al cambiar de plantilla o al restaurar versión.

## Detalles técnicos

- Dependencias nuevas: `jspdf`, `react-easy-crop`.
- Sin cambios en edge functions ni en `ExportTicketsByCategory` / `ExportTicketsPNG`.
- Archivos afectados:
  - Migración: `ticket_template_versions`.
  - Modificados: `src/components/VisualTicketEditor.tsx` (fix fondo, toolbar, historial, snap/guías, export, recorte), `src/components/TicketTemplateEditor.tsx` (integración panels).
  - Nuevos: `src/hooks/useTicketTemplateVersions.ts`, `src/components/TemplateVersionsPanel.tsx`, `src/components/TemplateDevicePreview.tsx`, `src/components/BackgroundCropDialog.tsx`.

## Fuera de alcance
- Undo/redo persistente en servidor (solo versiones lo son).
- Colaboración en tiempo real.
- PDF multi-página.
