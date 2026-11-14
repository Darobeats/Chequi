# Arreglar el cambio de rol de usuarios

## Qué pasa
- Al guardar un usuario, Chequi primero actualiza su perfil (nombre) y después el rol. Una regla de seguridad del perfil se consulta a sí misma, la base de datos la rechaza ("infinite recursion") y el guardado se corta antes de cambiar el rol.
- Por eso el usuario sigue con el rol anterior, "viewer" (Observador), y al entrar se queda en la pantalla "Estado del sistema", porque ese rol no tiene página asignada.

## Cambios
1. **Corregir la regla de seguridad del perfil**: reemplazar la regla "el usuario puede editar su propio perfil" por una versión que no se consulte a sí misma (función segura que lee el correo y asistente actuales). Se mantiene la misma protección: nadie puede cambiar su propio correo ni su asistente vinculado.
2. **Cambiar el rol aunque falle el nombre**: el rol se guarda primero; si el nombre falla, se avisa sin perder el cambio de rol.
3. **Rol Observador sin pantalla en blanco**: si un usuario tiene rol Observador, mostrar un mensaje claro ("Tu cuenta no tiene acceso asignado, contacta al administrador") en vez de "Estado del sistema".
4. **Verificación**: cambiar un usuario de prueba a Control y comprobar que entra al panel.

Después del arreglo, vuelve a asignar el rol Control al usuario afectado; al cerrar sesión y entrar de nuevo verá el panel.

## Detalle técnico
- Migración: `DROP POLICY "Users can update own profile basic info"`; crear `public.profile_locked_fields(uuid)` SECURITY DEFINER (`search_path public`) que devuelve email/attendee_id, y recrear la política usando esa función en `WITH CHECK`.
- `useUserManagement.useUpdateUser`: invocar `update-user-role` antes del update de `profiles`.
- `Dashboard.tsx`: rama para `role === 'viewer'`.
