import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  Download, 
  Eye,
  User,
  Clock,
  Settings
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface DetailedDataTableProps {
  data: Array<{
    id: string;
    used_at: string;
    attendee?: {
      name: string;
      ticket_id: string;
      ticket_category?: { name: string; color?: string };
    };
    control_type?: {
      name: string;
      color?: string;
    };
    device?: string;
    notes?: string;
  }>;
}

const DetailedDataTable: React.FC<DetailedDataTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.attendee?.name?.toLowerCase().includes(searchLower) ||
      item.attendee?.ticket_id?.toLowerCase().includes(searchLower) ||
      item.control_type?.name?.toLowerCase().includes(searchLower) ||
      item.attendee?.ticket_category?.name?.toLowerCase().includes(searchLower) ||
      item.device?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleExport = () => {
    // Here you would implement export functionality
    console.log('Exporting data...', filteredData);
  };

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Registros Detallados
            <Badge variant="outline" className="text-xs">
              {filteredData.length} de {data.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Exportar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, ticket, control, categoría..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">
                  <User className="h-4 w-4 inline mr-2" />
                  Asistente
                </TableHead>
                <TableHead className="text-foreground">Categoría</TableHead>
                <TableHead className="text-foreground">
                  <Settings className="h-4 w-4 inline mr-2" />
                  Control
                </TableHead>
                <TableHead className="text-foreground">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Fecha/Hora
                </TableHead>
                <TableHead className="text-foreground">Dispositivo</TableHead>
                <TableHead className="text-foreground">Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={item.id} className="hover:bg-background/50">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {item.attendee?.name || 'Desconocido'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.attendee?.ticket_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.attendee?.ticket_category && (
                      <Badge 
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: item.attendee.ticket_category.color + '20',
                          borderColor: item.attendee.ticket_category.color
                        }}
                      >
                        {item.attendee.ticket_category.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.control_type?.color && (
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.control_type.color }}
                        />
                      )}
                      <span className="capitalize text-foreground">
                        {item.control_type?.name || 'Desconocido'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-foreground">
                        {format(parseISO(item.used_at), 'dd/MM/yyyy', { locale: es })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(item.used_at), 'HH:mm:ss', { locale: es })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {item.device || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {item.notes || '-'}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron registros que coincidan con tu búsqueda
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} de {filteredData.length} registros
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DetailedDataTable;