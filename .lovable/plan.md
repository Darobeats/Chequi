Implementaré esto como corrección cerrada con validación interna antes de marcarlo como resuelto.

1. Unificar definitivamente todos los exports de ticket
- Eliminar el motor alterno que aún existe en `ExportTicketsPNG`.
- Hacer que cualquier descarga PNG/ZIP use exclusivamente `renderTicket`.
- Mantener solo dos visuales funcionales: editor y resultado final exportado.
- Retirar/ignorar componentes viejos de comparación o preview alternativo que puedan seguir mostrando resultados distintos.

2. Hacer que la imagen subida sea el ticket completo
- La imagen de fondo quedará siempre fija en `0,0`, sin escala editable, sin centrado manual y sin opacidad.
- El canvas guardado tomará las dimensiones naturales de la imagen.
- El export usará exactamente esas mismas dimensiones.

3. Corregir QR para legibilidad real, sin cambiar los códigos ya existentes
- No cambiaré el valor del QR: seguirá usando `attendee.qr_code || attendee.ticket_id`, por lo que los códigos ya distribuidos siguen apuntando al mismo dato.
- Cambiaré la generación visual del QR para que tenga zona blanca de seguridad obligatoria. La causa crítica encontrada es que hoy se genera con `margin: 0`, lo cual puede volverlo ilegible al imprimirse sobre fondos de diseño.
- Mantendré tamaño mínimo real de 100px, pero con margen interno blanco para que el scanner lo detecte.
- Usaré alto contraste fijo negro/blanco para QR, sin depender del fondo.

4. Sincronizar medidas/capas desde Fabric al guardado
- Al guardar, leeré directamente el canvas Fabric y persistiré coordenadas, tamaños, fuente y orden visual final.
- Normalizaré escala residual en valores absolutos para que el export no interprete distinto el diseño.
- El orden de `template.elements` será el orden real de capas del editor.

5. Pruebas internas obligatorias antes de finalizar
- Generaré un ticket PNG desde `renderTicket` con datos de prueba equivalentes a los asistentes reales.
- Decodificaré el QR generado con la misma librería de lectura usada por el scanner (`qr-scanner`) en navegador/Playwright.
- Verificaré que el texto decodificado sea exactamente el mismo valor (`qr_code` o `ticket_id`) que se imprimió.
- Validaré que la preview del Centro de Exportación y la descarga usan el mismo Blob/render.
- Ejecutaré verificación técnica de TypeScript/build solo después de aplicar cambios.

6. Resultado esperado
- Lo que se edita es lo que se imprime.
- No habrá tres vistas con resultados diferentes.
- Los QR exportados tendrán zona blanca y tamaño mínimo, y se probará internamente que sean legibles antes de decir que quedó solucionado.