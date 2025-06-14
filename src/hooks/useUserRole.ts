
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
  
  const hasRole = (requiredRole: UserRole) => role === requiredRole;
  
  const canAccessAdmin = isAdmin;
  const canAccessScanner = isAdmin || isControl;
  const canAccessProfile = isAdmin || isAttendee;
  
  return {
    role,
    loading,
    isAdmin,
    isControl,
    isAttendee,
    hasRole,
    canAccessAdmin,
    canAccessScanner,
    canAccessProfile,
  };
};
