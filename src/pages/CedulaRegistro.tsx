import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CedulaScanner } from '@/components/cedula/CedulaScanner';
import { CedulaConfirmation } from '@/components/cedula/CedulaConfirmation';
import { CedulaRegistrosList } from '@/components/cedula/CedulaRegistrosList';
import { CedulaExportButton } from '@/components/cedula/CedulaExportButton';
import { useCedulaRegistros, useCreateCedulaRegistro, useCedulaStats } from '@/hooks/useCedulaRegistros';
import { useEventContext } from '@/context/EventContext';
import { useEventWhitelistConfig } from '@/hooks/useEventWhitelistConfig';
import { useCheckCedulaAuthorization, useCreateAccessLog } from '@/hooks/useCedulasAutorizadas';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import type { CedulaData, InsertCedulaRegistro, CedulaAutorizada } from '@/types/cedula';
import { ArrowLeft, IdCard, TrendingUp, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Convierte DD/MM/YYYY a YYYY-MM-DD (formato ISO para PostgreSQL)
const convertDateToISO = (dateStr: string | null | undefined): string | undefined => {
  if (!dateStr) return undefined;
  
  // Intentar parsear DD/MM/YYYY
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si ya está en formato ISO, retornar como está
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  
  // Si no se puede parsear, no enviar fecha
  console.warn('Formato de fecha no reconocido:', dateStr);
  return undefined;
};

export default function CedulaRegistro() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { selectedEvent } = useEventContext();
  const { data: whitelistConfig } = useEventWhitelistConfig();
  const [pendingScan, setPendingScan] = useState<CedulaData | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [autorizadaData, setAutorizadaData] = useState<CedulaAutorizada | null>(null);

  const eventId = selectedEvent?.id || null;
  const { data: registros = [], isLoading } = useCedulaRegistros(eventId);
  const { data: stats } = useCedulaStats(eventId);
  const createMutation = useCreateCedulaRegistro();
  const createAccessLog = useCreateAccessLog();
  const checkAuthorization = useCheckCedulaAuthorization(eventId);

  // Verificar si la cédula pendiente ya está registrada
  const isDuplicate = useMemo(() => {
    if (!pendingScan?.numeroCedula || registros.length === 0) return false;
    return registros.some(r => r.numero_cedula === pendingScan.numeroCedula);
  }, [pendingScan?.numeroCedula, registros]);

  const handleScanSuccess = async (data: CedulaData) => {
    setIsUnauthorized(false);
    setAutorizadaData(null);
    
    // Si la lista blanca está activa, verificar autorización
    if (whitelistConfig?.requireWhitelist && eventId) {
      const autorizada = await checkAuthorization(data.numeroCedula);
      
      if (!autorizada) {
        // Cédula NO autorizada - registrar intento y bloquear
        setIsUnauthorized(true);
        setPendingScan(data);
        
        // Registrar intento de acceso denegado
        await createAccessLog.mutateAsync({
          event_id: eventId,
          numero_cedula: data.numeroCedula,
          nombre_detectado: data.nombreCompleto,
          access_result: 'denied',
          denial_reason: 'Cédula no autorizada en lista blanca',
          scanned_by: user?.id,
          device_info: navigator.userAgent,
        });
        
        return;
      }
      
      // Cédula autorizada - guardar datos para mostrar en confirmación
      setAutorizadaData(autorizada);
    }
    
    setPendingScan(data);
  };

  const handleConfirmScan = async (data: CedulaData) => {
    if (!eventId) return;

    const registro: InsertCedulaRegistro = {
      event_id: eventId,
      numero_cedula: data.numeroCedula,
      primer_apellido: data.primerApellido,
      segundo_apellido: data.segundoApellido,
      nombres: data.nombres,
      fecha_nacimiento: convertDateToISO(data.fechaNacimiento),
      sexo: data.sexo || undefined,
      rh: data.rh || undefined,
      lugar_expedicion: data.lugarExpedicion || undefined,
      fecha_expedicion: convertDateToISO(data.fechaExpedicion),
      raw_data: data.rawData,
      scanned_by: user?.id,
      device_info: navigator.userAgent,
    };

    await createMutation.mutateAsync(registro);
    setPendingScan(null);
    setIsUnauthorized(false);
    setAutorizadaData(null);
  };

  const handleCancelScan = () => {
    setPendingScan(null);
    setIsUnauthorized(false);
    setAutorizadaData(null);
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
            {whitelistConfig?.requireWhitelist && (
              <Badge variant="outline" className="border-amber-500 text-amber-500">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Lista Blanca Activa
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Captura cédulas colombianas con IA para registro automático
          </p>
        </div>

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
                eventName={selectedEvent?.event_name || 'Evento'}
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
                isUnauthorized={isUnauthorized}
                autorizadaData={autorizadaData}
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
