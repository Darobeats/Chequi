## Diagnóstico

La falla más probable está en una combinación de cierres obsoletos entre `VisualTicketEditor` y `TicketTemplateEditor`:

- En `VisualTicketEditor`, el listener de Fabric `object:modified` se registra dentro de un `useEffect` que no depende de `onBackgroundTransformChange`.
- Ese listener conserva una versión antigua del callback del padre.
- En `TicketTemplateEditor`, el callback usa `setFormData({ ...formData, background_transform: t })`, lo que depende del `formData` capturado en ese render.
- Si el callback capturado corresponde a un estado previo a la carga del fondo, al mover la imagen puede reescribir `formData` con `background_image_url: null` o datos viejos. Resultado: React vuelve a renderizar sin URL de fondo, el efecto de fondo remueve la imagen y parece que “desaparece”.

## Plan de corrección

1. **Eliminar el estado obsoleto en callbacks del padre**
   - Cambiar los setters pasados a `VisualTicketEditor` para usar actualizaciones funcionales:
     - `setFormData(prev => ({ ...prev, background_transform: t }))`
     - `setFormData(prev => ({ ...prev, elements }))`
     - `setFormData(prev => ({ ...prev, canvas_width: width, canvas_height: height }))`
     - `setFormData(prev => ({ ...prev, background_image_url: url, ... }))`
   - Esto evita que cualquier evento del canvas restaure una versión vieja de `formData`.

2. **Blindar listeners de Fabric contra callbacks viejos**
   - En `VisualTicketEditor`, guardar los callbacks más recientes (`onBackgroundTransformChange`, `onElementsChange`, etc.) en refs.
   - Hacer que los listeners de Fabric llamen siempre a esos refs actuales, sin depender del callback capturado al montar el listener.
   - Mantener los listeners estables para no reinstalarlos innecesariamente durante drag/scale/rotate.

3. **Separar edición visual del ciclo de recarga del fondo**
   - Confirmar que el efecto que carga/recrea la imagen solo se dispare por cambio real de URL o canvas, no por cada movimiento.
   - Mantener la actualización de opacidad en un efecto independiente que no remueva ni reinstancie la imagen.
   - Al guardar transformaciones, persistir solo posición, escala y rotación; no mezclar opacidad dentro de `background_transform`.

4. **Evitar que el fondo se pierda por reinstanciación asíncrona**
   - Añadir una protección contra cargas asíncronas viejas de `FabricImage.fromURL`: si cambia la URL o se desmonta el canvas mientras carga, ignorar la respuesta anterior.
   - Antes de remover/recrear el fondo, verificar si realmente cambió la URL; si es la misma imagen, actualizar propiedades sobre el objeto existente en lugar de eliminarlo.

5. **Validación funcional**
   - Probar el flujo real en el preview:
     - abrir Plantillas,
     - cargar una imagen de fondo,
     - moverla varias veces,
     - soltarla,
     - escalarla/rotarla,
     - confirmar que sigue visible y editable,
     - guardar la plantilla y volver a abrirla para verificar que la posición persiste.

## Archivos a modificar

- `src/components/TicketTemplateEditor.tsx`
- `src/components/VisualTicketEditor.tsx`

No se tocarán otros módulos ni se cambiará el alcance de versiones/exportación/preview/recorte salvo lo necesario para estabilizar el fondo.