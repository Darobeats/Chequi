
import { useState, useEffect } from 'react';
import QrScanner from 'qr-scanner';
import { toast } from "@/components/ui/sonner";

export const useCameraPermissions = () => {
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Check camera availability and permissions
  useEffect(() => {
    const checkCameraAndPermissions = async () => {
      try {
        console.log('Checking camera availability...');
        const hasCamera = await QrScanner.hasCamera();
        setHasCamera(hasCamera);
        
        if (!hasCamera) {
          setCameraError('No se detectó una cámara disponible en este dispositivo');
          return;
        }

        // Check current permission status
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
            setPermissionStatus(permission.state);
            console.log('Camera permission status:', permission.state);
            
            // Listen for permission changes
            permission.onchange = () => {
              setPermissionStatus(permission.state);
              console.log('Camera permission changed to:', permission.state);
            };
          } catch (permError) {
            console.log('Permissions API not supported, will request on demand');
            setPermissionStatus('unknown');
          }
        }
      } catch (error) {
        console.error('Error checking camera:', error);
        setCameraError('Error al verificar la cámara');
        setHasCamera(false);
      }
    };

    checkCameraAndPermissions();
  }, []);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (!hasCamera) {
      toast.error('No hay cámara disponible en este dispositivo');
      return false;
    }

    setIsRequestingPermission(true);
    setCameraError(null);

    try {
      console.log('Requesting camera access...');
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Prefer back camera
        } 
      });
      
      console.log('Camera access granted');
      
      // Stop the stream immediately as QrScanner will handle it
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionStatus('granted');
      toast.success('Permisos de cámara concedidos');
      return true;
      
    } catch (error: any) {
      console.error('Camera permission error:', error);
      setPermissionStatus('denied');
      
      if (error.name === 'NotAllowedError') {
        setCameraError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración del navegador.');
        toast.error('Permisos de cámara denegados', {
          description: 'Ve a la configuración del navegador y permite el acceso a la cámara para este sitio'
        });
      } else if (error.name === 'NotFoundError') {
        setCameraError('No se encontró una cámara en este dispositivo');
        toast.error('Cámara no encontrada');
      } else if (error.name === 'NotReadableError') {
        setCameraError('La cámara está siendo usada por otra aplicación');
        toast.error('Cámara ocupada', {
          description: 'Cierra otras aplicaciones que puedan estar usando la cámara'
        });
      } else {
        setCameraError('Error al acceder a la cámara: ' + error.message);
        toast.error('Error de cámara', {
          description: 'No se pudo acceder a la cámara'
        });
      }
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  return {
    hasCamera,
    cameraError,
    permissionStatus,
    isRequestingPermission,
    requestCameraPermission,
  };
};
