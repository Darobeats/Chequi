
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Auth = () => {
  const { user, signIn, signUp, loading } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Error', { description: 'Por favor complete todos los campos' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error('Error de inicio de sesión', { description: error.message });
      } else {
        toast.success('Inicio de sesión exitoso');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Error', { description: 'Hubo un problema al procesar su solicitud.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error('Error', { description: 'Por favor complete todos los campos' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error('Error de registro', { description: error.message });
      } else {
        toast.success('Registro exitoso', {
          description: 'Revisa tu email para confirmar tu cuenta'
        });
      }
    } catch (error) {
      toast.error('Error', { description: 'Hubo un problema al procesar su solicitud.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-dorado mb-2">Chequi</h1>
            <p className="text-gray-400">Sistema de control de acceso para eventos</p>
          </div>
          
          <Tabs defaultValue="signin" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-gray-800">
              <TabsTrigger 
                value="signin"
                className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial"
              >
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial"
              >
                Registrarse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-6" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <label htmlFor="signin-email" className="block text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="admin@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="signin-password" className="block text-sm font-medium text-gray-300">
                    Contraseña
                  </label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-dorado hover:bg-dorado/90 text-empresarial font-medium"
                  disabled={submitting || loading}
                >
                  {submitting ? 'Procesando...' : 'Iniciar Sesión'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-6" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <label htmlFor="signup-name" className="block text-sm font-medium text-gray-300">
                    Nombre Completo
                  </label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300">
                    Contraseña
                  </label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-dorado hover:bg-dorado/90 text-empresarial font-medium"
                  disabled={submitting || loading}
                >
                  {submitting ? 'Procesando...' : 'Registrarse'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="text-center text-sm text-gray-400">
            <p>Sistema de acceso a eventos premium</p>
          </div>
        </div>
      </div>
      
      <footer className="py-4 text-center text-gray-500 text-xs">
        &copy; {new Date().getFullYear()} Chequi - Todos los derechos reservados - Hecho en Colombia con ❤️
      </footer>
    </div>
  );
};

export default Auth;
