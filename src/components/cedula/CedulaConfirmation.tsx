import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, User, AlertTriangle, ShieldX, ShieldCheck, Building2, Tag } from 'lucide-react';
import type { CedulaData, CedulaAutorizada } from '@/types/cedula';

interface CedulaConfirmationProps {
  data: CedulaData;
  onConfirm: (data: CedulaData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDuplicate?: boolean;
  isUnauthorized?: boolean;
  autorizadaData?: CedulaAutorizada | null;
}

export const CedulaConfirmation = ({ 
  data, 
  onConfirm, 
  onCancel,
  isLoading = false,
  isDuplicate = false,
  isUnauthorized = false,
  autorizadaData = null
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
          {isUnauthorized ? (
            <ShieldX className="h-5 w-5 text-red-500" />
          ) : (
            <User className="h-5 w-5 text-dorado" />
          )}
          <CardTitle className={isUnauthorized ? 'text-red-500' : ''}>
            {isUnauthorized ? 'Cédula NO Autorizada' : 'Confirmar Datos de Cédula'}
          </CardTitle>
        </div>
        <CardDescription>
          {isUnauthorized 
            ? 'Esta cédula no está en la lista de autorizados'
            : 'Verifica que los datos extraídos sean correctos. Puedes editarlos si es necesario.'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Alerta de NO AUTORIZADO */}
        {isUnauthorized && (
          <Alert variant="destructive" className="border-red-500 bg-red-500/10">
            <ShieldX className="h-4 w-4" />
            <AlertDescription className="font-medium">
              <strong>ACCESO DENEGADO:</strong> Esta cédula NO está autorizada para acceder al evento.
              <br />
              <span className="text-sm opacity-80">
                El intento ha sido registrado. Contacta al administrador si esto es un error.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de duplicado */}
        {isDuplicate && !isUnauthorized && (
          <Alert variant="destructive" className="border-amber-500 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-500 font-medium">
              Esta cédula ya fue registrada anteriormente. Si confirmas, se actualizará el registro existente.
            </AlertDescription>
          </Alert>
        )}

        {/* Info de autorización (si está autorizado) */}
        {autorizadaData && !isUnauthorized && (
          <Alert className="border-green-500 bg-green-500/10">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              <strong>Cédula Autorizada</strong>
              {autorizadaData.categoria && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {autorizadaData.categoria}
                </span>
              )}
              {autorizadaData.empresa && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {autorizadaData.empresa}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Número de Cédula */}
        <div className="space-y-2">
          <Label htmlFor="numero_cedula">Número de Cédula *</Label>
          <Input
            id="numero_cedula"
            value={editedData.numeroCedula}
            onChange={(e) => setEditedData({ ...editedData, numeroCedula: e.target.value })}
            placeholder="1234567890"
            className={`font-mono ${isUnauthorized ? 'border-red-500/50' : ''}`}
            disabled={isUnauthorized}
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
            disabled={isUnauthorized}
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
            disabled={isUnauthorized}
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
            disabled={isUnauthorized}
          />
        </div>

        {/* Fecha de Nacimiento */}
        {editedData.fechaNacimiento && !isUnauthorized && (
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
          {isUnauthorized ? (
            <Button
              onClick={onCancel}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Escanear Otra Cédula
            </Button>
          ) : (
            <>
              <Button
                onClick={handleConfirm}
                disabled={isLoading || !editedData.numeroCedula || !editedData.nombres || !editedData.primerApellido}
                className="flex-1"
                variant={isDuplicate ? "secondary" : "default"}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isLoading ? 'Registrando...' : isDuplicate ? 'Actualizar Registro' : 'Confirmar y Registrar'}
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
            </>
          )}
        </div>

        {!isUnauthorized && (
          <p className="text-xs text-muted-foreground text-center">
            * Campos obligatorios
          </p>
        )}
      </CardContent>
    </Card>
  );
};
