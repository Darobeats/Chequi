# Plantillas: un solo motor de render y modo simple sin arte

Tres objetivos: que lo que se ve en "Editar Plantilla" sea exactamente lo que se descarga, que se pueda crear una plantilla solo con QR (sin editor visual ni imagen), y quitar los ajustes que no aportan reemplazándolos por una vista previa real.

## 1. Sincronizar editor y exportación (un solo motor)

Hoy el editor dibuja con Fabric.js y la exportación redibuja "a mano" con Canvas 2D en `renderTicket.ts`. Son dos motores distintos, por eso hay diferencias de posición.

Cambio: la exportación pasa a usar el mismo motor Fabric del editor.

- `renderTicket` construye un `StaticCanvas` de Fabric del tamaño del ticket, agrega el fondo bloqueado en (0,0) a escala 1:1 y luego cada elemento con exactamente las mismas propiedades que usa el editor (`left`, `top`, `fontSize`, `fontFamily`, `fontWeight`, `textAlign`, `lineHeight: 1`, `charSpacing: 0`, `originX/originY: 'left'/'top'`), y exporta a PNG.
- Se elimina la lógica divergente actual: el desplazamiento horizontal por `textAlign` (que mueve el texto en la exportación pero no en el editor) y el ajuste vertical empírico `fontSize * 0.03`.
- El QR se genera con los mismos parámetros en ambos lados (tamaño cuadrado, mínimo 100px, zona blanca de 4 módulos, corrección M, payload `qr_code || ticket_id`), así que los QR ya distribuidos siguen siendo válidos.
- Se esperan las fuentes (`document.fonts.ready`) antes de renderizar para que las métricas coincidan.

Verificación antes de entregar: renderizar el mismo ticket con el editor y con el motor de exportación y comparar posiciones de QR y textos, y decodificar el QR del PNG resultante.

## 2. Plantillas sin editor visual (solo QR + campos)

- El editor visual deja de ser obligatorio. Al crear una plantilla se elige entre:
  - **Diseño con arte** (editor visual + imagen de fondo, como hoy).
  - **Ticket simple**: sin imagen, fondo blanco.
- En modo simple se exige al menos el QR (el interruptor de QR queda activo y no se puede apagar). Los demás campos son opcionales: Nombre, Cédula, Categoría, ID de Ticket.
- Al guardar, el modo simple genera automáticamente los mismos `elements` que usa el editor visual (QR centrado arriba y los campos activos apilados debajo, centrados), con un tamaño de ticket estándar apto para impresión. Así el Centro de Exportación usa el mismo motor y ya no filtra estas plantillas.
- El Centro de Exportación deja de exigir `use_visual_editor`: acepta cualquier plantilla que tenga elementos.

## 3. Reemplazar "Tamaños y Formato" y "Márgenes" por la vista previa

- Se eliminan de la interfaz las tarjetas "Tamaños y Formato" (distribución, tickets por página, tamaños de fuente) y "Márgenes". Las columnas siguen existiendo en la base de datos con sus valores por defecto; no se borra nada.
- En su lugar aparece una **Vista previa del ticket**, renderizada con el motor de exportación y datos de ejemplo, que se actualiza al activar/desactivar campos. Es la misma imagen que se descargará.
- Se mantiene un control simple del tamaño del QR dentro de la vista previa, porque sí afecta el resultado impreso.

## Detalles técnicos

- `src/lib/renderTicket.ts`: reescrito sobre `StaticCanvas` de Fabric; expone además una función para generar los elementos por defecto del modo simple (`buildSimpleElements(template)`).
- `src/components/VisualTicketEditor.tsx`: extraer la creación de objetos Fabric a un helper compartido con `renderTicket` para que no puedan volver a divergir.
- `src/components/TicketTemplateEditor.tsx`: selector de modo, QR obligatorio en modo simple, generación de `elements` al guardar, retirada de las tarjetas de tamaños/márgenes y nueva tarjeta de vista previa.
- `src/components/TicketExportCenter.tsx`: quitar el filtro `use_visual_editor` (solo requiere `elements.length > 0`).
- Sin cambios de base de datos.
