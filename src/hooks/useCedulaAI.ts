import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CedulaData } from '@/types/cedula';

interface CedulaAIResponse {
  success: boolean;
  data?: {
    numero_cedula: string;
    nombres: string;
    primer_apellido: string;
    segundo_apellido?: string;
    fecha_nacimiento?: string;
  };
  error?: string;
}

export const useCedulaAI = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeCedula = async (imageBase64: string): Promise<CedulaData | null> => {
    setIsAnalyzing(true);
    try {
      console.log('Enviando imagen a IA para análisis...');
      
      const { data, error } = await supabase.functions.invoke<CedulaAIResponse>('scan-cedula-ai', {
        body: { image: imageBase64 }
      });

      if (error) {
        console.error('Error invocando función:', error);
        throw new Error(error.message || 'Error al analizar la cédula');
      }

      if (!data?.success || !data.data) {
        throw new Error(data?.error || 'No se pudieron extraer los datos');
      }

      console.log('Datos extraídos por IA:', data.data);

      // Convertir al formato CedulaData
      const cedulaData: CedulaData = {
        numeroCedula: data.data.numero_cedula,
        nombres: data.data.nombres,
        primerApellido: data.data.primer_apellido,
        segundoApellido: data.data.segundo_apellido || '',
        nombreCompleto: `${data.data.nombres} ${data.data.primer_apellido} ${data.data.segundo_apellido || ''}`.trim(),
        fechaNacimiento: data.data.fecha_nacimiento || null,
        sexo: null,
        rh: null,
        lugarExpedicion: null,
        fechaExpedicion: null,
        rawData: JSON.stringify(data.data)
      };

      toast.success('Datos extraídos correctamente');
      return cedulaData;

    } catch (error) {
      console.error('Error al analizar cédula:', error);
      toast.error(error instanceof Error ? error.message : 'Error al analizar la cédula');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeCedula,
    isAnalyzing
  };
};
