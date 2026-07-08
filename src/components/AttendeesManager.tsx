
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useResetControlUsage } from '@/hooks/useSupabaseData';
import { useAttendeesPage, type AttendeePageRow } from '@/hooks/useAttendeesPage';
import { useAttendeeCounts } from '@/hooks/useAttendeeCounts';
import { useDeleteAttendee, useRegenerateQRCode } from '@/hooks/useAttendeeManagement';
import { useAllEventConfigs } from '@/hooks/useEventConfig';
import { useCedulasAutorizadas } from '@/hooks/useCedulasAutorizadas';
import { useEventWhitelistConfigById } from '@/hooks/useEventWhitelistConfig';
import { useEventContext } from '@/context/EventContext';
import { Attendee } from '@/types/database';
import { toast } from '@/components/ui/sonner';
import { Plus, Upload, Edit, Trash2, QrCode, RotateCcw, Users, IdCard, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import AttendeeForm from './AttendeeForm';
import BulkImportDialog from './BulkImportDialog';
import ExportButton from './ExportButton';
import QRCodeDisplay from './QRCodeDisplay';
import BulkQRGenerator from '@/components/admin/BulkQRGenerator';

const PAGE_SIZE = 50;

const AttendeesManager: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attendeeToDelete, setAttendeeToDelete] = useState<Attendee | null>(null);
  const [qrModal, setQrModal] = useState<AttendeePageRow | null>(null);

  const { selectedEvent } = useEventContext();
  const { data: events = [] } = useAllEventConfigs();
  const { data: whitelistConfig } = useEventWhitelistConfigById(selectedEvent?.id || null);
  const useWhitelistData = whitelistConfig?.requireWhitelist === true;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearchTerm(searchInput); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Server-side paginated attendees
  const { data: pageData, isLoading, isFetching } = useAttendeesPage({
    page,
    pageSize: PAGE_SIZE,
    search: useWhitelistData ? '' : searchTerm,
  });
  const rows = pageData?.rows ?? [];
  const totalFromServer = pageData?.total ?? 0;

  // Lightweight counters
  const { data: counts } = useAttendeeCounts();

  // Whitelist path (typically <2k items, keep client-side filter)
  const { data: cedulasAutorizadas = [], isLoading: cedulasLoading } = useCedulasAutorizadas(selectedEvent?.id || null);

  const deleteMutation = useDeleteAttendee();
  const regenerateQRMutation = useRegenerateQRCode();
  const resetControlUsage = useResetControlUsage();

  const filteredCedulas = useMemo(() => {
    if (!useWhitelistData) return [];
    const s = searchTerm.toLowerCase();
    return cedulasAutorizadas.filter(c =>
      c.numero_cedula.toLowerCase().includes(s) ||
      c.nombre_completo?.toLowerCase().includes(s) ||
      c.categoria?.toLowerCase().includes(s) ||
      c.empresa?.toLowerCase().includes(s)
    );
  }, [useWhitelistData, cedulasAutorizadas, searchTerm]);

  const totalCount = useWhitelistData ? cedulasAutorizadas.length : (counts?.total ?? 0);
  const withUsage = counts?.withUsage ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFromServer / PAGE_SIZE));

  const getCategoryColor = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'basico': return 'bg-gray-600';
      case 'completo': return 'bg-yellow-600';
      case 'premium': return 'bg-purple-600';
      case 'vip': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const handleEdit = (attendee: Attendee) => { setSelectedAttendee(attendee); setShowForm(true); };
  const handleDelete = (attendee: Attendee) => { setAttendeeToDelete(attendee); setDeleteConfirmOpen(true); };

  const confirmDelete = async () => {
    if (!attendeeToDelete) return;
    try {
      await deleteMutation.mutateAsync(attendeeToDelete.id);
      toast.success('Asistente eliminado correctamente');
      setDeleteConfirmOpen(false);
      setAttendeeToDelete(null);
    } catch (error: any) {
      toast.error('Error al eliminar el asistente', { description: error.message });
    }
  };

  const handleRegenerateQR = async (attendeeId: string, attendeeName: string) => {
    try {
      await regenerateQRMutation.mutateAsync(attendeeId);
      toast.success(`Código QR regenerado para ${attendeeName}`);
    } catch (error: any) {
      toast.error('Error al regenerar código QR', { description: error.message });
    }
  };

  const handleResetUsage = async (attendeeId: string, attendeeName: string) => {
    try {
      await resetControlUsage.mutateAsync(attendeeId);
      toast.success(`Entradas reseteadas para ${attendeeName}`);
    } catch (error: any) {
      toast.error('Error al resetear entradas', { description: error.message });
    }
  };

  const handleResetAllUsage = async () => {
    if (window.confirm('¿Está seguro de que desea resetear todas las entradas? Esta acción no se puede deshacer.')) {
      try {
        await resetControlUsage.mutateAsync(null);
        toast.success('Todas las entradas han sido reseteadas exitosamente');
      } catch (error: any) {
        toast.error('Error al resetear todas las entradas', { description: error.message });
      }
    }
  };

  const handleFormSuccess = () => { setSelectedAttendee(null); setShowForm(false); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
        <div className="flex items-center gap-2">
          {useWhitelistData ? <IdCard className="h-6 w-6 text-dorado" /> : <Users className="h-6 w-6 text-dorado" />}
          <div>
            <h2 className="text-2xl font-bold text-dorado">
              {useWhitelistData ? 'Lista de Acceso (Cédulas Autorizadas)' : 'Gestión de Asistentes'}
            </h2>
            <p className="text-gray-400">
              Total: {totalCount.toLocaleString('es-ES')} {useWhitelistData ? 'cédulas' : 'asistentes'}
              {!useWhitelistData && ` · Con ingreso: ${withUsage.toLocaleString('es-ES')}`}
              {!useWhitelistData && searchTerm && ` · Filtrados: ${totalFromServer.toLocaleString('es-ES')}`}
            </p>
          </div>
        </div>
        <div className="flex w-full xl:w-auto justify-start xl:justify-end flex-wrap gap-2">
          {!useWhitelistData && (
            <>
              <BulkQRGenerator />
              <Button onClick={() => setShowBulkImport(true)} variant="outline" className="border-gray-700 flex items-center gap-2">
                <Upload className="w-4 h-4" />Importar Masivo
              </Button>
              <Button onClick={handleResetAllUsage} variant="destructive" className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />Resetear Todas
              </Button>
              <ExportButton />
              <Button onClick={() => { setSelectedAttendee(null); setShowForm(true); }} className="bg-dorado text-empresarial hover:bg-dorado/90 flex items-center gap-2">
                <Plus className="w-4 h-4" />Nuevo Asistente
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center gap-2">
        <Input
          type="search"
          placeholder={useWhitelistData ? 'Buscar por cédula, nombre, categoría...' : 'Buscar por nombre, cédula, ticket ID, QR...'}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-md bg-empresarial border-gray-800 text-hueso"
        />
        {isFetching && !isLoading && <span className="text-xs text-gray-500">Actualizando…</span>}
      </div>

      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-900">
            <TableRow>
              {useWhitelistData ? (
                <>
                  <TableHead className="text-hueso">Cédula</TableHead>
                  <TableHead className="text-hueso">Nombre Completo</TableHead>
                  <TableHead className="text-hueso">Categoría</TableHead>
                  <TableHead className="text-hueso">Empresa</TableHead>
                  <TableHead className="text-hueso">Notas</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-hueso">Nombre</TableHead>
                  <TableHead className="text-hueso">Cédula</TableHead>
                  <TableHead className="text-hueso">Evento</TableHead>
                  <TableHead className="text-hueso">Categoría</TableHead>
                  <TableHead className="text-hueso">Código QR</TableHead>
                  <TableHead className="text-hueso">Estado</TableHead>
                  <TableHead className="text-hueso">Acciones</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {useWhitelistData
              ? (cedulasLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">Cargando…</TableCell></TableRow>
                ) : filteredCedulas.map((cedula) => (
                  <TableRow key={cedula.id} className="border-gray-800 hover:bg-gray-900 transition-colors">
                    <TableCell className="font-medium text-hueso">{cedula.numero_cedula}</TableCell>
                    <TableCell className="text-gray-300">{cedula.nombre_completo || 'N/A'}</TableCell>
                    <TableCell>{cedula.categoria ? <Badge className="bg-dorado/20 text-dorado capitalize">{cedula.categoria}</Badge> : <span className="text-gray-500">N/A</span>}</TableCell>
                    <TableCell className="text-gray-300">{cedula.empresa || 'N/A'}</TableCell>
                    <TableCell className="text-gray-300 max-w-[200px] truncate">{cedula.notas || '-'}</TableCell>
                  </TableRow>
                )))
              : (isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">Cargando página…</TableCell></TableRow>
                ) : rows.map((attendee) => (
                  <TableRow key={attendee.id} className="border-gray-800 hover:bg-gray-900 transition-colors">
                    <TableCell className="font-medium text-hueso">{attendee.name}</TableCell>
                    <TableCell className="text-gray-300">{attendee.cedula || 'N/A'}</TableCell>
                    <TableCell className="text-gray-300">{events.find(e => e.id === attendee.event_id)?.event_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={`${getCategoryColor(attendee.ticket_category?.name || '')} text-white capitalize`}>
                        {attendee.ticket_category?.name || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400 truncate max-w-[120px]">
                          {attendee.qr_code ? `…${attendee.qr_code.slice(-8)}` : 'Sin QR'}
                        </span>
                        {attendee.qr_code && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setQrModal(attendee)} title="Ver QR">
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${
                        attendee.status === 'valid' ? 'bg-green-800/30 text-green-400' :
                        attendee.status === 'used' ? 'bg-yellow-800/30 text-yellow-400' :
                        'bg-red-800/30 text-red-400'
                      }`}>
                        {attendee.status === 'valid' ? 'Válido' : attendee.status === 'used' ? 'Usado' : 'Bloqueado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(attendee)} className="h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRegenerateQR(attendee.id, attendee.name)} className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300" disabled={regenerateQRMutation.isPending} title="Regenerar QR"><QrCode className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleResetUsage(attendee.id, attendee.name)} className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300" disabled={resetControlUsage.isPending} title="Resetear entradas"><RotateCcw className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(attendee)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )))}
            {!isLoading && ((useWhitelistData && filteredCedulas.length === 0) || (!useWhitelistData && rows.length === 0)) && (
              <TableRow>
                <TableCell colSpan={useWhitelistData ? 5 : 7} className="text-center py-8 text-gray-400">
                  {searchTerm ? 'No se encontraron registros' : useWhitelistData ? 'Configure la lista de acceso en Configuración' : 'No hay asistentes registrados'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!useWhitelistData && totalFromServer > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-4 text-sm text-gray-400">
          <span>Página {page + 1} de {totalPages} · Mostrando {rows.length} de {totalFromServer.toLocaleString('es-ES')}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" />Anterior
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Siguiente<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <AttendeeForm open={showForm} onOpenChange={setShowForm} attendee={selectedAttendee} onSuccess={handleFormSuccess} />
      <BulkImportDialog open={showBulkImport} onOpenChange={setShowBulkImport} onSuccess={() => setShowBulkImport(false)} />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-hueso">
          <DialogHeader><DialogTitle className="text-red-400">Confirmar Eliminación</DialogTitle></DialogHeader>
          <p>¿Estás seguro de que deseas eliminar al asistente <strong>{attendeeToDelete?.name}</strong>? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="border-gray-700">Cancelar</Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrModal} onOpenChange={(o) => !o && setQrModal(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-hueso max-w-sm">
          <DialogHeader><DialogTitle>{qrModal?.name}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrModal?.qr_code && <QRCodeDisplay value={qrModal.qr_code} size={240} />}
            <code className="font-mono text-xs text-gray-400 break-all text-center">{qrModal?.qr_code}</code>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendeesManager;
