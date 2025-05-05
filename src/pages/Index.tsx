
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

const Index = () => {
  const { isAuthenticated, login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/admin');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await login(email);
      if (result.success) {
        toast.success('Login exitoso', {
          description: 'Redirigiéndote al panel de administración...'
        });
        navigate('/admin');
      } else {
        toast.error('Error de inicio de sesión', {
          description: result.message
        });
      }
    } catch (error) {
      toast.error('Error de inicio de sesión', {
        description: 'Hubo un problema al procesar su solicitud.'
      });
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
            <h1 className="text-3xl font-bold text-dorado mb-2">Evento QR</h1>
            <p className="text-gray-400">Sistema de control de acceso para eventos</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email de Administrador
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
              <p className="text-xs text-gray-500">
                Para la demo, cualquier email válido funcionará
              </p>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-dorado hover:bg-dorado/90 text-empresarial font-medium"
              disabled={submitting || loading}
            >
              {submitting || loading ? 'Procesando...' : 'Iniciar Sesión'}
            </Button>
          </form>
          
          <div className="text-center text-sm text-gray-400">
            <p>Sistema de acceso a eventos premium</p>
          </div>
        </div>
      </div>
      
      <footer className="py-4 text-center text-gray-500 text-xs">
        &copy; {new Date().getFullYear()} Evento QR Access - Todos los derechos reservados
      </footer>
    </div>
  );
};

export default Index;
