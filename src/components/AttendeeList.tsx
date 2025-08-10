
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAttendees, useControlUsage } from '@/hooks/useSupabaseData';
import QRCodeDisplay from '@/components/QRCodeDisplay';

const AttendeeList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: attendees = [], isLoading: loadingAttendees } = useAttendees();
  const { data: controlUsage = [], isLoading: loadingUsage } = useControlUsage();

  // Process attendees to add usage information
  const processedAttendees = useMemo(() => {
    return attendees.map(attendee => {
      const attendeeUsage = controlUsage.filter(usage => usage.attendee_id === attendee.id);
      const lastUsage = attendeeUsage.length > 0 ? attendeeUsage[0] : null;
      
      return {
        ...attendee,
        usage: attendeeUsage,
        lastUsage,
        formattedLastUsage: lastUsage 
          ? new Date(lastUsage.used_at).toLocaleString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          : 'Sin registros'
      };
    });
  }, [attendees, controlUsage]);

  // Filter attendees based on search term
  const filteredAttendees = useMemo(() => {
    return processedAttendees.filter(attendee => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        attendee.name.toLowerCase().includes(searchTermLower) ||
        attendee.ticket_id.toLowerCase().includes(searchTermLower) ||
        attendee.qr_code?.toLowerCase().includes(searchTermLower) ||
        
        attendee.ticket_category?.name.toLowerCase().includes(searchTermLower)
      );
    });
  }, [processedAttendees, searchTerm]);

  const getCategoryColor = (categoryName: string) => {
    switch (categoryName) {
      case 'basico': return 'bg-gray-600';
      case 'completo': return 'bg-yellow-600';
      case 'premium': return 'bg-purple-600';
      case 'vip': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  if (loadingAttendees || loadingUsage) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-hueso">Cargando datos...</p>
      </div>
    );
  }

  const totalAttendees = attendees.length;
  const attendeesWithUsage = processedAttendees.filter(a => a.usage.length > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">
          Total Registros: <span className="text-dorado">{attendeesWithUsage}/{totalAttendees}</span>
        </div>
        <Input
          type="search"
          placeholder="Buscar por nombre, ID, QR code o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs bg-empresarial border-gray-800 text-hueso"
        />
      </div>
      
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-900">
            <TableRow>
              <TableHead className="text-hueso">Nombre</TableHead>
              <TableHead className="text-hueso">Categoría</TableHead>
              <TableHead className="text-hueso">Código QR</TableHead>
              <TableHead className="text-hueso">Último Uso</TableHead>
              <TableHead className="text-hueso">Total Usos</TableHead>
              <TableHead className="text-hueso">Ticket ID</TableHead>
              <TableHead className="text-hueso">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttendees.map((attendee) => (
              <TableRow key={attendee.id} className="border-gray-800 hover:bg-gray-900 transition-colors">
                <TableCell className="font-medium text-hueso">{attendee.name}</TableCell>
                <TableCell>
                  <Badge 
                    className={`${getCategoryColor(attendee.ticket_category?.name || '')} text-white capitalize`}
                  >
                    {attendee.ticket_category?.name || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <QRCodeDisplay 
                      value={attendee.qr_code || ''} 
                      size={48}
                    />
                    {attendee.qr_code && (
                      <span className="font-mono text-xs text-gray-400 break-all max-w-[100px]">
                        {attendee.qr_code}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-300">
                  {attendee.formattedLastUsage}
                </TableCell>
                <TableCell className="text-gray-300">
                  {attendee.usage.length}
                </TableCell>
                <TableCell className="font-mono text-sm text-gray-300">{attendee.ticket_id}</TableCell>
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
              </TableRow>
            ))}
            {filteredAttendees.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  No se encontraron asistentes que coincidan con la búsqueda
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AttendeeList;
