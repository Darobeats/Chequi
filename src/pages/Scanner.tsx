
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

  // Mostrar login si no está autenticado o no tiene permisos
  if (!user || !canAccessScanner) {
    return (
      <div className="min-h-screen bg-empresarial flex flex-col">
        <Header title="SCANNER - ACCESO REQUERIDO" />
        
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-900/50 border border-gray-800">
            <CardHeader className="text-center">
              <CardTitle className="text-dorado">Acceso Requerido</CardTitle>
              <CardDescription className="text-gray-400">
                Solo usuarios con rol admin o control pueden usar el scanner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user ? (
                <>
                  <Alert className="border-orange-500/50 bg-orange-500/10">
                    <AlertDescription className="text-orange-200">
                      Debe iniciar sesión para usar el scanner
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={handleQuickLogin}
                    disabled={isLoggingIn}
                    className="w-full bg-dorado hover:bg-dorado/90 text-black font-semibold"
                  >
                    {isLoggingIn ? 'Autenticando...' : 'Acceso de Control (Testing)'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-gray-900 px-2 text-gray-400">O ingrese sus credenciales</span>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <Label htmlFor="email" className="text-hueso">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-hueso"
                        placeholder="usuario@empresa.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-hueso">Contraseña</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-hueso"
                        placeholder="••••••••"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoggingIn}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </Button>
                  </form>
                </>
              ) : (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertDescription className="text-red-200">
                    Su rol ({role}) no tiene permisos para usar el scanner. 
                    Contacte al administrador.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
        
        <footer className="py-4 text-center text-gray-500 text-xs">
          &copy; {new Date().getFullYear()} Chequi - Todos los derechos reservados - Hecho en Colombia con ❤️
        </footer>
      </div>
    );
  }

  // Mostrar scanner si está autenticado y tiene permisos
  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title={`SCANNER - ${role?.toUpperCase()}`} />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg p-8 space-y-8 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-dorado mb-2">Escáner QR de Acceso</h1>
            <p className="text-gray-400">Escanee el código QR del asistente</p>
            <p className="text-sm text-dorado mt-2">Usuario: {user.email} ({role})</p>
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
