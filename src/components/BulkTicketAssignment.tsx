import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAttendees, useTicketCategories } from '@/hooks/useSupabaseData';
import { useUpdateAttendee } from '@/hooks/useAttendeeManagement';
import { toast } from '@/components/ui/sonner';
import { Users, Save, Filter } from 'lucide-react';

const BulkTicketAssignment: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [attendeesToUpdate, setAttendeesToUpdate] = useState<string[]>([]);
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);

  const { data: attendees = [], isLoading: attendeesLoading } = useAttendees();
  const { data: categories = [] } = useTicketCategories();
  const updateMutation = useUpdateAttendee();

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Sin categoría';
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.color || '#6B7280';
  };

  const filteredAttendees = showOnlyUnassigned 
    ? attendees.filter(attendee => !attendee.category_id || attendee.category_id === '')
    : attendees;

  const handleSelectAttendee = (attendeeId: string, selected: boolean) => {
    if (selected) {
      setAttendeesToUpdate(prev => [...prev, attendeeId]);
    } else {
      setAttendeesToUpdate(prev => prev.filter(id => id !== attendeeId));
    }
  };

  const handleSelectAll = () => {
    if (attendeesToUpdate.length === filteredAttendees.length) {
      setAttendeesToUpdate([]);
    } else {
      setAttendeesToUpdate(filteredAttendees.map(a => a.id));
    }
  };

  const handleBulkUpdate = async () => {
    if (!selectedCategoryId) {
      toast.error('Selecciona una categoría de ticket');
      return;
    }

    if (attendeesToUpdate.length === 0) {
      toast.error('Selecciona al menos un asistente');
      return;
    }

    try {
      const categoryName = getCategoryName(selectedCategoryId);
      
      // Update each attendee sequentially to avoid concurrency issues
      for (const attendeeId of attendeesToUpdate) {
        await updateMutation.mutateAsync({
          id: attendeeId,
          category_id: selectedCategoryId
        });
      }

      toast.success(`Categoría actualizada exitosamente`, {
        description: `${attendeesToUpdate.length} asistentes asignados a la categoría ${categoryName}`
      });

      // Reset selections
      setAttendeesToUpdate([]);
      setSelectedCategoryId('');
      
    } catch (error: any) {
      console.error('Bulk update error:', error);
      toast.error('Error al actualizar asistentes', {
        description: error.message || 'Error desconocido'
      });
    }
  };

  if (attendeesLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <p className="text-hueso">Cargando asistentes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-dorado flex items-center gap-2">
          <Users className="w-5 h-5" />
          Asignación Masiva de Tipos de Ticket
        </CardTitle>
        <p className="text-gray-400">
          Asigna categorías de ticket a múltiples asistentes de forma masiva
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-hueso">
                <SelectValue placeholder="Selecciona una categoría de ticket" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="capitalize">{category.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={() => setShowOnlyUnassigned(!showOnlyUnassigned)}
            variant="outline"
            className="border-gray-700"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showOnlyUnassigned ? 'Mostrar Todos' : 'Solo Sin Categoría'}
          </Button>
          
          <Button
            onClick={handleBulkUpdate}
            disabled={!selectedCategoryId || attendeesToUpdate.length === 0 || updateMutation.isPending}
            className="bg-dorado text-empresarial hover:bg-dorado/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending 
              ? 'Actualizando...' 
              : `Asignar a ${attendeesToUpdate.length} Asistentes`
            }
          </Button>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Total asistentes: {filteredAttendees.length}</span>
          <span>Seleccionados: {attendeesToUpdate.length}</span>
        </div>

        {/* Table */}
        <div className="border border-gray-800 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="bg-gray-900 sticky top-0">
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={attendeesToUpdate.length === filteredAttendees.length && filteredAttendees.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-600 bg-gray-800"
                  />
                </TableHead>
                <TableHead className="text-hueso">Nombre</TableHead>
                <TableHead className="text-hueso">Cédula</TableHead>
                <TableHead className="text-hueso">Categoría Actual</TableHead>
                <TableHead className="text-hueso">Ticket ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.map((attendee) => (
                <TableRow key={attendee.id} className="border-gray-800">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={attendeesToUpdate.includes(attendee.id)}
                      onChange={(e) => handleSelectAttendee(attendee.id, e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800"
                    />
                  </TableCell>
                  <TableCell className="text-hueso font-medium">
                    {attendee.name}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {(attendee as any).cedula || 'Sin cédula'}
                  </TableCell>
                  <TableCell>
                    {attendee.category_id ? (
                      <Badge 
                        variant="secondary" 
                        style={{ backgroundColor: `${getCategoryColor(attendee.category_id)}20`, color: getCategoryColor(attendee.category_id) }}
                      >
                        {getCategoryName(attendee.category_id)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500 text-red-400">
                        Sin categoría
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-400 font-mono text-sm">
                    {attendee.ticket_id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredAttendees.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay asistentes {showOnlyUnassigned ? 'sin categoría' : 'disponibles'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkTicketAssignment;