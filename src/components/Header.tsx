
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuthorizeUserManagement } from '@/hooks/useAuthorizeUserManagement';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  title?: string;
  showLandingNav?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title = 'CHEQUI', showLandingNav = false }) => {
  const { user, profile, signOut } = useSupabaseAuth();
  const { canAccessAdmin, canAccessScanner } = useUserRole();
  const { canManageUsers } = useAuthorizeUserManagement();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'control': return 'Control';
      case 'attendee': return 'Asistente';
      case 'viewer': return 'Observador';
      default: return '';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-800/30 text-red-400';
      case 'control': return 'bg-blue-800/30 text-blue-400';
      case 'attendee': return 'bg-green-800/30 text-green-400';
      case 'viewer': return 'bg-orange-800/30 text-orange-400';
      default: return 'bg-gray-800/30 text-gray-400';
    }
  };

  return (
    <header className="bg-empresarial border-b border-dorado/30 p-3 md:p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center gap-2">
        <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-shrink">
          <h1 
            className="text-lg md:text-2xl font-bold text-dorado truncate cursor-pointer hover:text-dorado/80 transition-colors"
            onClick={() => handleNavigation('/')}
          >
            {title}
          </h1>
          {profile && !showLandingNav && (
            <Badge className={`${getRoleColor(profile.role)} hidden sm:flex flex-shrink-0`}>
              {getRoleText(profile.role)}
            </Badge>
          )}
        </div>
        
        <nav className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {showLandingNav ? (
            // Landing page navigation
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-hueso hover:text-dorado hover:bg-empresarial touch-manipulation min-h-[44px] px-2 md:px-4 hidden md:inline-flex"
                onClick={() => {
                  const element = document.getElementById('caracteristicas');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Características
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-hueso hover:text-dorado hover:bg-empresarial touch-manipulation min-h-[44px] px-2 md:px-4 hidden md:inline-flex"
                onClick={() => {
                  const element = document.getElementById('como-funciona');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Cómo Funciona
              </Button>
              {user ? (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-dorado hover:bg-dorado/90 text-empresarial font-medium touch-manipulation min-h-[44px] px-4"
                  onClick={() => handleNavigation('/dashboard')}
                >
                  Dashboard
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-dorado hover:bg-dorado/90 text-empresarial font-medium touch-manipulation min-h-[44px] px-4"
                  onClick={() => handleNavigation('/auth')}
                >
                  Iniciar Sesión
                </Button>
              )}
            </>
          ) : user && profile ? (
            // App navigation (existing)
            <>
              {canAccessScanner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-hueso hover:text-dorado hover:bg-empresarial touch-manipulation min-h-[44px] px-2 md:px-4"
                  onClick={() => handleNavigation('/scanner')}
                >
                  <span className="hidden sm:inline">Scanner</span>
                  <span className="sm:hidden">Scan</span>
                </Button>
              )}
              {canAccessAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-hueso hover:text-dorado hover:bg-empresarial touch-manipulation min-h-[44px] px-2 md:px-4"
                  onClick={() => handleNavigation('/admin')}
                >
                  Admin
                </Button>
              )}
              {canManageUsers && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-hueso hover:text-dorado hover:bg-empresarial touch-manipulation min-h-[44px] px-2 md:px-4 hidden md:inline-flex"
                  onClick={() => handleNavigation('/users')}
                >
                  Usuarios
                </Button>
              )}
              {profile.role === 'attendee' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-hueso hover:text-dorado hover:bg-empresarial touch-manipulation min-h-[44px] px-2 md:px-4 hidden md:inline-flex"
                  onClick={() => handleNavigation('/profile')}
                >
                  Mi Perfil
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-dorado text-dorado hover:bg-dorado/10 touch-manipulation min-h-[44px] px-2 md:px-4"
                onClick={handleSignOut}
              >
                <span className="hidden sm:inline">Cerrar Sesión</span>
                <span className="sm:hidden">Salir</span>
              </Button>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
};

export default Header;
