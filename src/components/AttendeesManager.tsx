
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAttendees, useResetControlUsage } from '@/hooks/useSupabaseData';
import { useDeleteAttendee, useRegenerateQRCode } from '@/hooks/useAttendeeManagement';
import { useAllEventConfigs } from '@/hooks/useEventConfig';
import { Attendee } from '@/types/database';
import { toast } from '@/components/ui/sonner';
import { Plus, Upload, Edit, Trash2, QrCode, RotateCcw } from 'lucide-react';
import AttendeeForm from './AttendeeForm';
import BulkImportDialog from './BulkImportDialog';
import ExportButton from './ExportButton';
import ExportQRDistribution from './ExportQRDistribution';
import QRCodeDisplay from './QRCodeDisplay';

const AttendeesManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attendeeToDelete, setAttendeeToDelete] = useState<Attendee | null>(null);

  const { data: attendees = [], isLoading } = useAttendees();
  const { data: events = [] } = useAllEventConfigs();
  const deleteMutation = useDeleteAttendee();
  const regenerateQRMutation = useRegenerateQRCode();
  const resetControlUsage = useResetControlUsage();

  const filteredAttendees = attendees.filter(attendee => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      attendee.name.toLowerCase().includes(searchTermLower) ||
      attendee.ticket_id.toLowerCase().includes(searchTermLower) ||
      attendee.qr_code?.toLowerCase().includes(searchTermLower) ||
      (attendee as any).cedula?.toLowerCase().includes(searchTermLower) ||
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
    if (window.confirm("¿Está seguro de que desea resetear todas las entradas? Esta acción no se puede deshacer.")) {
      try {
        await resetControlUsage.mutateAsync(null);
        toast.success("Todas las entradas han sido reseteadas exitosamente");
      } catch (error: any) {
        toast.error("Error al resetear todas las entradas", {
          description: error.message,
        });
      }
    }
  };

  const handleFormSuccess = () => {
    setSelectedAttendee(null);
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-hueso">Cargando gestión de asistentes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-dorado">Gestión de Asistentes</h2>
          <p className="text-gray-400">
            Total: {attendees.length} asistentes | Filtrados: {filteredAttendees.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowBulkImport(true)}
            variant="outline"
            className="border-gray-700 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar Masivo
          </Button>
          <Button
            onClick={handleResetAllUsage}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Resetear Todas las Entradas
          </Button>
          
          <ExportQRDistribution />
          
          <ExportButton />
          
          <Button
            onClick={() => {
              setSelectedAttendee(null);
              setShowForm(true);
            }}
            className="bg-dorado text-empresarial hover:bg-dorado/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Asistente
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Input
          type="search"
          placeholder="Buscar por nombre, ticket ID, QR code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md bg-empresarial border-gray-800 text-hueso"
        />
      </div>

      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-900">
            <TableRow>
              <TableHead className="text-hueso">Nombre</TableHead>
              <TableHead className="text-hueso">Cédula</TableHead>
              <TableHead className="text-hueso">Evento</TableHead>
              <TableHead className="text-hueso">Categoría</TableHead>
              <TableHead className="text-hueso">Código QR</TableHead>
              <TableHead className="text-hueso">Estado</TableHead>
              <TableHead className="text-hueso">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttendees.map((attendee) => (
              <TableRow key={attendee.id} className="border-gray-800 hover:bg-gray-900 transition-colors">
                <TableCell className="font-medium text-hueso">{attendee.name}</TableCell>
                <TableCell className="text-gray-300">{(attendee as any).cedula || 'N/A'}</TableCell>
                <TableCell className="text-gray-300">
                  {events.find(e => e.id === attendee.event_id)?.event_name || 'N/A'}
                </TableCell>
                <TableCell>
                  <Badge 
                    className={`${getCategoryColor(attendee.ticket_category?.name || '')} text-white capitalize`}
                  >
                    {attendee.ticket_category?.name || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell className="py-2">
                  <QRCodeDisplay 
                    value={attendee.qr_code || ''} 
                    size={80}
                    className="mx-auto"
                  />
                </TableCell>
                <TableCell>
                  <Badge 
                    className={`${
                      attendee.status === 'valid' ? 'bg-green-800/30 text-green-400' : 
                      attendee.status === 'used' ? 'bg-yellow-800/30 text-yellow-400' :
                      'bg-red-800/30 text-red-400'
                    }`}
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
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRegenerateQR(attendee.id, attendee.name)}
                      className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
                      disabled={regenerateQRMutation.isPending}
                      title="Regenerar QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResetUsage(attendee.id, attendee.name)}
                      className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300"
                      disabled={resetControlUsage.isPending}
                      title="Resetear entradas"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(attendee)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredAttendees.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  {searchTerm ? 'No se encontraron asistentes que coincidan con la búsqueda' : 'No hay asistentes registrados'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Formulario de asistente */}
      <AttendeeForm
        open={showForm}
        onOpenChange={setShowForm}
        attendee={selectedAttendee}
        onSuccess={handleFormSuccess}
      />

      {/* Importación masiva */}
      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onSuccess={() => setShowBulkImport(false)}
      />

      {/* Confirmación de eliminación */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-hueso">
          <DialogHeader>
            <DialogTitle className="text-red-400">Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p>
            ¿Estás seguro de que deseas eliminar al asistente <strong>{attendeeToDelete?.name}</strong>? 
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
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

export default AttendeesManager;
