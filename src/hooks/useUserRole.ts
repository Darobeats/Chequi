
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

export const useUserRole = () => {
  const { profile, loading } = useSupabaseAuth();
  
  console.log('useUserRole - profile:', profile, 'loading:', loading);
  
  const role = profile?.role || null;
  
  const isAdmin = role === 'admin';
  const isControl = role === 'control';
  const isAttendee = role === 'attendee';
  const isViewer = role === 'viewer';
  
  const hasRole = (requiredRole: UserRole) => role === requiredRole;
  
  const canAccessAdmin = isAdmin || isControl || isViewer;
  const canAccessScanner = isAdmin || isControl || isViewer;
  const canAccessProfile = isAdmin || isAttendee;
  const canAccessConfig = isAdmin; // Solo admins pueden ver configuración
  
  return {
    role,
    loading,
    isAdmin,
    isControl,
    isAttendee,
    isViewer,
    hasRole,
    canAccessAdmin,
    canAccessScanner,
    canAccessProfile,
    canAccessConfig,
  };
};
