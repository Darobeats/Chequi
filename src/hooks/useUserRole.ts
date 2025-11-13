
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

export const useUserRole = () => {
  const { profile, loading } = useSupabaseAuth();
  
  console.log('useUserRole - profile:', profile, 'loading:', loading);
  
  const role = profile?.role || null;
  
  const isAdmin = role === 'admin';
  const isControl = role === 'control';
  const isScanner = role === 'scanner';
  const isAttendee = role === 'attendee';
  
  const hasRole = (requiredRole: UserRole) => role === requiredRole;
  
  // Permisos según el nuevo sistema:
  // - admin: control total (dashboard con modificaciones + scanner)
  // - control: dashboard solo lectura + scanner
  // - scanner: SOLO scanner
  // - attendee: solo perfil propio
  const canAccessAdmin = isAdmin || isControl; // Dashboard (admin modifica, control lee)
  const canAccessScanner = isAdmin || isControl || isScanner; // Módulo scanner
  const canAccessProfile = isAdmin || isAttendee; // Perfil
  const canAccessConfig = isAdmin; // Solo admins pueden ver/modificar configuración
  const canModifyData = isAdmin; // Solo admin puede crear/modificar/eliminar
  
  return {
    role,
    loading,
    isAdmin,
    isControl,
    isScanner,
    isAttendee,
    hasRole,
    canAccessAdmin,
    canAccessScanner,
    canAccessProfile,
    canAccessConfig,
    canModifyData,
  };
};
