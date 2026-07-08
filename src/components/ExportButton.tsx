import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEventContext } from '@/context/EventContext';
import { saveAs } from 'file-saver';

const ExportButton: React.FC = () => {
  const { selectedEvent } = useEventContext();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!selectedEvent?.id) {
      toast.error('Selecciona un evento primero');
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sesión no válida');

      const url = `${(supabase as any).supabaseUrl}/functions/v1/export-attendees-report`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': (supabase as any).supabaseKey,
        },
        body: JSON.stringify({ event_id: selectedEvent.id }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const safeName = (selectedEvent.event_name || 'evento').replace(/[^a-z0-9]+/gi, '_');
      const ts = new Date().toISOString().split('T')[0];
      saveAs(blob, `reporte_asistentes_${safeName}_${ts}.xlsx`);
      toast.success('Reporte generado en servidor y descargado');
    } catch (err: any) {
      console.error('[ExportButton] error:', err);
      toast.error(err?.message || 'No se pudo generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} className="bg-dorado text-empresarial hover:bg-dorado/90">
      {loading ? (
        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando en servidor…</>
      ) : (
        <><Download className="h-4 w-4 mr-2" /> Exportar Asistentes (Excel)</>
      )}
    </Button>
  );
};

export default ExportButton;
