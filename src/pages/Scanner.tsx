
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import Header from '@/components/Header';
import QRScanner from '@/components/QRScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Scanner = () => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { role, loading: roleLoading, canAccessScanner } = useUserRole();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Auto-login para testing con usuario de control
  const handleQuickLogin = async () => {
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'control@chequi.com',
        password: 'control123'
      });
      
      if (error) {
        toast.error('Error de autenticación', {
          description: 'Usuario de control no encontrado. Use sus credenciales.'
        });
      } else {
        toast.success('Autenticado correctamente', {
          description: 'Scanner habilitado para control de acceso'
        });
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Complete todos los campos');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        toast.error('Error de autenticación', {
          description: error.message
        });
      } else {
        toast.success('Autenticado correctamente');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Mostrar loading mientras carga
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-empresarial flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-dorado border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-hueso">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // El scanner es de libre acceso, no requiere autenticación

  // Mostrar scanner de libre acceso
  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title="SCANNER DE ACCESO" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg p-8 space-y-8 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-dorado mb-2">Escáner QR de Acceso</h1>
            <p className="text-gray-400">Escanee el código QR del asistente</p>
            <p className="text-sm text-gray-500 mt-2">Sistema de control de acceso</p>
          </div>
          
          <QRScanner />
        </div>
      </div>
      
      <footer className="py-4 text-center text-gray-500 text-xs">
        &copy; {new Date().getFullYear()} Chequi - Todos los derechos reservados - Hecho en Colombia con ❤️
      </footer>
    </div>
  );
};

export default Scanner;
