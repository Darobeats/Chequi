

## Plan: Permitir eliminar registros de "Rechazados" (access logs)

### Problema identificado

La tabla `cedula_access_logs` tiene politicas RLS que solo permiten SELECT e INSERT. No existe politica de DELETE, lo que causa que:

1. El boton "Eliminar Todos" falla silenciosamente al intentar borrar los access logs
2. No existe un boton independiente para limpiar solo los logs de acceso (rechazados)

### Cambios necesarios

#### 1. Migracion SQL: Agregar politica DELETE para admins

```sql
CREATE POLICY "Admin can delete access_logs for assigned events"
ON public.cedula_access_logs
FOR DELETE
TO authenticated
USING (
  user_can_access_event(event_id) 
  AND user_has_role_secure(auth.uid(), 'admin'::user_role)
);
```

Esto permite que solo usuarios con rol `admin` asignados al evento puedan eliminar registros de acceso.

#### 2. Hook: Agregar funcion `useClearAccessLogs` en `useCedulasAutorizadas.ts`

Nueva mutacion que elimina todos los `cedula_access_logs` de un evento e invalida las queries relacionadas.

#### 3. UI: Agregar boton "Limpiar Rechazados" en `CedulaDashboardMonitor.tsx`

- Boton visible solo para admins, junto al boton "Eliminar Todos"
- Con AlertDialog de confirmacion mostrando cuantos registros de acceso se eliminaran
- Texto claro: "Eliminar X logs de acceso (autorizados, rechazados, duplicados)"

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Nueva politica DELETE en `cedula_access_logs` |
| `src/hooks/useCedulasAutorizadas.ts` | Agregar `useClearAccessLogs` |
| `src/components/cedula/CedulaDashboardMonitor.tsx` | Boton para limpiar access logs |

