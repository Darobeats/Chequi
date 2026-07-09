# Simplificar Imagen de Fondo: solo forma libre

## Problema
En el editor de Plantillas, el desplegable "Modo de aplicación" (Mosaico / Cubrir / Contener / Ticket = Imagen completa) no aporta valor real: las opciones no permiten posicionar la imagen como el usuario quiere, y en la práctica la imagen queda desubicada.

## Objetivo
Reemplazar todo ese flujo por **una sola experiencia libre**: subir la imagen y moverla / escalarla / rotarla directamente sobre el canvas del editor visual, sin dropdowns ni modos.

## Cambios

### 1. `src/components/TicketTemplateEditor.tsx`
- Eliminar el `<Select>` "Modo de aplicación" y su texto explicativo (rama `use_visual_editor`).
- Eliminar toda la sección duplicada "Imagen de Fondo (Arte del Ticket)" del modo NO-visual (la que también muestra el select `background_mode`), porque solo se usa cuando hay editor visual. En el modo clásico (layout 2x2/3x3) ya no ofrecemos fondo — mantenemos las opciones actuales de tickets pero sin el bloque de fondo redundante.
- Al subir imagen: fijar internamente `background_mode = 'full_ticket'` como valor por defecto (para preservar compatibilidad con datos existentes) y resetear `background_transform` para que se auto-ajuste al canvas la primera vez.
- Mantener el slider de opacidad (útil y pedido por el usuario en iteraciones previas).

### 2. `src/components/VisualTicketEditor.tsx`
- Activar `bgEditable = true` por defecto para que la imagen sea inmediatamente arrastrable/escalable/rotable al subirla (sin obligar al usuario a pulsar "🔓 Editar fondo" primero). Mantener el botón de bloquear/desbloquear como opción.
- Actualizar el texto de ayuda de la Card "Imagen de fondo" para que diga simplemente: "Arrastra, redimensiona y rota la imagen sobre el canvas. Se conserva la calidad original."
- La lógica de auto-fit inicial (cuando `background_transform` viene vacío) se conserva con comportamiento tipo `cover` para que la imagen aparezca visible y centrada al subirla por primera vez; a partir de ahí el usuario la manipula libremente y su posición se guarda en `background_transform`.

## Detalles técnicos
- **No** se elimina la columna `background_mode` de la base de datos ni del tipo `TicketTemplate` (evita romper tickets guardados y no hay solicitud de migración).
- El renderer de exportación seguirá leyendo `background_transform` como fuente de verdad (que ya es el caso en el editor visual).
- Cambios acotados a UI de los dos componentes mencionados. Sin cambios en hooks, migraciones ni edge functions.

## Resultado esperado
Al abrir Plantillas → activar "Editor Visual" → subir imagen: la imagen aparece en el canvas ya lista para arrastrar, escalar con las esquinas y rotar con el asa superior. Sin desplegables, sin modos, sin fricción.
