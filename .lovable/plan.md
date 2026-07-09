
## Problema 1 — El PNG descargado no coincide con "Editar Plantilla"

Tras revisar `VisualTicketEditor.tsx`, `renderTicket.ts`, `TicketTemplateEditor.tsx` y `TicketExportCenter.tsx`, las causas más probables del desajuste son:

1. **`updateSelectedElement` desincroniza el texto**: cuando cambias fuente, tamaño, negrita o alineación desde el panel de propiedades, se muta el objeto Fabric (`obj.set(...)`) pero **no** se vuelve a calcular `width/height` del elemento. Fabric autorredimensiona el texto, pero en el estado guardado queda el `width` viejo. El exportador usa ese `width` para alinear al centro/derecha (`el.x + el.width/2`) → el texto sale corrido respecto al editor.
2. **Cambios recientes no se guardan si no hay `object:modified`**: si el usuario edita solo desde los inputs del panel y guarda, no se dispara `syncCanvasToElements`. Falta un "flush" final antes de `handleSubmit` para volcar el estado real del canvas Fabric al `formData.elements`.
3. **Orden de capas al añadir un elemento**: `syncCanvasToElements` corre en `object:modified` y en operaciones de capa, pero no cuando se **añade** un elemento nuevo. El array en el estado queda con orden distinto al del canvas.
4. **Snapshot de fondo del editor vs. export**: en el editor el fondo Fabric se dibuja con `opacity` como propiedad del objeto; el exportador usa `globalAlpha`. Cuando `background_mode === 'full_ticket'` y el canvas ya coincide con la imagen, ambos deberían coincidir, pero si el usuario mueve/escala y guarda con `angle=0` se ha visto que Fabric guarda `left/top` levemente distintos por el origen. Debe forzarse `originX/originY = 'left'/'top'` en el fondo (que ya es el default) y persistir explícitamente `width/height` sin escalar.

### Cambios propuestos

- **`VisualTicketEditor.tsx`**
  - En `updateSelectedElement`, además de mutar el Fabric, llamar a `syncCanvasToElements(fabricCanvas)` para recalcular `width/height` reales.
  - Exponer un método `flushToState()` (via `useImperativeHandle` con `forwardRef`) que fuerce `syncCanvasToElements` sincronamente.
  - Ejecutar `syncCanvasToElements` justo después de `addElementToCanvas` para persistir el orden de capas de todos los elementos, no solo el añadido.
  - Asegurar `originX/originY: 'left'/'top'` explícitos en el fondo cuando se instancia `FabricImage`.

- **`TicketTemplateEditor.tsx`**
  - Convertir a `ref` el `VisualTicketEditor` y en `handleSubmit`, antes de la normalización, invocar `editorRef.current?.flushToState()` y esperar un tick (`await new Promise(r => setTimeout(r, 0))`) para que el `setState` de `elements` se aplique antes de leer `formData.elements`.
  - Al leer `formData.elements` dentro de `handleSubmit`, usar una ref reactiva (o mover la lectura tras el flush) para no capturar el valor stale del closure.

- **`renderTicket.ts`**
  - Ninguna lógica nueva; ya está correcta tras el fix previo (baseline `top`). Solo agregar un log de diagnóstico opcional detrás de `import.meta.env.DEV`.

## Problema 2 — Tamaño mínimo del QR = 100px

El aviso amarillo ("El QR queda pequeño ({n}px) — recomendado ≥100px") se dispara en `TemplateDevicePreview.tsx` cuando `qr.width * scale < 100`. El usuario quiere que **por defecto** el QR nunca pueda ser menor a 100px en el diseño.

### Cambios propuestos

- **`VisualTicketEditor.tsx`**
  - `addQRElement`: crear el QR con `width/height = 150` (ya es 150, mantener).
  - En el handler `onScaling`, si `obj.elementType === 'qr'`, forzar `obj.width * obj.scaleX >= 100` y `obj.height * obj.scaleY >= 100` (clamp durante escalado interactivo).
  - En `syncCanvasToElements`, para elementos QR: `width = Math.max(100, newWidth)`, `height = Math.max(100, newHeight)`.

- **`TicketTemplateEditor.tsx`**
  - Slider `Tamaño del QR`: ya tiene `min={100}` — dejar igual.
  - En la normalización del `handleSubmit`, forzar `width/height >= 100` para cualquier elemento `type === 'qr'` (defensa en profundidad para plantillas antiguas).

- **`TemplateDevicePreview.tsx`**
  - El aviso sigue mostrándose si el escalado del dispositivo hace que se vea <100px en pantalla; eso es informativo del render final del dispositivo y no del diseño, así que **se conserva** (útil para el usuario). Si se prefiere ocultarlo, se puede desactivar cuando `qr.width >= 100` en el canvas real.

## Archivos a modificar

- `src/components/VisualTicketEditor.tsx` — flush ref, sync en updateSelectedElement/add, clamp de QR ≥100px, `originX/originY` en fondo.
- `src/components/TicketTemplateEditor.tsx` — `useRef` al editor, `await flushToState()` en `handleSubmit`, clamp de QR en normalización.
- `src/lib/renderTicket.ts` — sin cambios funcionales (verificación).

## Validación

1. Abrir "Editar Plantilla", ajustar tamaño de fuente y alineación de un texto sólo desde el panel de propiedades → **Guardar** → en el Centro de Exportación abrir vista previa: debe coincidir píxel a píxel con el editor.
2. Agregar QR, intentar redimensionarlo por debajo de 100px con los handles → debe quedar clavado en 100×100.
3. Añadir un elemento nuevo, subirlo/bajarlo de capa, guardar y verificar en la exportación que el orden se respeta.
