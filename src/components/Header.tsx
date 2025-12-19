import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuthorizeUserManagement } from '@/hooks/useAuthorizeUserManagement';
import { useOptionalEventContext } from '@/context/EventContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Shield, Users, Scan } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showLandingNav?: boolean;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <Shield className="h-3 w-3" />;
    case 'control': return <Users className="h-3 w-3" />;
    case 'scanner': return <Scan className="h-3 w-3" />;
    default: return null;
  }
};

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'control': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'scanner': return 'bg-green-500/20 text-green-400 border-green-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const Header: React.FC<HeaderProps> = ({ title = 'CHEQUI', showLandingNav = false }) => {
  const { user, profile, signOut } = useSupabaseAuth();
  const { canAccessAdmin, canAccessScanner } = useUserRole();
  const { canManageUsers } = useAuthorizeUserManagement();
  const eventContext = useOptionalEventContext();
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

  // Event selector for header (compact version)
  const renderEventSelector = () => {
    if (!eventContext || !user || showLandingNav) return null;
    
    const { selectedEvent, userEvents, selectEvent, hasMultipleEvents, roleInSelectedEvent } = eventContext;
    
    if (!hasMultipleEvents && selectedEvent) {
      // Single event - show compact info (VISIBLE ON ALL DEVICES)
      return (
        <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700">
          <Calendar className="h-3 md:h-3.5 w-3 md:w-3.5 text-dorado flex-shrink-0" />
          <span className="text-hueso text-xs md:text-sm font-medium truncate max-w-[100px] md:max-w-[150px]">
            {selectedEvent.event_name}
          </span>
          {roleInSelectedEvent && (
            <Badge variant="outline" className={`${getRoleBadgeClass(roleInSelectedEvent)} text-[10px] md:text-xs py-0 hidden sm:flex`}>
              {getRoleIcon(roleInSelectedEvent)}
              <span className="ml-1">{roleInSelectedEvent === 'admin' ? 'Admin' : roleInSelectedEvent === 'control' ? 'Control' : 'Scanner'}</span>
            </Badge>
          )}
        </div>
      );
    }
    
    if (hasMultipleEvents) {
      // Multiple events - show selector (VISIBLE ON ALL DEVICES)
      return (
        <div className="flex items-center gap-1.5 md:gap-2">
          <Calendar className="h-3.5 md:h-4 w-3.5 md:w-4 text-dorado flex-shrink-0" />
          <Select value={selectedEvent?.id || ''} onValueChange={selectEvent}>
            <SelectTrigger className="w-[120px] md:w-[180px] bg-gray-900/50 border-gray-700 text-hueso h-9 touch-manipulation text-xs md:text-sm">
              <SelectValue placeholder="Seleccionar evento" />
            </SelectTrigger>
            <SelectContent className="bg-gray-950 border-gray-700 z-[9999]">
              {userEvents.map((event) => (
                <SelectItem 
                  key={event.event_id} 
                  value={event.event_id}
                  className="text-hueso hover:bg-gray-800 focus:bg-gray-800 touch-manipulation min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">{event.event_name}</span>
                    {event.is_active && (
                      <span className="px-1 py-0.5 bg-dorado/20 text-dorado text-[10px] rounded">
                        Activo
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roleInSelectedEvent && (
            <Badge variant="outline" className={`${getRoleBadgeClass(roleInSelectedEvent)} text-xs hidden sm:flex`}>
              {getRoleIcon(roleInSelectedEvent)}
              <span className="ml-1">{roleInSelectedEvent === 'admin' ? 'Admin' : roleInSelectedEvent === 'control' ? 'Control' : 'Scanner'}</span>
            </Badge>
          )}
        </div>
      );
    }
    
    return null;
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
        
        {/* Event Selector in center */}
        {renderEventSelector()}
        
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
