
import React from 'react';
import { Button } from '@/components/ui/button';
import { mockAttendees } from '@/utils/mockData';
import { toast } from '@/components/ui/sonner';

const ExportButton: React.FC = () => {
  const handleExport = () => {
    // Process data for export
    const data = mockAttendees.map(attendee => {
      const lastIngreso = attendee.ingresos.length > 0
        ? attendee.ingresos[0].hora
        : '';
      
      const formattedIngreso = lastIngreso 
        ? new Date(lastIngreso).toLocaleString('es-ES')
        : 'No registrado';
      
      return {
        'Ticket ID': attendee.ticketID,
        'Nombre': attendee.nombre,
        'Empresa': attendee.empresa,
        'Email': attendee.email,
        'Hora de Ingreso': formattedIngreso,
        'Estado': attendee.status === 'used' ? 'Usado' : 'Válido',
      };
    });
    
    // Convert to CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => 
      Object.values(obj)
        .map(val => `"${val}"`)
        .join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `asistentes-${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Reporte generado correctamente', {
      description: 'Se ha descargado el archivo CSV con los datos de los asistentes.'
    });
  };
  
  return (
    <Button
      onClick={handleExport}
      className="bg-dorado hover:bg-dorado/90 text-empresarial font-medium"
    >
      Exportar a Excel
    </Button>
  );
};

export default ExportButton;
