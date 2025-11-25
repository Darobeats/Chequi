import { useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { parseCedulaData } from '@/utils/cedulaParser';
import type { CedulaData } from '@/types/cedula';
import { toast } from 'sonner';

export function useCedulaScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastScan, setLastScan] = useState<CedulaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  
  const startScanning = useCallback(async (
    elementId: string,
    onSuccess: (data: CedulaData) => void
  ) => {
    try {
      // Verificar si ya hay una instancia activa
      if (scannerRef.current) {
        console.log('⚠️ Escáner ya activo, deteniendo primero...');
        await stopScanning();
      }
      
      // Limpiar el contenedor antes de inicializar
      const container = document.getElementById(elementId);
      if (!container) {
        throw new Error(`No se encontró el elemento con ID: ${elementId}`);
      }
      container.innerHTML = ''; // Limpiar cualquier contenido previo
      
      setError(null);
      setIsInitializing(true);
      setCameraReady(false);
      
      console.log('🎥 Iniciando escáner de cédulas...');
      
      // Verificar cámaras disponibles
      console.log('📷 Verificando cámaras disponibles...');
      const cameras = await Html5Qrcode.getCameras();
      
      if (!cameras || cameras.length === 0) {
        throw new Error('No se detectaron cámaras en este dispositivo');
      }
      
      console.log(`✅ ${cameras.length} cámara(s) detectada(s):`, cameras.map(c => c.label));
      
      // Seleccionar cámara trasera preferentemente
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') ||
        camera.label.toLowerCase().includes('trasera') ||
        camera.label.toLowerCase().includes('rear')
      );
      
      const selectedCamera = backCamera || cameras[cameras.length - 1]; // Última cámara suele ser la trasera
      console.log('📸 Cámara seleccionada:', selectedCamera.label);
      
      // Crear instancia del escáner
      const scanner = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.PDF_417],
        verbose: false,
        useBarCodeDetectorIfSupported: true // Usar API nativa si está disponible
      });
      
      scannerRef.current = scanner;
      
      // Configuración optimizada para PDF417 de cédulas colombianas
      const config = {
        fps: 10,
        qrbox: { width: 350, height: 180 }, // Aumentado para mejor captura
        aspectRatio: 1.94, // Ratio típico de PDF417 en cédulas
        disableFlip: false // Permitir escaneo en ambas direcciones
      };
      
      console.log('⚙️ Configuración del escáner:', config);
      console.log('🚀 Iniciando cámara...');
      
      // Iniciar escáner con cameraId específico
      await scanner.start(
        selectedCamera.id,
        config,
        (decodedText) => {
          // Evitar escaneos duplicados (debounce de 2 segundos)
          const now = Date.now();
          if (now - lastScanTimeRef.current < 2000) {
            console.log('⏭️ Escaneo duplicado ignorado');
            return;
          }
          lastScanTimeRef.current = now;
          
          console.log('📄 Código detectado, longitud:', decodedText.length);
          console.log('🔍 Parseando datos de la cédula...');
          
          const parsed = parseCedulaData(decodedText);
          
          if (parsed) {
            console.log('✅ Cédula parseada exitosamente:', parsed.numeroCedula);
            setLastScan(parsed);
            onSuccess(parsed);
            
            // Vibración de éxito
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
            
            toast.success('Cédula escaneada correctamente', {
              description: `${parsed.nombreCompleto}`
            });
          } else {
            console.error('❌ No se pudo parsear el código PDF417');
            setError('No se pudieron interpretar los datos de la cédula');
            toast.error('Error al interpretar la cédula', {
              description: 'Asegúrate de escanear el código PDF417 del reverso'
            });
          }
        },
        (errorMessage) => {
          // Errores de escaneo (normales cuando no hay código en el frame)
          // No los mostramos para no saturar la consola
        }
      );
      
      console.log('✅ Cámara iniciada exitosamente');
      setIsInitializing(false);
      setCameraReady(true);
      setIsScanning(true);
      
    } catch (err: any) {
      console.error('❌ Error al iniciar escáner:', err);
      const errorMsg = err.message || 'Error iniciando el escáner';
      setError(errorMsg);
      setIsInitializing(false);
      setIsScanning(false);
      setCameraReady(false);
      toast.error('Error de cámara', {
        description: errorMsg
      });
    }
  }, []);
  
  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        console.log('🛑 Deteniendo escáner...');
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        console.log('✅ Escáner detenido');
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
    setCameraReady(false);
    setIsInitializing(false);
  }, []);
  
  return {
    isScanning,
    isInitializing,
    cameraReady,
    lastScan,
    error,
    startScanning,
    stopScanning,
    clearLastScan: () => setLastScan(null),
    clearError: () => setError(null)
  };
}
