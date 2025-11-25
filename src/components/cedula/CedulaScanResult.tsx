import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Calendar, MapPin, Droplet } from 'lucide-react';
import type { CedulaData } from '@/types/cedula';

interface CedulaScanResultProps {
  data: CedulaData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CedulaScanResult({ data, onConfirm, onCancel, isLoading }: CedulaScanResultProps) {
  return (
    <Card className="p-6 border-primary/50 bg-primary/5">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold">Cédula Escaneada</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Nombre Completo</p>
              <p className="font-semibold text-lg">{data.nombreCompleto}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Número de Cédula</p>
              <p className="font-medium">{data.numeroCedula}</p>
            </div>
            
            {data.fechaNacimiento && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                  <p className="font-medium text-sm">{data.fechaNacimiento}</p>
                </div>
              </div>
            )}

            {data.sexo && (
              <div>
                <p className="text-sm text-muted-foreground">Sexo</p>
                <p className="font-medium">{data.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
              </div>
            )}

            {data.rh && (
              <div className="flex items-start gap-2">
                <Droplet className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">RH</p>
                  <p className="font-medium">{data.rh}</p>
                </div>
              </div>
            )}

            {data.lugarExpedicion && (
              <div className="flex items-start gap-2 col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Lugar de Expedición</p>
                  <p className="font-medium">{data.lugarExpedicion}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={onConfirm} 
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : 'Confirmar y Guardar'}
          </Button>
          <Button 
            onClick={onCancel} 
            variant="outline" 
            className="flex-1"
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  );
}
