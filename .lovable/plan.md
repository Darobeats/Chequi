## Objetivo

Eliminar los inputs manuales de Ancho/Alto del editor visual. Las dimensiones del ticket (canvas) se definirán automáticamente por la imagen de fondo subida.

## Cambios

### 1. `src/components/VisualTicketEditor.tsx`
- Quitar los `Input` de "Ancho (px)" y "Alto (px)" del toolbar (líneas ~619-630).
- Mostrar en su lugar una etiqueta informativa de solo lectura: `Ticket: {canvasWidth} × {canvasHeight} px (definido por la imagen)`.
- En el `useEffect` que carga la imagen de fondo: al resolver `FabricImage.fromURL`, llamar a `onCanvasSizeChange(iw, ih)` con las dimensiones naturales de la imagen antes de posicionarla. La imagen se colocará en `left: 0, top: 0, scaleX: 1, scaleY: 1` cubriendo el canvas 1:1 (sin recorte, sin zoom), preservando calidad nativa.
- Si no hay imagen de fondo, mantener las dimensiones actuales (o un default 800×600) hasta que se cargue una.

### 2. `src/components/TicketTemplateEditor.tsx`
- Mantener `canvas_width` / `canvas_height` en `formData` (necesarios para persistencia, export PDF/PNG, preview y versiones), pero ya no editables por el usuario.
- Al subir una nueva imagen desde `TicketBackgroundUploader`, no reiniciar transform (ya se hace) y dejar que `VisualTicketEditor` reporte las nuevas dimensiones vía `onCanvasSizeChange`.

### 3. Sin cambios funcionales en:
- `TemplateDevicePreview.tsx` (sigue leyendo `canvasWidth/Height`).
- Export PNG/PDF (usa dimensiones actuales del canvas).
- Versiones, bindings, cropping, snap-to-grid, undo/redo.

## Comportamiento resultante

- Sin imagen: canvas por defecto (800×600), editor funcional pero mostrando aviso "Sube una imagen para definir el tamaño del ticket".
- Al subir imagen: el canvas se redimensiona exactamente a las dimensiones naturales de la imagen, ésta se coloca ocupando 100% del canvas, y los elementos (QR, texto) se superponen sobre ella.
- Si se recorta la imagen con `BackgroundCropDialog`, la imagen resultante define el nuevo tamaño del canvas al recargarse.

## Archivos a modificar
- `src/components/VisualTicketEditor.tsx`
- `src/components/TicketTemplateEditor.tsx` (mínimo: solo asegurar que el flujo de subida no fije tamaño manual)
