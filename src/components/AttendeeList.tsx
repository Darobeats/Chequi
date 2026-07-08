
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAttendeesPage, type AttendeePageRow } from '@/hooks/useAttendeesPage';
import { useAttendeeCounts } from '@/hooks/useAttendeeCounts';
import { useAllEventConfigs } from '@/hooks/useEventConfig';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

const PAGE_SIZE = 50;

const AttendeeList: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [qrModal, setQrModal] = useState<AttendeePageRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearchTerm(searchInput); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: pageData, isLoading } = useAttendeesPage({ page, pageSize: PAGE_SIZE, search: searchTerm });
  const { data: counts } = useAttendeeCounts();
  const { data: events = [] } = useAllEventConfigs();

  const rows = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const getCategoryColor = (categoryName: string) => {
    switch (categoryName) {
      case 'basico': return 'bg-gray-600';
      case 'completo': return 'bg-yellow-600';
      case 'premium': return 'bg-purple-600';
      case 'vip': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <div className="text-sm font-medium">
          Total Registros: <span className="text-dorado">{(counts?.withUsage ?? 0).toLocaleString('es-ES')}/{(counts?.total ?? 0).toLocaleString('es-ES')}</span>
          {searchTerm && <span className="text-gray-400 ml-2">· Filtrados: {total.toLocaleString('es-ES')}</span>}
        </div>
        <Input
          type="search"
          placeholder="Buscar por nombre, cédula, QR..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs bg-empresarial border-gray-800 text-hueso"
        />
      </div>

      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-900">
            <TableRow>
              <TableHead className="text-hueso">Nombre</TableHead>
              <TableHead className="text-hueso">Cédula</TableHead>
              <TableHead className="text-hueso">Categoría</TableHead>
              <TableHead className="text-hueso">Código QR</TableHead>
              <TableHead className="text-hueso">Evento</TableHead>
              <TableHead className="text-hueso">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Cargando…</TableCell></TableRow>
            ) : rows.map((attendee) => (
              <TableRow key={attendee.id} className="border-gray-800 hover:bg-gray-900 transition-colors">
                <TableCell className="font-medium text-hueso">{attendee.name}</TableCell>
                <TableCell className="text-gray-300">{attendee.cedula || 'N/A'}</TableCell>
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
                <TableCell className="text-gray-300">{events.find(e => e.id === attendee.event_id)?.event_name || 'N/A'}</TableCell>
                <TableCell>
                  <Badge className={`${
                    attendee.status === 'valid' ? 'bg-green-800/30 text-green-400' :
                    attendee.status === 'used' ? 'bg-yellow-800/30 text-yellow-400' :
                    'bg-red-800/30 text-red-400'
                  }`}>
                    {attendee.status === 'valid' ? 'Válido' : attendee.status === 'used' ? 'Usado' : 'Bloqueado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No se encontraron asistentes</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-4 text-sm text-gray-400">
          <span>Página {page + 1} de {totalPages}</span>
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

export default AttendeeList;
