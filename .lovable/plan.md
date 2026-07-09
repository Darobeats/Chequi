## Objetivo
Dejar solo dos visuales: la plantilla que se edita y el PNG final que se imprime/descarga. Ambos deben salir del mismo modelo de datos y del mismo motor de render para que no existan 3 resultados diferentes.

## Plan definitivo

1. **Eliminar previews redundantes y contradictorios**
   - Quitar del editor los botones **Comparar** y **Render export**.
   - Quitar la **Vista previa por dispositivo** del editor de plantilla.
   - Mantener solo:
     - **Editor de plantilla**: donde se ubican fondo, QR y textos.
     - **Vista previa/descarga final** en el Centro de Exportación: el PNG real que se imprimirá o descargará.

2. **Convertir la imagen subida en el ticket completo**
   - Cuando se suba una imagen de fondo, el canvas tomará exactamente el ancho/alto natural de esa imagen.
   - La imagen se colocará en `x=0`, `y=0`, `scaleX=1`, `scaleY=1`, `angle=0`, ocupando el 100% del ticket.
   - El fondo quedará bloqueado por defecto; no se podrá mover accidentalmente ni “centrar” manualmente.
   - Se eliminará la idea de `cover/contain/tile` para el editor visual: si hay imagen, esa imagen es el ticket completo.
   - Si se necesita modificar el arte, se hace cambiando/subiendo otra imagen o usando recorte, no arrastrando el fondo dentro del canvas.

3. **Un solo render para vista final y descarga**
   - Ajustar `renderTicket` para que en plantillas visuales dibuje siempre:
     1. fondo exacto al tamaño del canvas,
     2. elementos en el orden guardado,
     3. QR/textos con las mismas coordenadas y dimensiones absolutas.
   - La vista previa del Centro de Exportación y la descarga usarán el mismo `Blob` generado por `renderTicket`, como ya hacen, pero con una plantilla saneada y consistente.

4. **Sincronización fuerte al guardar**
   - Antes de guardar, forzar lectura directa del canvas Fabric y persistir:
     - posición absoluta,
     - ancho/alto absoluto,
     - fontSize final,
     - orden visual de capas,
     - QR mínimo 100×100.
   - Evitar depender de estados React atrasados después de editar con controles o arrastrar elementos.

5. **QR mínimo real de 100px**
   - Mantener QR nuevo en 150×150.
   - Bloquear escalado interactivo por debajo de 100×100.
   - Reforzar el mínimo al guardar y al renderizar, para plantillas antiguas también.
   - Eliminar el aviso de “QR pequeño” porque ya no debe existir un QR de diseño menor a 100px.

6. **Limpieza de UI y mensajes**
   - Cambiar los textos del editor para reflejar el flujo correcto: “la imagen subida define el ticket completo”.
   - Quitar instrucciones de mover/rotar/escalar fondo, porque esa opción es parte de la causa del problema.
   - Mantener controles de capas solo para QR/textos, no para el fondo.

## Archivos a modificar
- `src/components/VisualTicketEditor.tsx`
- `src/components/TicketTemplateEditor.tsx`
- `src/components/TemplateDevicePreview.tsx` o retirar su uso
- `src/components/TemplateCompareDialog.tsx` o retirar su uso
- `src/lib/renderTicket.ts`

## Validación
- Subir una imagen: el canvas debe quedar exactamente del tamaño de esa imagen y el fondo debe ocupar 100% sin moverlo.
- Editar QR/textos, guardar, abrir Centro de Exportación: la vista previa debe coincidir con el diseño guardado.
- Descargar el PNG desde esa vista previa: debe ser el mismo PNG que se estaba viendo.
- Intentar reducir QR bajo 100px: no debe permitirlo ni mostrar advertencia.