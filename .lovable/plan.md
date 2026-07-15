## Diagnóstico confirmado

El problema de **Cortesía Bomberos** no parece ser ahora falta de plantilla: la categoría sí tiene **250 asistentes**. La pérdida ocurre porque el ZIP está usando nombres de archivo repetidos con el formato actual `Cédula_Nombre`.

En esa categoría hay **250 tickets**, pero solo **150 nombres de archivo únicos**. Varias filas tienen nombres iguales como `Bomberos #1`, `Bomberos #2`, etc. y sin cédula; al entrar al ZIP con el mismo path, JSZip sobrescribe el archivo anterior. Por eso ves 150 aunque el botón diga 250.

## Plan de corrección

1. **Hacer los nombres del ZIP 100% únicos**
   - Mantener el formato seleccionado por el usuario como base.
   - Si un archivo ya existe dentro del ZIP, agregar automáticamente un sufijo seguro, por ejemplo:
     - `SinCedula_Bomberos_1.png`
     - `SinCedula_Bomberos_1_QR-7R4B2XMJ.png`
   - Esto evita sobrescrituras incluso si hay cédula vacía, nombres repetidos o tickets duplicados por categoría.

2. **Aplicar la protección en exportaciones masivas**
   - Corregir `TicketExportCenter.tsx` para que cada ruta dentro del ZIP sea única antes de llamar a `zip.file(...)`.
   - Cubrir las 3 estructuras:
     - Por categoría
     - Por plantilla
     - Plano

3. **Mejorar el reporte final de exportación**
   - Mostrar cuántos tickets fueron generados realmente.
   - Mostrar cuántos archivos fueron renombrados por duplicidad.
   - Evitar que el usuario piense que faltaron tickets cuando en realidad antes se estaban sobrescribiendo.

4. **Validar específicamente Cortesía Bomberos**
   - Confirmar que la categoría mantiene 250 registros.
   - Confirmar que el nombre base actual produce 150 únicos.
   - Validar que con la corrección el ZIP genera 250 paths únicos.

## Qué debes hacer de tu parte para continuar el refuerzo hacia mega eventos

1. **Congelar la data final del evento**
   - Tener el Excel final o fuente final de asistentes.
   - Evitar cambios de último minuto sin una nueva prueba completa de importación/exportación.

2. **Definir reglas de identidad de tickets**
   - Para categorías como cortesías, bomberos, staff o invitados sin cédula, usar siempre `TicketID` o `TicketID_Nombre` como formato recomendado de exportación.
   - Si se usará `Cédula_Nombre`, aceptar que el sistema añadirá sufijos automáticos cuando falte cédula o haya nombres repetidos.

3. **Cerrar plantillas definitivas**
   - Validar diseño visual contra exportación PNG para cada plantilla real.
   - Confirmar bindings por categoría antes de exportar masivamente.

4. **Hacer una prueba operativa completa antes del evento**
   - Importar el dataset completo.
   - Exportar tickets por lote.
   - Preparar modo offline en cada dispositivo.
   - Escanear muestras de cada categoría.
   - Probar control de consumibles y límites.
   - Probar recuperación sin internet y sincronización posterior.

5. **Escalar control para mega eventos**
   - Usar exportación por lotes, no un único ZIP gigante.
   - Precargar offline en todos los dispositivos la noche anterior.
   - Asignar controladores por puerta/zona.
   - Tener mínimo un dispositivo backup por punto crítico.
   - Ejecutar auditoría de seguridad/RLS/linter después de cada cambio grande y antes de publicar cambios finales.

## Fuera de alcance de esta corrección

- No modificaré la base de datos para eliminar duplicados.
- No cambiaré las plantillas ni los bindings existentes.
- No alteraré la lógica de QR ni de escaneo.