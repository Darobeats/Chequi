
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const Dashboard = () => {
  const { user, loading } = useSupabaseAuth();
  const { role, isAdmin, isControl, isAttendee, isViewer, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Dashboard useEffect triggered:', { 
      user: !!user, 
      loading, 
      roleLoading, 
      role,
      isAdmin,
      isControl,
      isAttendee,
      isViewer 
    });

    // Esperar a que termine la carga de autenticación y rol
    if (loading || roleLoading) {
      console.log('Still loading, waiting...');
      return;
    }

    // Si no hay usuario, redirigir a auth
    if (!user) {
      console.log('No user found, redirecting to auth');
      navigate('/auth');
      return;
    }

    // Si hay usuario y rol, redirigir según el rol
    if (user && role) {
      console.log('User and role found, redirecting based on role:', role);
      if (isAdmin) {
        console.log('Redirecting to admin');
        navigate('/admin');
      } else if (isControl) {
        console.log('Redirecting to scanner');
        navigate('/scanner');
      } else if (isViewer) {
        console.log('Redirecting viewer to admin (read-only)');
        navigate('/admin');
      } else if (isAttendee) {
        console.log('Redirecting to profile');
        navigate('/profile');
      } else {
        console.log('Unknown role, staying on dashboard');
      }
    }
  }, [user, role, loading, roleLoading, isAdmin, isControl, isAttendee, isViewer, navigate]);

  // Mostrar estado de carga mientras se resuelve la autenticación
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-empresarial flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dorado mx-auto mb-4"></div>
          <p className="text-hueso mb-2">Redirigiendo...</p>
          <p className="text-gray-400 text-sm">
            {loading && 'Verificando autenticación...'}
            {!loading && roleLoading && 'Cargando perfil...'}
          </p>
        </div>
      </div>
    );
  }

  // Si hay usuario pero no hay rol después de cargar, mostrar error
  if (user && !role) {
    return (
      <div className="min-h-screen bg-empresarial flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Error al cargar el perfil de usuario</p>
          <p className="text-gray-400 text-sm mb-4">
            No se pudo obtener la información del perfil. Revisa los logs de la consola.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-dorado text-empresarial px-4 py-2 rounded hover:bg-dorado/80"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Estado final si no se puede redirigir
  return (
    <div className="min-h-screen bg-empresarial flex items-center justify-center">
      <div className="text-center">
        <p className="text-hueso mb-2">Estado del sistema</p>
        <p className="text-gray-400 text-sm">
          Usuario: {user ? 'Autenticado' : 'No autenticado'} | 
          Rol: {role || 'No asignado'}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
