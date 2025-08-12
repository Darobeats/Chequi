import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAttendees, useResetControlUsage } from '@/hooks/useSupabaseData';
import { useDeleteAttendee, useRegenerateQRCode, useBulkCreateAttendees } from '@/hooks/useAttendeeManagement';
import { Attendee } from '@/types/database';
import { toast } from '@/components/ui/sonner';
import { Plus, Upload, Edit, Trash2, QrCode, RotateCcw, Users, FileX, AlertTriangle } from 'lucide-react';
import AttendeeForm from './AttendeeForm';
import BulkImportDialog from './BulkImportDialog';
import { supabase } from '@/integrations/supabase/client';

const AttendeeManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attendeeToDelete, setAttendeeToDelete] = useState<Attendee | null>(null);

  const { data: attendees = [], isLoading } = useAttendees();
  const deleteMutation = useDeleteAttendee();
  const regenerateQRMutation = useRegenerateQRCode();
  const resetControlUsage = useResetControlUsage();
  const bulkCreateMutation = useBulkCreateAttendees();

  const filteredAttendees = attendees.filter(attendee => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      attendee.name.toLowerCase().includes(searchTermLower) ||
      attendee.ticket_id.toLowerCase().includes(searchTermLower) ||
      attendee.qr_code?.toLowerCase().includes(searchTermLower) ||
      attendee.email?.toLowerCase().includes(searchTermLower) ||
      attendee.ticket_category?.name.toLowerCase().includes(searchTermLower)
    );
  });

  const getCategoryColor = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'basico': return 'bg-gray-600';
      case 'completo': return 'bg-yellow-600';
      case 'premium': return 'bg-purple-600';
      case 'vip': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const handleEdit = (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    setShowForm(true);
  };

  const handleDelete = (attendee: Attendee) => {
    setAttendeeToDelete(attendee);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!attendeeToDelete) return;
    
    try {
      await deleteMutation.mutateAsync(attendeeToDelete.id);
      toast.success('Asistente eliminado correctamente');
      setDeleteConfirmOpen(false);
      setAttendeeToDelete(null);
    } catch (error: any) {
      toast.error('Error al eliminar el asistente', {
        description: error.message
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      // Eliminar todos los registros de control_usage primero
      const { error: usageError } = await supabase
        .from('control_usage')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos los registros

      if (usageError) throw usageError;

      // Luego eliminar todos los asistentes
      const { error: attendeesError } = await supabase
        .from('attendees')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos los registros

      if (attendeesError) throw attendeesError;

      toast.success('Todos los asistentes han sido eliminados correctamente');
    } catch (error: any) {
      toast.error('Error al eliminar todos los asistentes', {
        description: error.message
      });
    }
  };

  const handleRegenerateQR = async (attendeeId: string, attendeeName: string) => {
    try {
      await regenerateQRMutation.mutateAsync(attendeeId);
      toast.success(`Código QR regenerado para ${attendeeName}`);
    } catch (error: any) {
      toast.error('Error al regenerar código QR', {
        description: error.message
      });
    }
  };

  const handleResetUsage = async (attendeeId: string, attendeeName: string) => {
    try {
      await resetControlUsage.mutateAsync(attendeeId);
      toast.success(`Entradas reseteadas para ${attendeeName}`);
    } catch (error: any) {
      toast.error('Error al resetear entradas', {
        description: error.message
      });
    }
  };

  const handleResetAllUsage = async () => {
    try {
      await resetControlUsage.mutateAsync(null);
      toast.success("Todas las entradas han sido reseteadas exitosamente");
    } catch (error: any) {
      toast.error("Error al resetear todas las entradas", {
        description: error.message,
      });
    }
  };

  const handleFormSuccess = () => {
    setSelectedAttendee(null);
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Cargando gestión de asistentes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-primary">Gestión de Asistentes</h2>
          <p className="text-muted-foreground mt-2">
            Administra todos los aspectos de los asistentes del evento
          </p>
          <div className="flex gap-4 mt-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold text-primary">{attendees.length}</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Con QR</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {attendees.filter(a => a.qr_code).length}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtrados</span>
              </div>
              <p className="text-2xl font-bold text-primary">{filteredAttendees.length}</p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowBulkImport(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar Masivo
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <RotateCcw className="w-4 h-4" />
                Resetear Entradas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Resetear Todas las Entradas
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará todos los registros de entrada de todos los asistentes. 
                  No se puede deshacer. ¿Está seguro de continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetAllUsage}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Resetear Todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex items-center gap-2"
              >
                <FileX className="w-4 h-4" />
                Eliminar Todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Eliminar Todos los Asistentes
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p className="font-medium text-red-600">⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE</p>
                  <p>Se eliminarán:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Todos los {attendees.length} asistentes registrados</li>
                    <li>Todos los registros de entrada y control</li>
                    <li>Todos los códigos QR generados</li>
                  </ul>
                  <p className="font-medium">¿Está completamente seguro de continuar?</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Eliminar Todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={() => {
              setSelectedAttendee(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Asistente
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 items-center">
        <Input
          type="search"
          placeholder="Buscar por nombre, email, ticket ID, QR code o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Código QR</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttendees.map((attendee) => (
              <TableRow key={attendee.id}>
                <TableCell className="font-medium">{attendee.name}</TableCell>
                <TableCell>{attendee.email || 'N/A'}</TableCell>
                <TableCell>
                  <Badge 
                    className={`${getCategoryColor(attendee.ticket_category?.name || '')} text-white capitalize`}
                  >
                    {attendee.ticket_category?.name || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{attendee.ticket_id}</TableCell>
                <TableCell className="font-mono text-xs">
                  {attendee.qr_code || 'No generado'}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      attendee.status === 'valid' ? 'default' : 
                      attendee.status === 'used' ? 'secondary' : 'destructive'
                    }
                  >
                    {attendee.status === 'valid' ? 'Válido' : 
                     attendee.status === 'used' ? 'Usado' : 'Bloqueado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(attendee)}
                      className="h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRegenerateQR(attendee.id, attendee.name)}
                      className="h-8 w-8 p-0"
                      disabled={regenerateQRMutation.isPending}
                      title="Regenerar QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResetUsage(attendee.id, attendee.name)}
                      className="h-8 w-8 p-0"
                      disabled={resetControlUsage.isPending}
                      title="Resetear entradas"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(attendee)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredAttendees.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No se encontraron asistentes que coincidan con la búsqueda' : 'No hay asistentes registrados'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <AttendeeForm
        open={showForm}
        onOpenChange={setShowForm}
        attendee={selectedAttendee}
        onSuccess={handleFormSuccess}
      />

      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onSuccess={() => setShowBulkImport(false)}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p>
            ¿Estás seguro de que deseas eliminar al asistente <strong>{attendeeToDelete?.name}</strong>? 
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              variant="destructive"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendeeManagement;