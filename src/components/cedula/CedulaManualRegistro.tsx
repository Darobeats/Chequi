import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCedulaRegistro } from '@/hooks/useCedulaRegistros';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface CedulaManualRegistroProps {
  eventId: string;
}

export function CedulaManualRegistro({ eventId }: CedulaManualRegistroProps) {
  const [open, setOpen] = useState(false);
  const [numeroCedula, setNumeroCedula] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useSupabaseAuth();
  const createRegistro = useCreateCedulaRegistro();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cedulaTrimmed = numeroCedula.trim().replace(/\D/g, '');
    const nombreTrimmed = nombreCompleto.trim();
    
    // Validaciones
    if (cedulaTrimmed.length < 6 || cedulaTrimmed.length > 15) {
      toast.error('La cédula debe tener entre 6 y 15 dígitos');
      return;
    }
    
    if (nombreTrimmed.length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Intentar separar nombre en partes (básico)
      const parts = nombreTrimmed.split(' ').filter(p => p.length > 0);
      let primerApellido = '';
      let nombres = nombreTrimmed;
      
      if (parts.length >= 2) {
        // Asumimos: últimas 1-2 palabras son apellidos
        primerApellido = parts[parts.length - 1];
        nombres = parts.slice(0, -1).join(' ');
      }

      await createRegistro.mutateAsync({
        event_id: eventId,
        numero_cedula: cedulaTrimmed,
        primer_apellido: primerApellido || nombreTrimmed.split(' ')[0],
        nombres: nombres,
        raw_data: 'MANUAL_ENTRY',
        scanned_by: user?.id,
        device_info: `MANUAL - ${navigator.userAgent}`,
      });
      
      // Limpiar y cerrar
      setNumeroCedula('');
      setNombreCompleto('');
      setOpen(false);
    } catch (error) {
      // El hook ya muestra el toast de error
      console.error('Error en registro manual:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir números
    const value = e.target.value.replace(/\D/g, '');
    setNumeroCedula(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-dorado/50 text-dorado hover:bg-dorado/10">
          <UserPlus className="h-4 w-4 mr-2" />
          Agregar Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-empresarial border-gray-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-dorado">Registro Manual de Cédula</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="cedula" className="text-hueso">
              Número de Cédula <span className="text-red-400">*</span>
            </Label>
            <Input
              id="cedula"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 1234567890"
              value={numeroCedula}
              onChange={handleCedulaChange}
              className="bg-gray-900/50 border-gray-700 text-hueso placeholder:text-hueso/40"
              maxLength={15}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-hueso">
              Nombre Completo <span className="text-red-400">*</span>
            </Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Juan Carlos Pérez García"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="bg-gray-900/50 border-gray-700 text-hueso placeholder:text-hueso/40"
              maxLength={100}
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setOpen(false)}
              className="text-hueso hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-dorado text-empresarial hover:bg-dorado/90"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
