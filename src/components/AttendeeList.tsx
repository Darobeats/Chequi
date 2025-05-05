
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Attendee, mockAttendees } from '@/utils/mockData';

interface AttendeeListProps {
  attendees?: Attendee[];
}

const AttendeeList: React.FC<AttendeeListProps> = ({ attendees = mockAttendees }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Attendee | 'ingresoTime';
    direction: 'ascending' | 'descending';
  } | null>({ key: 'ingresoTime', direction: 'descending' });

  // Process attendees to add calculated fields and handle empty ingresos arrays
  const processedAttendees = useMemo(() => {
    return attendees.map(attendee => {
      const lastIngreso = attendee.ingresos.length > 0
        ? attendee.ingresos[0].hora
        : '';
      
      const ingresoTime = lastIngreso 
        ? new Date(lastIngreso).getTime() 
        : 0;
      
      return {
        ...attendee,
        lastIngreso,
        ingresoTime,
        formattedIngreso: lastIngreso 
          ? new Date(lastIngreso).toLocaleString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          : 'No registrado'
      };
    });
  }, [attendees]);

  // Filter attendees based on search term
  const filteredAttendees = useMemo(() => {
    return processedAttendees.filter(attendee => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        attendee.nombre.toLowerCase().includes(searchTermLower) ||
        attendee.ticketID.toLowerCase().includes(searchTermLower) ||
        attendee.empresa.toLowerCase().includes(searchTermLower)
      );
    });
  }, [processedAttendees, searchTerm]);

  // Sort attendees
  const sortedAttendees = useMemo(() => {
    if (!sortConfig) return filteredAttendees;

    return [...filteredAttendees].sort((a, b) => {
      if (sortConfig.key === 'ingresoTime') {
        if (a.ingresoTime === b.ingresoTime) return 0;
        if (a.ingresoTime === 0) return 1;
        if (b.ingresoTime === 0) return -1;
        
        return sortConfig.direction === 'ascending'
          ? a.ingresoTime - b.ingresoTime
          : b.ingresoTime - a.ingresoTime;
      }
      
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredAttendees, sortConfig]);

  // Handle column sort click
  const handleSort = (key: keyof Attendee | 'ingresoTime') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    }
    
    setSortConfig({ key, direction });
  };

  // Get sort direction indicator
  const getSortDirectionIndicator = (key: keyof Attendee | 'ingresoTime') => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  // Count checked-in attendees
  const checkedInCount = processedAttendees.filter(a => a.ingresos.length > 0).length;
  const totalCount = processedAttendees.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">
          Total Ingresos: <span className="text-dorado">{checkedInCount}/{totalCount}</span>
        </div>
        <Input
          type="search"
          placeholder="Buscar por nombre o ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs bg-empresarial border-gray-800 text-hueso"
        />
      </div>
      
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-900">
            <TableRow>
              <TableHead className="text-hueso cursor-pointer" onClick={() => handleSort('nombre')}>
                Nombre {getSortDirectionIndicator('nombre')}
              </TableHead>
              <TableHead className="text-hueso cursor-pointer" onClick={() => handleSort('empresa')}>
                Empresa {getSortDirectionIndicator('empresa')}
              </TableHead>
              <TableHead className="text-hueso cursor-pointer" onClick={() => handleSort('ingresoTime')}>
                Hora Ingreso {getSortDirectionIndicator('ingresoTime')}
              </TableHead>
              <TableHead className="text-hueso cursor-pointer" onClick={() => handleSort('ticketID')}>
                Ticket ID {getSortDirectionIndicator('ticketID')}
              </TableHead>
              <TableHead className="text-hueso cursor-pointer" onClick={() => handleSort('status')}>
                Estado {getSortDirectionIndicator('status')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAttendees.map((attendee) => (
              <TableRow key={attendee.id} className="border-gray-800 hover:bg-gray-900 transition-colors">
                <TableCell className="font-medium text-hueso">{attendee.nombre}</TableCell>
                <TableCell className="text-gray-300">{attendee.empresa}</TableCell>
                <TableCell className="text-gray-300">
                  {attendee.formattedIngreso}
                </TableCell>
                <TableCell className="font-mono text-sm text-gray-300">{attendee.ticketID}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    attendee.status === 'used' ? 'bg-green-800/30 text-green-400' : 'bg-yellow-800/30 text-yellow-400'
                  }`}>
                    {attendee.status === 'used' ? 'Usado' : 'Válido'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {sortedAttendees.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
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
