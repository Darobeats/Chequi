
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTicketCategories } from '@/hooks/useSupabaseData';
import { useBulkCreateAttendees } from '@/hooks/useAttendeeManagement';
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
  const [csvData, setCsvData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useTicketCategories();
  const bulkCreateMutation = useBulkCreateAttendees();

  const downloadTemplate = () => {
    const csvContent = 'nombre,email,categoria,ticket_id\n' +
                      'Juan Pérez,juan@ejemplo.com,basico,\n' +
                      'María García,maria@ejemplo.com,premium,\n' +
                      'Carlos López,carlos@ejemplo.com,vip,';
    
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
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
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

    try {
      const attendeesData = csvData.map(row => {
        // Find category by name or use default
        let categoryId = defaultCategoryId;
        if (row.categoria) {
          const category = categories.find(cat => 
            cat.name.toLowerCase() === row.categoria.toLowerCase()
          );
          if (category) categoryId = category.id;
        }

        if (!categoryId) {
          throw new Error('Debe seleccionar una categoría por defecto o especificar categorías válidas en el CSV');
        }

        return {
          name: row.nombre || '',
          email: row.email || null,
          category_id: categoryId,
          ticket_id: row.ticket_id || generateTicketId()
        };
      });

      await bulkCreateMutation.mutateAsync(attendeesData);
      
      toast.success(`${attendeesData.length} asistentes importados correctamente`, {
        description: 'Se han generado códigos QR automáticamente para todos los asistentes'
      });
      
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSelectedFile(null);
      setCsvData([]);
      setDefaultCategoryId('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error('Error al importar asistentes', {
        description: error.message
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
                    {row.nombre} - {row.email}
                  </div>
                ))}
                {csvData.length > 5 && <div>... y {csvData.length - 5} más</div>}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-400 p-3 bg-gray-800/50 rounded">
            <strong>Formato CSV esperado:</strong>
            <br />• Columnas: nombre, email, categoria, ticket_id
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
            disabled={!csvData.length || !defaultCategoryId || bulkCreateMutation.isPending}
          >
            {bulkCreateMutation.isPending ? 'Importando...' : `Importar ${csvData.length} Asistentes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
