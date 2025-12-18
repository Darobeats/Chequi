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
  rowNumber: number;
  numero_cedula: string;
  nombre_completo?: string;
  categoria?: string;
  empresa?: string;
  valid: boolean;
  error?: string;
}

interface OmittedRow {
  rowNumber: number;
  reason: string;
}

export function CedulasBulkImport({ eventId, onComplete }: CedulasBulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [omittedRows, setOmittedRows] = useState<OmittedRow[]>([]);
  const [totalExcelRows, setTotalExcelRows] = useState(0);
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
    setOmittedRows([]);
    
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
      
      setTotalExcelRows(jsonData.length - 1); // Minus header row
      
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
      const omitted: OmittedRow[] = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const excelRowNum = i + 1; // Excel rows are 1-indexed, plus header
        
        if (!row || row.length === 0) {
          omitted.push({ rowNumber: excelRowNum, reason: 'Fila completamente vacía' });
          continue;
        }
        
        const rawCedula = row[cedulaIndex];
        if (rawCedula === undefined || rawCedula === null || String(rawCedula).trim() === '') {
          omitted.push({ rowNumber: excelRowNum, reason: 'Cédula vacía o no definida' });
          continue;
        }
        
        const cedula = String(rawCedula).replace(/\D/g, '').trim();
        
        if (!cedula) {
          omitted.push({ rowNumber: excelRowNum, reason: `Cédula sin números válidos: "${rawCedula}"` });
          continue;
        }
        
        const isValid = validateCedula(cedula);
        
        rows.push({
          rowNumber: excelRowNum,
          numero_cedula: cedula,
          nombre_completo: nombreIndex >= 0 ? String(row[nombreIndex] || '').trim() : undefined,
          categoria: categoriaIndex >= 0 ? String(row[categoriaIndex] || '').trim() : undefined,
          empresa: empresaIndex >= 0 ? String(row[empresaIndex] || '').trim() : undefined,
          valid: isValid,
          error: isValid ? undefined : `Formato inválido (${cedula.length} dígitos, se requieren 6-15)`,
        });
      }
      
      if (rows.length === 0) {
        setError('No se encontraron datos válidos en el archivo');
        setParsing(false);
        return;
      }
      
      setParsedData(rows);
      setOmittedRows(omitted);
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
            {/* Resumen detallado */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 space-y-2">
              <div className="text-sm text-hueso/80">
                <strong>Resumen del archivo:</strong>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-hueso/60">Filas en Excel</div>
                  <div className="text-hueso font-semibold">{totalExcelRows}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-hueso/60">Procesadas</div>
                  <div className="text-hueso font-semibold">{parsedData.length}</div>
                </div>
                <div className="bg-green-900/30 rounded p-2">
                  <div className="text-green-400/80">Válidas</div>
                  <div className="text-green-400 font-semibold">{validCount}</div>
                </div>
                <div className="bg-amber-900/30 rounded p-2">
                  <div className="text-amber-400/80">Omitidas</div>
                  <div className="text-amber-400 font-semibold">{omittedRows.length}</div>
                </div>
              </div>
            </div>

            {/* Filas omitidas */}
            {omittedRows.length > 0 && (
              <Alert className="bg-amber-900/20 border-amber-600/50">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-200 text-sm">
                  <strong>{omittedRows.length} filas omitidas:</strong>
                  <ul className="mt-1 list-disc list-inside max-h-24 overflow-auto">
                    {omittedRows.slice(0, 10).map((row, idx) => (
                      <li key={idx}>Fila {row.rowNumber}: {row.reason}</li>
                    ))}
                    {omittedRows.length > 10 && (
                      <li className="text-amber-400">... y {omittedRows.length - 10} más</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Tabla de preview */}
            <div className="max-h-48 overflow-auto border border-gray-800 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-900/80">
                    <TableHead className="text-dorado w-16">Fila</TableHead>
                    <TableHead className="text-dorado w-12">Estado</TableHead>
                    <TableHead className="text-dorado">Cédula</TableHead>
                    <TableHead className="text-dorado">Nombre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx} className={row.valid ? '' : 'bg-red-900/20'}>
                      <TableCell className="text-hueso/60 text-xs">{row.rowNumber}</TableCell>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <span title={row.error}>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-hueso text-sm">{row.numero_cedula}</TableCell>
                      <TableCell className="text-hueso text-sm truncate max-w-32">{row.nombre_completo || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {parsedData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-hueso/60 text-sm">
                        ... y {parsedData.length - 10} registros más
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
