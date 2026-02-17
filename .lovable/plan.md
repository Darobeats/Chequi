

## Plan: Traducciones de Componentes Internos + Excel Export con Datos de Control

### Parte 1: Completar traducciones EN en `common.json`

El archivo `en/common.json` le faltan las secciones `dashboard`, `scanner`, `admin`, y `errors` que ya existen en `es/common.json`. Se agregarán todas las traducciones correspondientes.

**Archivo: `src/i18n/locales/en/common.json`**
- Agregar las secciones `dashboard`, `scanner`, `admin`, `errors` traducidas al ingles
- Agregar nuevas claves para los componentes: `cedulaScanner`, `cedulaScanResult`, `controlTypeSelector`, `eventConfig`

**Archivo: `src/i18n/locales/es/common.json`**
- Agregar nuevas claves: `cedulaScanner`, `cedulaScanResult`, `controlTypeSelector`, `eventConfig` en espanol

### Parte 2: Traducir componentes internos

**Archivo: `src/components/cedula/CedulaScanner.tsx`**
- Agregar `useTranslation` hook
- Traducir: "Capturar Cedula de Ciudadania", "Toma una foto del frente...", "Instrucciones para mejor captura", "Solicitando permisos...", "Permitir Acceso a Camara", "Iniciar Camara", "Capturar Foto", "Analizando con IA...", "Analizar con IA", "Reintentar", y todas las instrucciones de captura

**Archivo: `src/components/cedula/CedulaScanResult.tsx`**
- Agregar `useTranslation` hook
- Traducir: "NO ESTA EN LISTA", "LIMITE ALCANZADO", "USO DE CONTROL", "ACCESO AUTORIZADO", "Cedula Escaneada", "Nombre Completo", "Numero de Cedula", "Fecha de Nacimiento", "Sexo", "RH", "Lugar de Expedicion", "Confirmar y Guardar", "Cancelar", "Cerrar y Escanear Otra", "Registrar para Reporte", "Escanear Otra Cedula", "Guardando...", "Masculino", "Femenino"

**Archivo: `src/components/scanner/ControlTypeSelector.tsx`**
- Agregar `useTranslation` hook
- Traducir: "Tipo de Control", "Selecciona el tipo de control", "Requiere:"

**Archivo: `src/components/EventConfig.tsx`**
- Agregar `useTranslation` hook
- Traducir las etiquetas principales: "Configuracion de Eventos", "Aplicar Cambios", "Actualizando...", "Seleccionar evento", "Configuraciones Existentes", "Nueva Configuracion de Evento", "Nombre del Evento", "Color Primario", "Color Secundario", "Color de Acento", "Fuente", "Editar", "Guardar", nombres de tabs (Config, Tickets, Asistentes, Asignar, Plantillas, QR, Acceso, Equipo), estados del evento (Activo, Borrador, Finalizado), y mensajes de toast

### Parte 3: Fase 4 - Excel Export con datos de control

**Archivo: `src/components/cedula/CedulaDashboardMonitor.tsx`**
- Importar `useCedulaControlUsage` de `@/hooks/useCedulaControlUsage`
- Importar `useCedulaAccessLogs` de `@/hooks/useCedulasAutorizadas`
- Importar `useCedulasAutorizadas` de `@/hooks/useCedulasAutorizadas`  
- Importar `useControlTypes` de `@/hooks/useSupabaseData`
- Pasar `controlUsage`, `controlTypes`, `autorizadas`, y `accessLogs` al componente `CedulaExportButton`

**Archivo: `src/components/cedula/CedulaExportButton.tsx`**
- Agregar nuevas props:
  - `controlUsage: CedulaControlUsage[]` (datos de `cedula_control_usage`)
  - `controlTypes: ControlType[]` (para mapear IDs a nombres)
- Crear nueva hoja **"Registros por Control"**:
  - Columnas: Fecha/Hora, Cedula, Nombre Completo, Tipo de Control, Dispositivo, Notas
  - Header con color verde
  - Datos ordenados cronologicamente
- Crear nueva hoja **"Resumen por Control"**:
  - Total por cada tipo de control (ej: Acceso: 985, Cerveza: 261, Parrillada: 115)
  - Primera y ultima hora de uso por tipo
  - Desglose por hora del dia
- Enriquecer hoja **"Registros de Cedulas"**:
  - Agregar columna "Controles Usados" que liste los tipos de control usados por cada cedula (ej: "Acceso, Cerveza")
  - Agregar columna "Total Usos" con el conteo total por persona
- Enriquecer hoja **"Resumen"**:
  - Agregar seccion "Por Tipo de Control" con totales de cada tipo

### Resumen de archivos

| Archivo | Cambio |
|---------|--------|
| `src/i18n/locales/en/common.json` | Agregar secciones faltantes + nuevas claves |
| `src/i18n/locales/es/common.json` | Agregar nuevas claves para componentes internos |
| `src/components/cedula/CedulaScanner.tsx` | i18n con useTranslation |
| `src/components/cedula/CedulaScanResult.tsx` | i18n con useTranslation |
| `src/components/scanner/ControlTypeSelector.tsx` | i18n con useTranslation |
| `src/components/EventConfig.tsx` | i18n con useTranslation |
| `src/components/cedula/CedulaDashboardMonitor.tsx` | Pasar datos de control al export |
| `src/components/cedula/CedulaExportButton.tsx` | Nuevas hojas de Excel con datos de control |

