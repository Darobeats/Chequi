import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthorizeUserManagement } from '@/hooks/useAuthorizeUserManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props { eventId: string; eventName: string; isActive: boolean }

const DeleteEventButton: React.FC<Props> = ({ eventId, eventName, isActive }) => {
  const { canManageUsers: isSuperAdmin } = useAuthorizeUserManagement();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isSuperAdmin) return null;

  const run = async () => {
    setBusy(true);
    const { error } = await (supabase.rpc as any)('delete_event_cascade', { p_event_id: eventId });
    setBusy(false);
    if (error) { toast.error('No se pudo eliminar', { description: error.message }); return; }
    toast.success('Evento eliminado', { description: eventName });
    setOpen(false);
    qc.invalidateQueries();
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); setConfirm(''); }}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-10 border-red-500/50 text-red-400 hover:bg-red-500/10" aria-label="Eliminar evento">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-gray-950 border-gray-700 text-hueso max-w-[calc(100vw-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar “{eventName}”</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {isActive
              ? 'Este evento está activo. Desactívalo primero para poder eliminarlo.'
              : 'Se borrarán para siempre asistentes, categorías, controles, registros, plantillas y equipo del evento. Escribe el nombre del evento para confirmar.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!isActive && (
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={eventName} className="bg-gray-900 border-gray-700 h-11" />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
          {!isActive && (
            <Button className="h-11 bg-red-600 hover:bg-red-700 text-hueso" disabled={busy || confirm.trim() !== eventName.trim()} onClick={run}>
              {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEventButton;
