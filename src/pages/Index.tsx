
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading } = useSupabaseAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl text-center">
          <div>
            <h1 className="text-3xl font-bold text-dorado mb-2">Chequi</h1>
            <p className="text-gray-400 mb-6">Sistema de control de acceso para eventos</p>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-300">
              Gestiona el acceso a tus eventos de manera eficiente y segura
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/scanner')}
                className="w-full bg-dorado hover:bg-dorado/90 text-empresarial font-medium"
              >
                Scanner
              </Button>
              
              <Button
                onClick={handleGetStarted}
                variant="outline"
                className="w-full border-dorado text-dorado hover:bg-dorado/10"
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Iniciar Sesión'}
              </Button>
            </div>
          </div>
          
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

export default Index;
