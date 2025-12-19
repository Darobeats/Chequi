import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import QRScanner from "@/components/QRScanner";
import { CedulaScanner } from "@/components/cedula/CedulaScanner";
import { CedulaScanResult } from "@/components/cedula/CedulaScanResult";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateCedulaRegistro } from "@/hooks/useCedulaRegistros";
import { useEventContext } from "@/context/EventContext";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { useControlTypes } from "@/hooks/useSupabaseData";
import { useEventWhitelistConfig, useEventWhitelistConfigById } from "@/hooks/useEventWhitelistConfig";
import { useCheckCedulaAuthorization, useCreateAccessLog } from "@/hooks/useCedulasAutorizadas";
import { useCheckCedulaControlLimit, useCreateCedulaControlUsage } from "@/hooks/useCedulaControlUsage";
import ControlTypeSelector from "@/components/scanner/ControlTypeSelector";
import type { CedulaData, CedulaAutorizada, InsertCedulaRegistro } from "@/types/cedula";
import { QrCode, IdCard, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { selectedEvent, userEvents, isLoadingEvents, selectEvent } = useEventContext();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [pendingScan, setPendingScan] = useState<CedulaData | null>(null);
  const [selectedControlType, setSelectedControlType] = useState<string>("");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [autorizadaData, setAutorizadaData] = useState<CedulaAutorizada | null>(null);
  const [controlLimitInfo, setControlLimitInfo] = useState<{ current: number; max: number } | null>(null);
  
  const createCedulaMutation = useCreateCedulaRegistro();
  const createControlUsage = useCreateCedulaControlUsage();
  const { data: controlTypes = [], isLoading: controlTypesLoading } = useControlTypes();
  
  // Use both hooks - by ID and active event as fallback
  const { data: whitelistConfigById, isLoading: whitelistLoadingById } = useEventWhitelistConfigById(selectedEvent?.id || null);
  const { data: activeWhitelistConfig, isLoading: activeWhitelistLoading } = useEventWhitelistConfig();
  
  // Use the event-specific config if available, otherwise fallback to active event config
  const whitelistConfig = whitelistConfigById || activeWhitelistConfig;
  const whitelistLoading = whitelistLoadingById && activeWhitelistLoading;
  
  const checkAuthorization = useCheckCedulaAuthorization(selectedEvent?.id || null);
  const checkControlLimit = useCheckCedulaControlLimit(selectedEvent?.id || null);
  const createAccessLog = useCreateAccessLog();

  // URGENT FIX: Force auto-select single event
  useEffect(() => {
    if (!selectedEvent && !isLoadingEvents && userEvents.length === 1) {
      console.log('[Scanner] FORCE auto-selecting single event:', userEvents[0].event_id, userEvents[0].event_name);
      selectEvent(userEvents[0].event_id);
    }
  }, [selectedEvent, isLoadingEvents, userEvents, selectEvent]);

  // URGENT FIX: Auto-select "Ingreso" control type to block duplicates
  useEffect(() => {
    if (controlTypes.length > 0 && !selectedControlType) {
      // Prefer "Ingreso" control type, fallback to first available
      const ingresoControl = controlTypes.find(ct => 
        ct.name.toLowerCase() === 'ingreso' || 
        ct.name.toLowerCase().includes('entrada') ||
        ct.name.toLowerCase().includes('acceso')
      );
      const defaultControl = ingresoControl || controlTypes[0];
      console.log('[Scanner] AUTO-SELECTING control type:', defaultControl.name, defaultControl.id);
      setSelectedControlType(defaultControl.id);
      toast.info(`Control seleccionado: ${defaultControl.name}`);
    }
  }, [controlTypes, selectedControlType]);

  // Debug logging for whitelist config
  useEffect(() => {
    console.log('[Scanner] State:', {
      selectedEventId: selectedEvent?.id,
      selectedEventName: selectedEvent?.event_name,
      userEventsCount: userEvents.length,
      isLoadingEvents,
      controlTypesCount: controlTypes.length,
      controlTypesLoading,
      requireWhitelist: whitelistConfig?.requireWhitelist,
    });
  }, [selectedEvent, userEvents, isLoadingEvents, controlTypes, controlTypesLoading, whitelistConfig]);

  // URGENT FIX: Show loading while event is not ready
  if (isLoadingEvents || !selectedEvent) {
    return (
      <div className="min-h-screen bg-empresarial flex flex-col touch-manipulation">
        <Header title="SCANNER DE ACCESO" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 p-6">
            <div className="animate-spin h-10 w-10 border-4 border-dorado border-t-transparent rounded-full mx-auto" />
            <p className="text-hueso text-lg font-medium">Cargando evento...</p>
            <p className="text-gray-400 text-sm">
              {isLoadingEvents ? 'Obteniendo eventos asignados...' : 'Seleccionando evento...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleCedulaScanSuccess = async (data: CedulaData) => {
    // Reset states
    setIsUnauthorized(false);
    setAutorizadaData(null);
    setControlLimitInfo(null);
    
    const eventId = selectedEvent?.id;
    const requireWhitelist = whitelistConfig?.requireWhitelist === true;
    
    console.log('[Scanner] handleCedulaScanSuccess:', {
      numeroCedula: data.numeroCedula,
      eventId,
      requireWhitelist,
      selectedControlType,
    });
    
    // Check whitelist if enabled
    if (requireWhitelist && eventId) {
      console.log('[Scanner] Checking whitelist authorization...');
      const autorizada = await checkAuthorization(data.numeroCedula);
      
      console.log('[Scanner] Authorization result:', autorizada);
      
      if (!autorizada) {
        // Log denied attempt
        console.log('[Scanner] Access DENIED - cédula not in whitelist');
        await createAccessLog.mutateAsync({
          event_id: eventId,
          numero_cedula: data.numeroCedula,
          nombre_detectado: data.nombreCompleto,
          access_result: 'denied',
          denial_reason: 'Cédula no está en la lista de acceso autorizado',
          scanned_by: user?.id,
          device_info: navigator.userAgent,
        });
        
        toast.error('NO ESTÁ EN LISTA', {
          description: 'Esta cédula no se encuentra en la lista de acceso',
        });
        setIsUnauthorized(true);
        setPendingScan(data);
        return;
      }
      
      // Store authorized data for display
      console.log('[Scanner] Access AUTHORIZED');
      setAutorizadaData(autorizada);
    }
    
    // Check control limit if a control type is selected
    if (selectedControlType && eventId) {
      const limitResult = await checkControlLimit(data.numeroCedula, selectedControlType);
      console.log('[Scanner] Control limit result:', limitResult);
      
      setControlLimitInfo({ current: limitResult.current_uses, max: limitResult.max_uses });
      
      if (!limitResult.can_access && limitResult.max_uses > 0) {
        toast.error(`Límite alcanzado: ${limitResult.current_uses}/${limitResult.max_uses} usos`);
        // Still show the scan result but disable confirm
        setIsUnauthorized(true);
        setPendingScan(data);
        return;
      }
    }
    
    setPendingScan(data);
  };

  // Save authorized cedula with full control usage
  const handleConfirmCedulaScan = async () => {
    if (!pendingScan || !selectedEvent?.id || isUnauthorized) return;

    try {
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

      // Add was_on_whitelist flag if whitelist is enabled
      const registroWithWhitelist = whitelistConfig?.requireWhitelist 
        ? { ...registro, was_on_whitelist: true }
        : registro;

      await createCedulaMutation.mutateAsync(registroWithWhitelist as InsertCedulaRegistro);
      
      // Register control usage if control type is selected
      if (selectedControlType) {
        console.log('[Scanner] Registering control usage:', {
          event_id: selectedEvent.id,
          numero_cedula: pendingScan.numeroCedula,
          control_type_id: selectedControlType,
        });
        
        await createControlUsage.mutateAsync({
          event_id: selectedEvent.id,
          numero_cedula: pendingScan.numeroCedula,
          control_type_id: selectedControlType,
          device: navigator.userAgent,
          scanned_by: user?.id,
        });
      }
      
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
      
      toast.success('Registro guardado exitosamente');
      setPendingScan(null);
      setIsUnauthorized(false);
      setAutorizadaData(null);
      setControlLimitInfo(null);
    } catch (error) {
      console.error('[Scanner] Error saving:', error);
      toast.error('Error al guardar el registro');
    }
  };

  // Save unauthorized cedula for reporting purposes
  const handleSaveUnauthorized = async () => {
    if (!pendingScan || !selectedEvent?.id) return;

    try {
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

      // Mark as NOT on whitelist for reporting
      const registroWithWhitelist = { ...registro, was_on_whitelist: false };

      await createCedulaMutation.mutateAsync(registroWithWhitelist as InsertCedulaRegistro);
      
      toast.success('Registro guardado para reporte', {
        description: 'Cédula registrada como "no en lista"',
      });
      
      setPendingScan(null);
      setIsUnauthorized(false);
      setAutorizadaData(null);
      setControlLimitInfo(null);
    } catch (error) {
      console.error('[Scanner] Error saving unauthorized:', error);
      toast.error('Error al guardar el registro');
    }
  };

  const handleCancelCedulaScan = () => {
    setPendingScan(null);
    setIsUnauthorized(false);
    setAutorizadaData(null);
    setControlLimitInfo(null);
  };

  const selectedControlName = controlTypes.find(c => c.id === selectedControlType)?.name;

  return (
    <div className="min-h-screen bg-empresarial flex flex-col touch-manipulation">
      <Header title="SCANNER DE ACCESO" />

      <main className="flex-1 flex flex-col items-center justify-start p-3 md:p-4 pt-4 md:pt-6 overflow-y-auto">
        <div className="w-full max-w-4xl space-y-4">
          {/* Whitelist status indicator */}
          {whitelistConfig?.requireWhitelist && (
            <Alert className="bg-yellow-900/30 border-yellow-600">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-200">
                <strong>Lista de Acceso ACTIVA</strong> - Solo cédulas autorizadas tendrán acceso completo
              </AlertDescription>
            </Alert>
          )}

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
                    isLoading={createCedulaMutation.isPending || createControlUsage.isPending}
                    isUnauthorized={isUnauthorized}
                    autorizadaData={autorizadaData}
                    requireWhitelist={whitelistConfig?.requireWhitelist}
                    controlLimitInfo={controlLimitInfo}
                    controlName={selectedControlName}
                    allowSaveUnauthorized={whitelistConfig?.requireWhitelist === true}
                    onSaveUnauthorized={handleSaveUnauthorized}
                  />
                ) : (
                  <CedulaScanner
                    onScanSuccess={handleCedulaScanSuccess}
                    isActive={!pendingScan && !!selectedControlType && !whitelistLoading}
                  />
                )}

                {!selectedControlType && !pendingScan && (
                  <p className="text-center text-yellow-500 text-sm">
                    Seleccione un tipo de control para habilitar el escáner
                  </p>
                )}
                
                {whitelistLoading && (
                  <p className="text-center text-gray-400 text-sm">
                    Cargando configuración de lista blanca...
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
