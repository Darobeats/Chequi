# Quitar "Registros por formulario QR" del Resumen

Ese recuadro cuenta las respuestas del formulario público de autorregistro (el QR que lleva a la página de registro). Como no aporta valor en el Resumen, se elimina.

- Quitar el recuadro "Registros por formulario QR" del módulo Resumen.
- Las respuestas del formulario siguen guardándose y visibles en su sección de formularios y en el reporte Excel; no se borra ningún dato.

## Detalle técnico
- `src/components/summary/EventSummaryReport.tsx`: eliminar el componente `RegistrationCount`, su uso y los imports que queden sin uso.
