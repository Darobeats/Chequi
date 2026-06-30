## Diagnóstico

El botón sí fue agregado a `AttendeeManagement`, pero el módulo que el usuario probablemente está viendo en **Configuración → QRs/Asistentes** usa otro componente: `AttendeesManager`. Por eso no aparece “en ningún lado” dentro del flujo real usado en la app.

Además, `BulkQRGenerator` depende de `useTicketCategories`, pero ese hook ya devuelve categorías filtradas por el evento seleccionado; el componente vuelve a filtrarlas por `selectedEvent.id`, lo que puede dejar el selector vacío y hacer que el modal no sea usable.

## Plan de corrección

1. **Poner el botón en el módulo correcto**
   - Importar `BulkQRGenerator` dentro de `src/components/AttendeesManager.tsx`.
   - Renderizarlo en la fila de botones donde ya están `Importar Masivo`, `Resetear Todas las Entradas`, `Exportar` y `Nuevo Asistente`.
   - Mantenerlo visible solo cuando el módulo está mostrando asistentes QR normales, no la lista de cédulas/autorizados.

2. **Evitar duplicidad/confusión**
   - Revisar si debe mantenerse también en `AttendeeManagement.tsx`; si ambos componentes representan pantallas diferentes, dejarlo solo donde el usuario lo necesita: el módulo visible de Configuración/Asistentes usado actualmente.

3. **Corregir el modal para que sea usable**
   - Ajustar `BulkQRGenerator` para usar directamente las categorías devueltas por `useTicketCategories()` sin re-filtrarlas incorrectamente.
   - Si no hay evento/categorías, mostrar estado claro dentro del modal en vez de parecer roto.

4. **Verificación**
   - Revisar el preview en `/admin`, entrar a **Configuración**, abrir el módulo de asistentes/QRs y confirmar visualmente que el botón aparece junto a los otros botones.
   - Confirmar que al hacer clic abre el modal y muestra categorías del evento seleccionado.