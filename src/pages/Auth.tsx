
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';


const Auth = () => {
  const { user, signIn, loading } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    console.log('Auth page - user:', !!user, 'loading:', loading);
    if (user && !loading) {
      console.log('User found in Auth page, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Sign in attempt:', { email, hasPassword: !!password });
    
    if (!email || !password) {
      toast.error('Error', { description: 'Por favor complete todos los campos' });
      return;
    }

    setSubmitting(true);
    try {
      console.log('Calling signIn...');
      const { error } = await signIn(email, password);
      
      console.log('SignIn result:', { error });
      
      if (error) {
        console.error('SignIn error:', error);
        toast.error('Error de inicio de sesión', { description: error.message });
      } else {
        console.log('SignIn successful');
        toast.success('Inicio de sesión exitoso');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('SignIn catch error:', error);
      toast.error('Error', { description: 'Hubo un problema al procesar su solicitud.' });
    } finally {
      setSubmitting(false);
    }
  };


  // Si hay usuario, no mostrar la página de auth
  if (user && !loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-dorado mb-2">Chequi</h1>
            <p className="text-gray-400">Sistema de control de acceso para eventos</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-hueso"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Contraseña
              </label>
              <Input
                id="password"
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
              disabled={submitting}
            >
              {submitting ? 'Procesando...' : 'Iniciar Sesión'}
            </Button>
          </form>
          
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
