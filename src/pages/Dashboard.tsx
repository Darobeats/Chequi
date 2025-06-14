
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const Dashboard = () => {
  const { user, loading } = useSupabaseAuth();
  const { role, isAdmin, isControl, isAttendee, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !roleLoading && user && role) {
      // Redirect based on user role
      if (isAdmin) {
        navigate('/admin');
      } else if (isControl) {
        navigate('/scanner');
      } else if (isAttendee) {
        navigate('/profile');
      }
    } else if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, role, loading, roleLoading, isAdmin, isControl, isAttendee, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-empresarial flex items-center justify-center">
        <p className="text-hueso">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-empresarial flex items-center justify-center">
      <p className="text-hueso">Redirigiendo...</p>
    </div>
  );
};

export default Dashboard;
