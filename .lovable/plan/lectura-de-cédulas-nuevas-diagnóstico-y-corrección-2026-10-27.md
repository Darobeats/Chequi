# Lectura de cédulas nuevas: diagnóstico y corrección

## Diagnóstico (verificado en los registros de IA de hoy)
- **No son los créditos:** las 36 lecturas de la última semana respondieron bien (sin errores de saldo ni de límite). Cada lectura cuesta unos 0,006–0,012 créditos.
- **No es el modelo en sí:** ya se usa un modelo rápido y económico de Gemini (Flash).
- **Causa real:** a la respuesta de la IA se le da un tope de 500 "palabras" (tokens). En varias lecturas la IA gastó las 496 completas pensando y la respuesta quedó cortada a mitad (ej. `"numero_cedula": "102075` sin terminar). La app no pudo leerla y mostró "error de edge function". Otras veces devolvió todo vacío y la app lo tomó como fallo.
- **Por qué las ya escaneadas "sí funcionan":** la app las reconoce por los datos ya guardados del evento, así que una lectura incompleta igual encaja. Con una cédula nueva no hay respaldo y falla.

## Cambios
1. Pedir a la IA que piense poco (lectura simple de documento): respuesta más rápida y sin cortes.
2. Dar margen suficiente a la respuesta para que nunca quede cortada.
3. Exigir respuesta con formato fijo (número, nombres, apellidos, fecha) y limpiar envolturas como ```json.
4. Si la IA no encuentra el número, mostrar un mensaje claro ("No se pudo leer, acerca la cédula o usa registro manual") en vez de "error de edge function".
5. Mantener el mismo modelo Flash: es el mejor equilibrio costo/velocidad; uno "mejor" costaría más y sería más lento. El costo por lectura seguirá igual o menor.

## Verificación
- Probar la función con una foto de cédula y confirmar respuesta completa y en menos de ~3 s.
- Revisar en los registros de IA que ninguna respuesta llegue al tope.

## Detalles técnicos
- `supabase/functions/scan-cedula-ai/index.ts`: quitar `temperature`, reemplazar `max_tokens: 500` por presupuesto mayor (~1500) con `reasoning_effort: "low"`, añadir `response_format` json_schema estricto, parseo tolerante a fences; devolver 422 con mensaje legible cuando `numero_cedula` es null (sin reintentos automáticos). Conservar manejo de 402/429 existente.
