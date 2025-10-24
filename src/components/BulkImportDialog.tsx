
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTicketCategories } from '@/hooks/useSupabaseData';
import { useBulkCreateAttendees, useUpsertAttendees } from '@/hooks/useAttendeeManagement';
import { useAllEventConfigs } from '@/hooks/useEventConfig';
import { toast } from '@/components/ui/sonner';
import { Upload, Download, FileText } from 'lucide-react';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BulkImportDialog: React.FC<BulkImportDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useTicketCategories();
  const { data: events = [] } = useAllEventConfigs();
  const bulkCreateMutation = useBulkCreateAttendees();
  const upsertMutation = useUpsertAttendees();
  const isPending = bulkCreateMutation.isPending || upsertMutation.isPending;

  const downloadTemplate = () => {
    const csvContent = 'nombre,cedula,categoria,ticket_id\n' +
                      'Juan Pérez,12345678,basico,\n' +
                      'María García,87654321,premium,\n' +
                      'Carlos López,11223344,vip,';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_asistentes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Plantilla descargada', {
      description: 'Usa este archivo como ejemplo para la importación masiva'
    });
  };

  const parseCSV = (text: string) => {
    const normalize = (s: string) => s?.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const headerMap: Record<string, string> = {
      // nombre
      nombre: 'nombre', name: 'nombre',
      // cedula
      cedula: 'cedula', 'cedula_ci': 'cedula', 'cedulaid': 'cedula', 'cedula_numero': 'cedula', 'cedula numero': 'cedula', 'cedula #': 'cedula', 'cedula n': 'cedula', 'cédula': 'cedula', dni: 'cedula', cc: 'cedula', documento: 'cedula', doc: 'cedula', identificacion: 'cedula', 'identificación': 'cedula', id: 'cedula',
      // categoria
      categoria: 'categoria', 'categoría': 'categoria', category: 'categoria',
      // ticket id
      ticket_id: 'ticket_id', ticket: 'ticket_id', boleto: 'ticket_id', entrada: 'ticket_id', codigo: 'ticket_id', 'codigo_ticket': 'ticket_id',
      // email
      email: 'email', correo: 'email', 'correo_electronico': 'email', 'correo electronico': 'email'
    };

    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const rawHeaders = lines[0].split(',').map(h => h.trim());
    const headers = rawHeaders.map(h => headerMap[normalize(h)] || normalize(h));

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/^\"|\"$/g, '').trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      // Clean cedula (numbers only)
      if (row.cedula) row.cedula = row.cedula.replace(/\D/g, '');
      return row;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo CSV');
      return;
    }

    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const data = parseCSV(text);
        setCsvData(data);
        toast.success(`Archivo cargado: ${data.length} registros encontrados`);
      } catch (error) {
        toast.error('Error al procesar el archivo CSV');
      }
    };
    
    reader.readAsText(file);
  };

  const generateTicketId = () => {
    const prefix = 'CLIENT';
    const randomId = Math.random().toString(36).substr(2, 4).toUpperCase();
    const year = new Date().getFullYear();
    return `${prefix}-${randomId}-${year}`;
  };

  const handleImport = async () => {
    if (!csvData.length) {
      toast.error('No hay datos para importar');
      return;
    }

    if (!selectedEventId) {
      toast.error('Debe seleccionar un evento');
      return;
    }

    try {
      // Validate data before processing
      const invalidRows = csvData.filter((row, index) => !row.nombre || row.nombre.trim() === '');
      if (invalidRows.length > 0) {
        toast.error(`Filas inválidas encontradas (sin nombre): ${invalidRows.length} filas`);
        return;
      }

      const attendeesData = csvData.map((row, index) => {
        // Find category by name or use default
        let categoryId = defaultCategoryId;
        if (row.categoria && row.categoria.trim()) {
          const category = categories.find(cat => 
            cat.name.toLowerCase().trim() === row.categoria.toLowerCase().trim()
          );
          if (category) categoryId = category.id;
        }

        if (!categoryId) {
          throw new Error(`Debe seleccionar una categoría por defecto o especificar categorías válidas en el CSV. Fila ${index + 1}: "${row.categoria}"`);
        }

        return {
          name: row.nombre.trim(),
          cedula: row.cedula && row.cedula.trim() ? row.cedula.trim().replace(/\D/g, '') : null,
          category_id: categoryId,
          event_id: selectedEventId,
          ticket_id: (row.ticket_id && row.ticket_id.trim()) ? row.ticket_id.trim() : generateTicketId()
        };
      });

      console.log('Importing attendees data:', attendeesData);
      
      const result = updateExisting
        ? await upsertMutation.mutateAsync(attendeesData)
        : await bulkCreateMutation.mutateAsync(attendeesData);
      
      console.log('Import result:', result);
      
      toast.success(`${result.length} asistentes importados correctamente`, {
        description: `Se han creado ${result.length} asistentes con códigos QR únicos. Total en sistema: ${result.length}`
      });
      
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSelectedFile(null);
      setCsvData([]);
      setDefaultCategoryId('');
      setSelectedEventId('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Import error:', error);
      
      let errorMessage = 'Error desconocido al importar asistentes';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.hint) {
        errorMessage = error.hint;
      }
      
      // Check for specific permission errors
      if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        errorMessage = 'Error de permisos: No tienes autorización para crear asistentes. Contacta al administrador.';
      }
      
      toast.error('Error al importar asistentes', {
        description: errorMessage,
        duration: 10000
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-hueso max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-dorado">Importación Masiva de Asistentes</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-4">
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="border-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar Plantilla CSV
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Evento *</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Selecciona el evento" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.event_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-400">
              Los asistentes serán asignados a este evento
            </p>
          </div>

          <div className="space-y-2">
            <Label>Categoría por Defecto *</Label>
            <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Selecciona una categoría por defecto" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="capitalize">{category.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-400">
              Esta categoría se usará para registros que no especifiquen una categoría válida
            </p>
          </div>

          <div className="space-y-2">
            <Label>Modo de importación</Label>
            <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded">
              <div>
                <p className="text-sm text-hueso">Actualizar existentes (por Ticket ID)</p>
                <p className="text-xs text-gray-400">Si el ticket_id ya existe, se actualizará el registro</p>
              </div>
              <Switch checked={updateExisting} onCheckedChange={setUpdateExisting} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Archivo CSV *</Label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-gray-700 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Seleccionar Archivo
              </Button>
              {selectedFile && (
                <div className="flex items-center gap-2 text-green-400">
                  <FileText className="w-4 h-4" />
                  {selectedFile.name}
                </div>
              )}
            </div>
          </div>

          {csvData.length > 0 && (
            <div className="bg-gray-800/50 p-4 rounded space-y-2">
              <h4 className="font-medium text-dorado">Vista Previa</h4>
              <p className="text-sm text-gray-300">
                Se importarán {csvData.length} asistentes
              </p>
              <div className="max-h-32 overflow-y-auto text-xs text-gray-400">
                {csvData.slice(0, 5).map((row, index) => (
                  <div key={index}>
                    {row.nombre} - {row.cedula}
                  </div>
                ))}
                {csvData.length > 5 && <div>... y {csvData.length - 5} más</div>}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-400 p-3 bg-gray-800/50 rounded">
            <strong>Formato CSV esperado:</strong>
            <br />• Columnas: nombre, cedula, categoria, ticket_id
            <br />• La columna 'cedula' debe contener solo números
            <br />• La columna 'categoria' debe coincidir con los nombres de categorías existentes
            <br />• Si ticket_id está vacío, se generará automáticamente
            <br />• Se generará un código QR único para cada asistente
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            className="bg-dorado text-empresarial hover:bg-dorado/90"
            disabled={!csvData.length || !defaultCategoryId || !selectedEventId || isPending}
          >
            {isPending ? 'Procesando...' : `${updateExisting ? 'Actualizar/Insertar' : 'Importar'} ${csvData.length} Asistentes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
