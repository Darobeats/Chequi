
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const Dashboard = () => {
  const { user, loading } = useSupabaseAuth();
  const { role, isAdmin, isControl, isAttendee, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Dashboard useEffect triggered:', { 
      user: !!user, 
      loading, 
      roleLoading, 
      role,
      isAdmin,
      isControl,
      isAttendee 
    });

    if (!loading && !roleLoading) {
      if (!user) {
        console.log('No user found, redirecting to auth');
        navigate('/auth');
        return;
      }

      if (user && role) {
        console.log('User and role found, redirecting based on role:', role);
        // Redirect based on user role
        if (isAdmin) {
          console.log('Redirecting to admin');
          navigate('/admin');
        } else if (isControl) {
          console.log('Redirecting to scanner');
          navigate('/scanner');
        } else if (isAttendee) {
          console.log('Redirecting to profile');
          navigate('/profile');
        } else {
          console.log('Unknown role, staying on dashboard');
        }
      } else if (user && !role) {
        console.log('User found but no role, this might be the issue');
        // Si hay usuario pero no rol, puede ser que el perfil no se haya cargado aún
        // Vamos a dar un poco más de tiempo
        setTimeout(() => {
          if (!role) {
            console.log('Still no role after timeout, redirecting to profile as fallback');
            navigate('/profile');
          }
        }, 2000);
      }
    }
  }, [user, role, loading, roleLoading, isAdmin, isControl, isAttendee, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-empresarial flex items-center justify-center">
        <div className="text-center">
          <p className="text-hueso mb-2">Redirigiendo...</p>
          <p className="text-gray-400 text-sm">
            Cargando: {loading ? 'Autenticación' : ''} {roleLoading ? 'Perfil' : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-empresarial flex items-center justify-center">
      <div className="text-center">
        <p className="text-hueso mb-2">Redirigiendo...</p>
        <p className="text-gray-400 text-sm">
          Usuario: {user ? 'Cargado' : 'No cargado'} | Rol: {role || 'No encontrado'}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
