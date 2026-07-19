import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import BulkQRGenerator from '@/components/admin/BulkQRGenerator';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAttendees, useResetControlUsage, useTicketCategories } from '@/hooks/useSupabaseData';
import { useDeleteAttendee, useRegenerateQRCode } from '@/hooks/useAttendeeManagement';
import { useAttendeesUsageMap } from '@/hooks/useAttendeesUsageMap';
import { useEventContext } from '@/context/EventContext';
import { Attendee } from '@/types/database';
import { toast } from '@/components/ui/sonner';
import { Plus, Upload, Edit, Trash2, QrCode, RotateCcw, Users, FileX, AlertTriangle, Filter, CheckCircle2, Circle } from 'lucide-react';
import AttendeeForm from './AttendeeForm';
import BulkImportDialog from './BulkImportDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAllEventConfigs } from '@/hooks/useEventConfig';
import { useQueryClient } from '@tanstack/react-query';
import { bogotaDateKey, bogotaTime } from '@/lib/timezone';

type QRUsageFilter = 'all' | 'used' | 'unused';
type StatusFilter = 'all' | 'valid' | 'used' | 'blocked';

const PAGE_SIZES = [50, 100, 200, 500];

const AttendeeManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attendeeToDelete, setAttendeeToDelete] = useState<Attendee | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [qrUsageFilter, setQrUsageFilter] = useState<QRUsageFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Selection (by attendee id)
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pagination (client-side)
  const [pageSize, setPageSize] = useState<number>(100);
  const [page, setPage] = useState<number>(0);

  // Bulk operation progress
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, label: '' });

  const { selectedEvent } = useEventContext();
  const { data: attendees = [], isLoading } = useAttendees();
  const { data: categories = [] } = useTicketCategories();
  const { data: usageMap } = useAttendeesUsageMap(selectedEvent?.id || null);
  const { data: events = [] } = useAllEventConfigs();
  const deleteMutation = useDeleteAttendee();
  const regenerateQRMutation = useRegenerateQRCode();
  const resetControlUsage = useResetControlUsage();
  const queryClient = useQueryClient();

  const filteredAttendees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return attendees.filter((a) => {
      // search
      if (term) {
        const hit =
          a.name.toLowerCase().includes(term) ||
          a.ticket_id.toLowerCase().includes(term) ||
          (a.qr_code || '').toLowerCase().includes(term) ||
          ((a as any).cedula || '').toLowerCase().includes(term) ||
          (a.ticket_category?.name || '').toLowerCase().includes(term);
        if (!hit) return false;
      }
      // category
      if (categoryFilter.size > 0 && !categoryFilter.has(a.category_id)) return false;
      // qr usage
      if (qrUsageFilter !== 'all') {
        const used = !!usageMap?.get(a.id);
        if (qrUsageFilter === 'used' && !used) return false;
        if (qrUsageFilter === 'unused' && used) return false;
      }
      // record status
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });
  }, [attendees, searchTerm, categoryFilter, qrUsageFilter, statusFilter, usageMap]);

  const totalPages = Math.max(1, Math.ceil(filteredAttendees.length / pageSize));
  const pageAttendees = useMemo(
    () => filteredAttendees.slice(page * pageSize, page * pageSize + pageSize),
    [filteredAttendees, page, pageSize],
  );

  // Reset page if it becomes out of range after filtering
  React.useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(0);
  }, [page, totalPages]);

  const allFilteredSelected =
    filteredAttendees.length > 0 && filteredAttendees.every((a) => selected.has(a.id));
  const someSelected = selected.size > 0;

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) filteredAttendees.forEach((a) => next.add(a.id));
      else filteredAttendees.forEach((a) => next.delete(a.id));
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

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
      toast.error('Error al eliminar el asistente', { description: error.message });
    }
  };

  const handleBulkDeleteAll = async () => {
    try {
      const { error: usageError } = await supabase
        .from('control_usage').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (usageError) throw usageError;
      const { error: attendeesError } = await supabase
        .from('attendees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (attendeesError) throw attendeesError;
      toast.success('Todos los asistentes han sido eliminados correctamente');
    } catch (error: any) {
      toast.error('Error al eliminar todos los asistentes', { description: error.message });
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

  // ---------------- BULK ACTIONS ----------------

  const runBulk = async (
    label: string,
    ids: string[],
    op: (id: string) => Promise<void>,
    chunk = 25,
  ) => {
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: ids.length, label });
    let done = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const results = await Promise.allSettled(slice.map(op));
      results.forEach((r) => { if (r.status === 'rejected') failed++; });
      done += slice.length;
      setBulkProgress({ done, total: ids.length, label });
    }
    setBulkRunning(false);
    if (failed > 0) toast.error(`${label}: ${done - failed}/${ids.length} OK, ${failed} con error`);
    else toast.success(`${label}: ${done} OK`);
    queryClient.invalidateQueries({ queryKey: ['attendees'] });
    queryClient.invalidateQueries({ queryKey: ['attendees_usage_map'] });
    queryClient.invalidateQueries({ queryKey: ['control_usage'] });
  };

  const bulkResetUsage = async () => {
    const ids = Array.from(selected);
    // Delete in chunks of 100 to avoid huge IN() lists
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: ids.length, label: 'Reseteando QRs' });
    let done = 0, failed = 0;
    const CHUNK = 100;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error } = await supabase.from('control_usage').delete().in('attendee_id', slice);
      if (error) failed += slice.length;
      done += slice.length;
      setBulkProgress({ done, total: ids.length, label: 'Reseteando QRs' });
    }
    setBulkRunning(false);
    if (failed) toast.error(`Reset: ${done - failed}/${ids.length} OK, ${failed} con error`);
    else toast.success(`Reset: ${done} QRs disponibles nuevamente`);
    queryClient.invalidateQueries({ queryKey: ['attendees_usage_map'] });
    queryClient.invalidateQueries({ queryKey: ['control_usage'] });
    clearSelection();
  };

  const bulkChangeStatus = async (newStatus: 'valid' | 'blocked') => {
    const ids = Array.from(selected);
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: ids.length, label: `Marcando como ${newStatus}` });
    let done = 0, failed = 0;
    const CHUNK = 200;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error } = await supabase.from('attendees').update({ status: newStatus }).in('id', slice);
      if (error) failed += slice.length;
      done += slice.length;
      setBulkProgress({ done, total: ids.length, label: `Marcando como ${newStatus}` });
    }
    setBulkRunning(false);
    if (failed) toast.error(`${done - failed}/${ids.length} OK, ${failed} con error`);
    else toast.success(`${done} asistentes marcados como ${newStatus === 'valid' ? 'válidos' : 'bloqueados'}`);
    queryClient.invalidateQueries({ queryKey: ['attendees'] });
    clearSelection();
  };

  const bulkRegenerateQR = async () => {
    const ids = Array.from(selected);
    await runBulk('Regenerando QRs', ids, async (id) => {
      await regenerateQRMutation.mutateAsync(id);
    }, 10);
    clearSelection();
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: ids.length, label: 'Eliminando asistentes' });
    let done = 0, failed = 0;
    const CHUNK = 100;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error: uErr } = await supabase.from('control_usage').delete().in('attendee_id', slice);
      const { error } = await supabase.from('attendees').delete().in('id', slice);
      if (error || uErr) failed += slice.length;
      done += slice.length;
      setBulkProgress({ done, total: ids.length, label: 'Eliminando asistentes' });
    }
    setBulkRunning(false);
    if (failed) toast.error(`${done - failed}/${ids.length} OK, ${failed} con error`);
    else toast.success(`${done} asistentes eliminados`);
    queryClient.invalidateQueries({ queryKey: ['attendees'] });
    queryClient.invalidateQueries({ queryKey: ['attendees_usage_map'] });
    clearSelection();
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

  const usedCount = usageMap ? Array.from(usageMap.keys()).filter((id) => attendees.some((a) => a.id === id)).length : 0;
  const unusedCount = attendees.length - usedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary">Gestión de Asistentes</h2>
          <p className="text-muted-foreground mt-2">
            Administra todos los aspectos de los asistentes del evento
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
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
                {attendees.filter((a) => a.qr_code).length}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm text-muted-foreground">QR usado</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">{usedCount}</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Circle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">QR sin usar</span>
              </div>
              <p className="text-2xl font-bold">{unusedCount}</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Filtrados</span>
              </div>
              <p className="text-2xl font-bold text-primary">{filteredAttendees.length}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full xl:w-auto justify-start xl:justify-end gap-2 flex-wrap">
          <BulkQRGenerator />
          <Button onClick={() => setShowBulkImport(true)} variant="outline" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Importar Masivo
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 text-orange-600 border-orange-600 hover:bg-orange-50">
                <RotateCcw className="w-4 h-4" />
                Resetear Todo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Resetear TODAS las entradas
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Elimina todos los registros de control_usage del sistema. Irreversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try { await resetControlUsage.mutateAsync(null); toast.success('Todas las entradas fueron reseteadas'); }
                    catch (e: any) { toast.error('Error', { description: e.message }); }
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Resetear Todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2">
                <FileX className="w-4 h-4" />
                Eliminar Todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Eliminar TODOS los asistentes
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="font-medium text-red-600">⚠️ Irreversible.</span> Se eliminarán {attendees.length} asistentes y sus registros.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDeleteAll} className="bg-red-600 hover:bg-red-700">
                  Eliminar Todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={() => { setSelectedAttendee(null); setShowForm(true); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Asistente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          type="search"
          placeholder="Buscar por nombre, cédula, ticket ID, QR o categoría…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        {/* Category multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Categoría {categoryFilter.size > 0 && <Badge variant="secondary">{categoryFilter.size}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 max-h-72 overflow-y-auto">
            <div className="space-y-2">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={categoryFilter.has(c.id)}
                    onCheckedChange={(v) => {
                      setCategoryFilter((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(c.id); else next.delete(c.id);
                        return next;
                      });
                    }}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
              {categoryFilter.size > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setCategoryFilter(new Set())} className="w-full">
                  Limpiar
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* QR usage filter */}
        <Select value={qrUsageFilter} onValueChange={(v) => setQrUsageFilter(v as QRUsageFilter)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado QR" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los QR</SelectItem>
            <SelectItem value="unused">QR sin usar</SelectItem>
            <SelectItem value="used">QR ya usado</SelectItem>
          </SelectContent>
        </Select>

        {/* Record status filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado registro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="valid">Válido</SelectItem>
            <SelectItem value="used">Marcado usado</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
          </SelectContent>
        </Select>

        {(categoryFilter.size > 0 || qrUsageFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setCategoryFilter(new Set()); setQrUsageFilter('all'); setStatusFilter('all'); setSearchTerm(''); }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-primary/10 border border-primary/40 rounded-lg p-3">
          <span className="text-sm font-medium">{selected.size} seleccionados</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2"><RotateCcw className="w-4 h-4" />Resetear QR</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetear {selected.size} QRs</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán los registros de uso de los QRs seleccionados. Podrán volver a escanearse desde cero.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkResetUsage}>Resetear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="sm" variant="outline" className="gap-2" onClick={() => bulkChangeStatus('valid')}>
              <CheckCircle2 className="w-4 h-4" />Marcar válidos
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => bulkChangeStatus('blocked')}>
              <FileX className="w-4 h-4" />Bloquear
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2"><QrCode className="w-4 h-4" />Regenerar QR</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerar {selected.size} QRs</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se generarán nuevos códigos QR. <strong>Los QRs distribuidos previamente dejarán de funcionar.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkRegenerateQR}>Regenerar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="gap-2"><Trash2 className="w-4 h-4" />Eliminar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">Eliminar {selected.size} asistentes</AlertDialogTitle>
                  <AlertDialogDescription>Irreversible. También se eliminarán sus registros de uso.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="sm" variant="ghost" onClick={clearSelection}>Quitar selección</Button>
          </div>
        </div>
      )}

      {bulkRunning && (
        <div className="bg-card border rounded-lg p-3 text-sm">
          {bulkProgress.label}: {bulkProgress.done}/{bulkProgress.total}
          <div className="h-2 bg-muted rounded mt-2 overflow-hidden">
            <div className="h-full bg-primary transition-all"
              style={{ width: `${bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(v) => toggleSelectAllFiltered(!!v)}
                  aria-label="Seleccionar todos los filtrados"
                />
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Código QR</TableHead>
              <TableHead>Estado QR</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[140px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageAttendees.map((attendee) => {
              const usage = usageMap?.get(attendee.id);
              return (
                <TableRow key={attendee.id} className={selected.has(attendee.id) ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(attendee.id)}
                      onCheckedChange={(v) => toggleSelectOne(attendee.id, !!v)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{attendee.name}</TableCell>
                  <TableCell>{(attendee as any).cedula || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge className={`${getCategoryColor(attendee.ticket_category?.name || '')} text-white capitalize`}>
                      {attendee.ticket_category?.name || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {events.find((e) => e.id === attendee.event_id)?.event_name || 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{attendee.qr_code || 'No generado'}</TableCell>
                  <TableCell>
                    {usage ? (
                      <div className="flex flex-col">
                        <Badge className="bg-emerald-600 text-white w-fit gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Usado ({usage.count})
                        </Badge>
                        {usage.lastUsedAt && (
                          <span className="text-[10px] text-muted-foreground mt-1">
                            {bogotaDateKey(usage.lastUsedAt)} · {bogotaTime(usage.lastUsedAt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="gap-1"><Circle className="w-3 h-3" />No usado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        attendee.status === 'valid' ? 'default'
                          : attendee.status === 'used' ? 'secondary' : 'destructive'
                      }
                    >
                      {attendee.status === 'valid' ? 'Válido' : attendee.status === 'used' ? 'Usado' : 'Bloqueado'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(attendee)} className="h-8 w-8 p-0" title="Editar">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRegenerateQR(attendee.id, attendee.name)}
                        className="h-8 w-8 p-0" disabled={regenerateQRMutation.isPending} title="Regenerar QR">
                        <QrCode className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleResetUsage(attendee.id, attendee.name)}
                        className="h-8 w-8 p-0" disabled={resetControlUsage.isPending} title="Resetear entradas">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(attendee)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredAttendees.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {searchTerm || categoryFilter.size || qrUsageFilter !== 'all' || statusFilter !== 'all'
                    ? 'Ningún asistente coincide con los filtros'
                    : 'No hay asistentes registrados'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredAttendees.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Filas por página</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="w-[100px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span>Página {page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AttendeeForm open={showForm} onOpenChange={setShowForm} attendee={selectedAttendee} onSuccess={handleFormSuccess} />
      <BulkImportDialog open={showBulkImport} onOpenChange={setShowBulkImport} onSuccess={() => setShowBulkImport(false)} />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive">Confirmar Eliminación</DialogTitle></DialogHeader>
          <p>¿Eliminar al asistente <strong>{attendeeToDelete?.name}</strong>? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} variant="destructive" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendeeManagement;
