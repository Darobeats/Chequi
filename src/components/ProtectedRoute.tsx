
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectTo = '/auth'
}) => {
  const { user, loading } = useSupabaseAuth();
  const { hasRole, isControl, isAdmin, isScanner, role, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-empresarial flex items-center justify-center">
        <p className="text-hueso">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole) {
    // Jerarquía de roles: admin > control > scanner > attendee
    // admin puede acceder a todo
    // control puede acceder a rutas de control y scanner
    // scanner solo puede acceder a rutas de scanner
    
    let allowed = false;
    
    if (isAdmin) {
      // Admin tiene acceso a todo
      allowed = true;
    } else if (isControl) {
      // Control puede acceder a rutas de control y scanner
      allowed = requiredRole === 'control' || requiredRole === 'scanner';
    } else if (isScanner) {
      // Scanner solo puede acceder a rutas de scanner
      allowed = requiredRole === 'scanner';
    } else {
      // Otros roles solo tienen acceso si coincide exactamente
      allowed = hasRole(requiredRole);
    }
    
    if (!allowed) {
      // Redirect based on user role
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
