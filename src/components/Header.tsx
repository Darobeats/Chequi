
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'CHEQUI' }) => {
  const { user, profile, signOut } = useSupabaseAuth();
  const { canAccessAdmin, canAccessScanner } = useUserRole();
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
    <header className="bg-empresarial border-b border-dorado/30 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl md:text-2xl font-bold text-dorado">{title}</h1>
          {profile && (
            <Badge className={getRoleColor(profile.role)}>
              {getRoleText(profile.role)}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {user && profile ? (
            <>
              {canAccessScanner && (
                <Button
                  variant="ghost"
                  className="text-hueso hover:text-dorado hover:bg-empresarial"
                  onClick={() => handleNavigation('/scanner')}
                >
                  Scanner
                </Button>
              )}
              {canAccessAdmin && (
                <Button
                  variant="ghost"
                  className="text-hueso hover:text-dorado hover:bg-empresarial"
                  onClick={() => handleNavigation('/admin')}
                >
                  Admin
                </Button>
              )}
              {profile.role === 'attendee' && (
                <Button
                  variant="ghost"
                  className="text-hueso hover:text-dorado hover:bg-empresarial"
                  onClick={() => handleNavigation('/profile')}
                >
                  Mi Perfil
                </Button>
              )}
              <Button
                variant="outline"
                className="border-dorado text-dorado hover:bg-dorado/10"
                onClick={handleSignOut}
              >
                Cerrar Sesión
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="border-dorado text-dorado hover:bg-dorado/10"
              onClick={() => handleNavigation('/auth')}
            >
              Iniciar Sesión
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
