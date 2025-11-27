import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CedulaScanner } from '@/components/cedula/CedulaScanner';
import { CedulaConfirmation } from '@/components/cedula/CedulaConfirmation';
import { CedulaRegistrosList } from '@/components/cedula/CedulaRegistrosList';
import { CedulaExportButton } from '@/components/cedula/CedulaExportButton';
import { useCedulaRegistros, useCreateCedulaRegistro, useCedulaStats } from '@/hooks/useCedulaRegistros';
import { useActiveEventConfig } from '@/hooks/useEventConfig';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import type { CedulaData, InsertCedulaRegistro } from '@/types/cedula';
import { ArrowLeft, IdCard, TrendingUp } from 'lucide-react';

export default function CedulaRegistro() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { data: activeEvent } = useActiveEventConfig();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(activeEvent?.id || null);
  const [pendingScan, setPendingScan] = useState<CedulaData | null>(null);

  const { data: registros = [], isLoading } = useCedulaRegistros(selectedEventId);
  const { data: stats } = useCedulaStats(selectedEventId);
  const createMutation = useCreateCedulaRegistro();

  // Verificar si la cédula pendiente ya está registrada
  const isDuplicate = useMemo(() => {
    if (!pendingScan?.numeroCedula || registros.length === 0) return false;
    return registros.some(r => r.numero_cedula === pendingScan.numeroCedula);
  }, [pendingScan?.numeroCedula, registros]);

  const handleScanSuccess = (data: CedulaData) => {
    setPendingScan(data);
  };

  const handleConfirmScan = async (data: CedulaData) => {
    if (!selectedEventId) return;

    const registro: InsertCedulaRegistro = {
      event_id: selectedEventId,
      numero_cedula: data.numeroCedula,
      primer_apellido: data.primerApellido,
      segundo_apellido: data.segundoApellido,
      nombres: data.nombres,
      fecha_nacimiento: data.fechaNacimiento || undefined,
      sexo: data.sexo || undefined,
      rh: data.rh || undefined,
      lugar_expedicion: data.lugarExpedicion || undefined,
      fecha_expedicion: data.fechaExpedicion || undefined,
      raw_data: data.rawData,
      scanned_by: user?.id,
      device_info: navigator.userAgent,
    };

    await createMutation.mutateAsync(registro);
    setPendingScan(null);
  };

  const handleCancelScan = () => {
    setPendingScan(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/scanner')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Scanner
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <IdCard className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Registro de Cédulas</h1>
          </div>
          <p className="text-muted-foreground">
            Captura cédulas colombianas con IA para registro automático
          </p>
        </div>

        {/* Selector de Evento */}
        {!activeEvent && (
          <Card className="p-4 mb-6">
            <label className="block text-sm font-medium mb-2">Seleccionar Evento</label>
            <Select value={selectedEventId || ''} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Evento Actual</SelectItem>
              </SelectContent>
            </Select>
          </Card>
        )}

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Registros</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <IdCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hoy</p>
                  <p className="text-2xl font-bold">{stats.today}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-center">
              <CedulaExportButton 
                registros={registros}
                eventName={activeEvent?.event_name || 'Evento'}
              />
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner */}
          <div>
            {pendingScan ? (
              <CedulaConfirmation
                data={pendingScan}
                onConfirm={handleConfirmScan}
                onCancel={handleCancelScan}
                isLoading={createMutation.isPending}
                isDuplicate={isDuplicate}
              />
            ) : (
              <CedulaScanner
                onScanSuccess={handleScanSuccess}
                isActive={!pendingScan}
              />
            )}
          </div>

          {/* Lista de Registros */}
          <div>
            <CedulaRegistrosList 
              registros={registros}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Sistema de Control de Acceso. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}