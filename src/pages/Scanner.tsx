import React, { useState } from "react";
import Header from "@/components/Header";
import QRScanner from "@/components/QRScanner";
import { CedulaScanner } from "@/components/cedula/CedulaScanner";
import { CedulaScanResult } from "@/components/cedula/CedulaScanResult";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateCedulaRegistro } from "@/hooks/useCedulaRegistros";
import { useEventContext } from "@/context/EventContext";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { useControlTypes } from "@/hooks/useSupabaseData";
import { useEventWhitelistConfigById } from "@/hooks/useEventWhitelistConfig";
import { useCheckCedulaAuthorization, useCreateAccessLog } from "@/hooks/useCedulasAutorizadas";
import ControlTypeSelector from "@/components/scanner/ControlTypeSelector";
import type { CedulaData, CedulaAutorizada, InsertCedulaRegistro } from "@/types/cedula";
import { QrCode, IdCard } from "lucide-react";

// Convert DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
const convertDateToISO = (dateStr: string | null | undefined): string | undefined => {
  if (!dateStr) return undefined;
  // Try DD/MM/YYYY format
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Already in ISO format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  return undefined;
};

const Scanner = () => {
  const { user } = useSupabaseAuth();
  const { selectedEvent } = useEventContext();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [pendingScan, setPendingScan] = useState<CedulaData | null>(null);
  const [selectedControlType, setSelectedControlType] = useState<string>("");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [autorizadaData, setAutorizadaData] = useState<CedulaAutorizada | null>(null);
  
  const createCedulaMutation = useCreateCedulaRegistro();
  const { data: controlTypes = [], isLoading: controlTypesLoading } = useControlTypes();
  const { data: whitelistConfig } = useEventWhitelistConfigById(selectedEvent?.id || null);
  const checkAuthorization = useCheckCedulaAuthorization(selectedEvent?.id || null);
  const createAccessLog = useCreateAccessLog();

  const handleCedulaScanSuccess = async (data: CedulaData) => {
    // Reset authorization state
    setIsUnauthorized(false);
    setAutorizadaData(null);
    
    // Check whitelist if enabled
    if (whitelistConfig?.requireWhitelist && selectedEvent?.id) {
      const autorizada = await checkAuthorization(data.numeroCedula);
      
      if (!autorizada) {
        // Log denied attempt
        await createAccessLog.mutateAsync({
          event_id: selectedEvent.id,
          numero_cedula: data.numeroCedula,
          nombre_detectado: data.nombreCompleto,
          access_result: 'denied',
          denial_reason: 'Cédula no está en la lista de acceso autorizado',
          scanned_by: user?.id,
          device_info: navigator.userAgent,
        });
        
        setIsUnauthorized(true);
        setPendingScan(data);
        return;
      }
      
      // Store authorized data for display
      setAutorizadaData(autorizada);
    }
    
    setPendingScan(data);
  };

  const handleConfirmCedulaScan = async () => {
    if (!pendingScan || !selectedEvent?.id || isUnauthorized) return;

    const registro: InsertCedulaRegistro = {
      event_id: selectedEvent.id,
      numero_cedula: pendingScan.numeroCedula,
      primer_apellido: pendingScan.primerApellido,
      segundo_apellido: pendingScan.segundoApellido,
      nombres: pendingScan.nombres,
      fecha_nacimiento: convertDateToISO(pendingScan.fechaNacimiento),
      sexo: pendingScan.sexo || undefined,
      rh: pendingScan.rh || undefined,
      lugar_expedicion: pendingScan.lugarExpedicion || undefined,
      fecha_expedicion: convertDateToISO(pendingScan.fechaExpedicion),
      raw_data: pendingScan.rawData,
      scanned_by: user?.id,
      device_info: navigator.userAgent,
    };

    await createCedulaMutation.mutateAsync(registro);
    
    // Log successful access if whitelist is enabled
    if (whitelistConfig?.requireWhitelist) {
      await createAccessLog.mutateAsync({
        event_id: selectedEvent.id,
        numero_cedula: pendingScan.numeroCedula,
        nombre_detectado: pendingScan.nombreCompleto,
        access_result: 'authorized',
        scanned_by: user?.id,
        device_info: navigator.userAgent,
      });
    }
    
    setPendingScan(null);
    setIsUnauthorized(false);
    setAutorizadaData(null);
  };

  const handleCancelCedulaScan = () => {
    setPendingScan(null);
    setIsUnauthorized(false);
    setAutorizadaData(null);
  };

  return (
    <div className="min-h-screen bg-empresarial flex flex-col touch-manipulation">
      <Header title="SCANNER DE ACCESO" />

      <main className="flex-1 flex flex-col items-center justify-start p-3 md:p-4 pt-4 md:pt-6 overflow-y-auto">
        <div className="w-full max-w-4xl space-y-4">
          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-gray-800 p-2 gap-2 mb-4">
              <TabsTrigger 
                value="tickets" 
                className="flex items-center justify-center gap-2 py-2.5 rounded-md data-[state=active]:bg-dorado data-[state=active]:text-empresarial"
              >
                <QrCode className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">QR Tickets</span>
              </TabsTrigger>
              <TabsTrigger 
                value="cedulas" 
                className="flex items-center justify-center gap-2 py-2.5 rounded-md data-[state=active]:bg-dorado data-[state=active]:text-empresarial"
              >
                <IdCard className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Cédulas</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets">
              <div className="max-w-lg mx-auto p-4 md:p-8 space-y-4 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
                <div className="text-center mb-4">
                  <h1 className="text-xl md:text-2xl font-bold text-dorado mb-2">Escáner QR de Tickets</h1>
                  <p className="text-sm md:text-base text-gray-400">Escanee el código QR del ticket del asistente</p>
                </div>

                <QRScanner 
                  selectedEventId={selectedEventId}
                  onEventChange={setSelectedEventId}
                />
              </div>
            </TabsContent>

            <TabsContent value="cedulas">
              <div className="max-w-lg mx-auto p-4 md:p-8 space-y-4 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
                <div className="text-center mb-4">
                  <h1 className="text-xl md:text-2xl font-bold text-dorado mb-2">Escáner de Cédulas</h1>
                  <p className="text-sm md:text-base text-gray-400">Escanee el código PDF417 en el reverso de la cédula</p>
                </div>

                <ControlTypeSelector
                  controlTypes={controlTypes}
                  selectedControlType={selectedControlType}
                  onControlTypeChange={setSelectedControlType}
                  isLoading={controlTypesLoading}
                />

                {pendingScan ? (
                  <CedulaScanResult
                    data={pendingScan}
                    onConfirm={handleConfirmCedulaScan}
                    onCancel={handleCancelCedulaScan}
                    isLoading={createCedulaMutation.isPending}
                    isUnauthorized={isUnauthorized}
                    autorizadaData={autorizadaData}
                    requireWhitelist={whitelistConfig?.requireWhitelist}
                  />
                ) : (
                  <CedulaScanner
                    onScanSuccess={handleCedulaScanSuccess}
                    isActive={!pendingScan && !!selectedControlType}
                  />
                )}

                {!selectedControlType && !pendingScan && (
                  <p className="text-center text-yellow-500 text-sm">
                    Seleccione un tipo de control para habilitar el escáner
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="py-3 md:py-4 text-center text-gray-500 text-xs flex-shrink-0">
        &copy; {new Date().getFullYear()} Chequi - Todos los derechos reservados - Hecho en Colombia con ❤️ by Daro
      </footer>
    </div>
  );
};

export default Scanner;
