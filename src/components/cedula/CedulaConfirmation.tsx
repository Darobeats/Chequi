import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, User } from 'lucide-react';
import type { CedulaData } from '@/types/cedula';

interface CedulaConfirmationProps {
  data: CedulaData;
  onConfirm: (data: CedulaData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CedulaConfirmation = ({ 
  data, 
  onConfirm, 
  onCancel,
  isLoading = false 
}: CedulaConfirmationProps) => {
  const [editedData, setEditedData] = useState<CedulaData>(data);

  const handleConfirm = () => {
    // Reconstruir nombre completo
    const nombreCompleto = `${editedData.nombres} ${editedData.primerApellido} ${editedData.segundoApellido}`.trim();
    onConfirm({ ...editedData, nombreCompleto });
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-dorado" />
          <CardTitle>Confirmar Datos de Cédula</CardTitle>
        </div>
        <CardDescription>
          Verifica que los datos extraídos sean correctos. Puedes editarlos si es necesario.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Número de Cédula */}
        <div className="space-y-2">
          <Label htmlFor="numero_cedula">Número de Cédula *</Label>
          <Input
            id="numero_cedula"
            value={editedData.numeroCedula}
            onChange={(e) => setEditedData({ ...editedData, numeroCedula: e.target.value })}
            placeholder="1234567890"
            className="font-mono"
          />
        </div>

        {/* Nombres */}
        <div className="space-y-2">
          <Label htmlFor="nombres">Nombres *</Label>
          <Input
            id="nombres"
            value={editedData.nombres}
            onChange={(e) => setEditedData({ ...editedData, nombres: e.target.value })}
            placeholder="JUAN CARLOS"
          />
        </div>

        {/* Primer Apellido */}
        <div className="space-y-2">
          <Label htmlFor="primer_apellido">Primer Apellido *</Label>
          <Input
            id="primer_apellido"
            value={editedData.primerApellido}
            onChange={(e) => setEditedData({ ...editedData, primerApellido: e.target.value })}
            placeholder="PÉREZ"
          />
        </div>

        {/* Segundo Apellido */}
        <div className="space-y-2">
          <Label htmlFor="segundo_apellido">Segundo Apellido</Label>
          <Input
            id="segundo_apellido"
            value={editedData.segundoApellido}
            onChange={(e) => setEditedData({ ...editedData, segundoApellido: e.target.value })}
            placeholder="GONZÁLEZ"
          />
        </div>

        {/* Fecha de Nacimiento */}
        {editedData.fechaNacimiento && (
          <div className="space-y-2">
            <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
            <Input
              id="fecha_nacimiento"
              value={editedData.fechaNacimiento}
              onChange={(e) => setEditedData({ ...editedData, fechaNacimiento: e.target.value })}
              placeholder="DD/MM/YYYY"
            />
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !editedData.numeroCedula || !editedData.nombres || !editedData.primerApellido}
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isLoading ? 'Registrando...' : 'Confirmar y Registrar'}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isLoading}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          * Campos obligatorios
        </p>
      </CardContent>
    </Card>
  );
};
