import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useAuthorizeUserManagement } from '@/hooks/useAuthorizeUserManagement';
import Header from '@/components/Header';
import UserManagement from '@/components/UserManagement';

const Users = () => {
  const { user, loading } = useSupabaseAuth();
  const { isAuthorized, isLoading: authLoading } = useAuthorizeUserManagement();
  const navigate = useNavigate();

  const isPageLoading = loading || authLoading;

  useEffect(() => {
    if (!user && !isPageLoading) {
      navigate('/auth');
    } else if (user && !isPageLoading && !isAuthorized) {
      // Si no está autorizado, redirigir al dashboard
      navigate('/dashboard');
    }
  }, [user, isPageLoading, isAuthorized, navigate]);

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-empresarial flex flex-col">
        <Header title="GESTIÓN DE USUARIOS" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-hueso">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-empresarial flex flex-col">
        <Header title="ACCESO DENEGADO" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-dorado mb-4">Acceso Restringido</h2>
            <p className="text-hueso">No tienes permisos para acceder a este módulo.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title="GESTIÓN DE USUARIOS" />
      
      <div className="container mx-auto px-4 py-8">
        <UserManagement />
      </div>
    </div>
  );
};

export default Users;