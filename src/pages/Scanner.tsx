
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import Header from '@/components/Header';
import QRScanner from '@/components/QRScanner';

const Scanner = () => {
  const { user, loading } = useSupabaseAuth();
  const { canAccessScanner, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    } else if (user && !roleLoading && !canAccessScanner) {
      navigate('/dashboard');
    }
  }, [user, loading, canAccessScanner, roleLoading, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-empresarial flex flex-col">
        <Header title="SCANNER" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-hueso">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title="SCANNER" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg p-8 space-y-8 bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-dorado mb-2">Escáner QR de Acceso</h1>
            <p className="text-gray-400">Escanee el código QR del asistente</p>
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
