import { useState, useCallback } from 'react';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBulkCreateCedulasAutorizadas } from '@/hooks/useCedulasAutorizadas';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CedulasBulkImportProps {
  eventId: string;
  onComplete: () => void;
}

interface ParsedRow {
  numero_cedula: string;
  nombre_completo?: string;
  categoria?: string;
  empresa?: string;
  valid: boolean;
  error?: string;
}

export function CedulasBulkImport({ eventId, onComplete }: CedulasBulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const bulkCreate = useBulkCreateCedulasAutorizadas();
  
  const validateCedula = (cedula: string): boolean => {
    const cleaned = cedula.replace(/\D/g, '');
    return cleaned.length >= 6 && cleaned.length <= 15;
  };
  
  const parseFile = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length < 2) {
        setError('El archivo debe tener al menos una fila de encabezados y una de datos');
        setParsing(false);
        return;
      }
      
      // Detectar columnas por encabezado
      const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
      
      const cedulaIndex = headers.findIndex(h => 
        h.includes('cedula') || h.includes('cédula') || h.includes('documento') || h.includes('id')
      );
      const nombreIndex = headers.findIndex(h => 
        h.includes('nombre') || h.includes('name')
      );
      const categoriaIndex = headers.findIndex(h => 
        h.includes('categoria') || h.includes('categoría') || h.includes('tipo') || h.includes('type')
      );
      const empresaIndex = headers.findIndex(h => 
        h.includes('empresa') || h.includes('company') || h.includes('organización')
      );
      
      if (cedulaIndex === -1) {
        setError('No se encontró una columna de cédula. Asegúrate de tener un encabezado como "cedula", "cédula" o "documento"');
        setParsing(false);
        return;
      }
      
      const rows: ParsedRow[] = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        const cedula = String(row[cedulaIndex] || '').replace(/\D/g, '').trim();
        
        if (!cedula) continue;
        
        const isValid = validateCedula(cedula);
        
        rows.push({
          numero_cedula: cedula,
          nombre_completo: nombreIndex >= 0 ? String(row[nombreIndex] || '').trim() : undefined,
          categoria: categoriaIndex >= 0 ? String(row[categoriaIndex] || '').trim() : undefined,
          empresa: empresaIndex >= 0 ? String(row[empresaIndex] || '').trim() : undefined,
          valid: isValid,
          error: isValid ? undefined : 'Formato de cédula inválido',
        });
      }
      
      if (rows.length === 0) {
        setError('No se encontraron datos válidos en el archivo');
        setParsing(false);
        return;
      }
      
      setParsedData(rows);
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Error al procesar el archivo. Asegúrate de que sea un archivo Excel (.xlsx) o CSV válido');
    } finally {
      setParsing(false);
    }
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      parseFile(selectedFile);
    }
  };
  
  const handleImport = async () => {
    const validRows = parsedData.filter(r => r.valid);
    if (validRows.length === 0) return;
    
    const cedulas = validRows.map(r => ({
      numero_cedula: r.numero_cedula,
      nombre_completo: r.nombre_completo,
      categoria: r.categoria,
      empresa: r.empresa,
    }));
    
    await bulkCreate.mutateAsync({ eventId, cedulas });
    onComplete();
  };
  
  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-dorado flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Cédulas desde Excel
        </DialogTitle>
        <DialogDescription className="text-hueso/80">
          Sube un archivo Excel o CSV con las cédulas autorizadas
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        {/* Formato esperado */}
        <Alert className="bg-gray-900/50 border-gray-700">
          <AlertDescription className="text-hueso/80 text-sm">
            <strong>Formato esperado:</strong> El archivo debe tener columnas con encabezados. 
            La columna de cédula es obligatoria (puede llamarse "cedula", "cédula" o "documento").
            <br />
            Columnas opcionales: nombre, categoria, empresa
          </AlertDescription>
        </Alert>
        
        {/* Input de archivo */}
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="bg-gray-900/50 border-gray-700 text-hueso"
          />
        </div>
        
        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Preview de datos */}
        {parsedData.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                {validCount} válidos
              </span>
              {invalidCount > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  {invalidCount} inválidos
                </span>
              )}
            </div>
            
            <div className="max-h-64 overflow-auto border border-gray-800 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-900/80">
                    <TableHead className="text-dorado">Estado</TableHead>
                    <TableHead className="text-dorado">Cédula</TableHead>
                    <TableHead className="text-dorado">Nombre</TableHead>
                    <TableHead className="text-dorado">Categoría</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx} className={row.valid ? '' : 'bg-red-900/20'}>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-hueso">{row.numero_cedula}</TableCell>
                      <TableCell className="text-hueso">{row.nombre_completo || '-'}</TableCell>
                      <TableCell className="text-hueso">{row.categoria || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {parsedData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-hueso/60 text-sm">
                        ... y {parsedData.length - 10} más
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onComplete}>
          Cancelar
        </Button>
        <Button
          onClick={handleImport}
          disabled={validCount === 0 || bulkCreate.isPending}
          className="bg-dorado text-empresarial hover:bg-dorado/90"
        >
          {bulkCreate.isPending ? 'Importando...' : `Importar ${validCount} cédulas`}
        </Button>
      </DialogFooter>
    </>
  );
}
