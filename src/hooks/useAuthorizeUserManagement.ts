import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export const useAuthorizeUserManagement = () => {
  const { user } = useSupabaseAuth();
  
  // Solo el usuario específico puede acceder al módulo de gestión de usuarios
  const isAuthorized = user?.email === 'iacristiandigital@gmail.com';
  
  return {
    isAuthorized,
    canManageUsers: isAuthorized
  };
};