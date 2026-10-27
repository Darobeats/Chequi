# Kiosko rápido, Asistentes y Resumen con datos de cédula, barra de patrocinadores móvil

## 1. Kiosko de documentos más rápido (se mantiene)
- Foto inmediata: en kiosko se toma apenas el documento está dentro del marco y estable unos 0.5 s (hoy espera hasta 4 s y pide más cuadros estables).
- Imagen más liviana para la IA: unos 1024 px, una sola pasada de compresión (sin reintentos de calidad), envío más pequeño = respuesta más rápida.
- Medir tiempos (captura, envío, respuesta de la IA, guardado) y mostrarlos en la consola de diagnóstico, para comparar contra la versión anterior.
- Guardado y aviso en paralelo: el banner de resultado aparece al leer la cédula; el guardado termina en segundo plano.
- La cámara sigue activa entre documentos (sin cambios).
- Revisar que el modelo de IA usado sea el más rápido disponible para leer la cédula.

## 2. Módulo Asistentes con QR y cédula
- La lista mostrará juntos los asistentes por QR y los registrados por cédula (escaneados), con columna "Origen" (QR / Cédula), estado de uso y hora de Bogotá.
- Contadores, búsqueda y filtros (origen, categoría, usado/no usado) cubren ambos tipos.
- Si hay lista autorizada de cédulas, se muestra quién de la lista ya ingresó y quién no.

## 3. Módulo Resumen útil para el administrador
- Indicadores combinados QR + cédula: registrados, ingresados, % asistencia, rechazados, consumos por control.
- Ingresos por hora (Bogotá), hora pico, desglose por categoría/mesa, últimos registros y rechazos.
- La exportación Excel incluye también los datos por cédula (oculta para Scanner, como hoy).

## 4. Barra de patrocinadores en móvil
- Mismo alto; en pantallas pequeñas: texto "Patrocinadores" más corto/oculto, logos más pequeños que se desplazan solos si no caben, y "Powered by DarocodeIA" en letra menor, todo dentro de la barra sin cortes.

## 5. Contadores al borrar registros
- Al borrar asistentes o cédulas, todos los contadores vuelven a cero (sin números negativos en "Sin registros").
- Los contadores se calculan desde los registros actuales, no desde historiales viejos que quedaron sin su asistente.
- Los ingresos ("Acceso") solo suman en "Cédulas escaneadas"; "Consumos registrados" cuenta únicamente controles de consumo (comida, bebida, etc.).
- Revisar en la base de datos qué datos quedan tras borrar y limpiar los huérfanos.

## Detalles técnicos
- `CedulaScanner.tsx` / `frameQuality.ts`: parámetros de kiosko (stableFrames menor, timeout ~1.5 s), `cedulaImage.ts` maxSize 1024 y calidad única 0.7; `Scanner.tsx` confirmación optimista; revisar modelo en la función `scan-cedula-ai`.
- `AttendeeManagement.tsx` + hook que une `attendees` y `cedula_registros`/`cedula_control_usage` (paginado con `fetchAllPaginated`).
- RPC `get_event_summary_report`: agregar secciones de cédula; actualizar `EventSummaryReport.tsx` y exportación.
- `SponsorLogosBar.tsx`: diseño responsive con `overflow-hidden`, marquesina en móvil.
- Verificar con Playwright en 390 px y con prueba simulada del kiosko.
