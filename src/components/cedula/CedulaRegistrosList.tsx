import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, User } from 'lucide-react';
import { useState } from 'react';
import type { CedulaRegistro } from '@/types/cedula';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CedulaRegistrosListProps {
  registros: CedulaRegistro[];
  isLoading: boolean;
}

export function CedulaRegistrosList({ registros, isLoading }: CedulaRegistrosListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRegistros = registros.filter(r => 
    r.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.numero_cedula.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Registros ({filteredRegistros.length})
          </h3>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cédula</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Fecha de Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'No se encontraron registros' : 'No hay registros aún'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegistros.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="font-mono">{registro.numero_cedula}</TableCell>
                    <TableCell className="font-medium">{registro.nombre_completo}</TableCell>
                    <TableCell>
                      {registro.sexo ? (registro.sexo === 'M' ? 'M' : 'F') : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(registro.scanned_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}
