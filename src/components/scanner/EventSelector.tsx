import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Shield, Users, Scan } from 'lucide-react';
import { useEventContext, UserEventAssignment } from '@/context/EventContext';
import { Badge } from '@/components/ui/badge';

interface EventSelectorProps {
  compact?: boolean;
  showRole?: boolean;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <Shield className="h-3 w-3" />;
    case 'control': return <Users className="h-3 w-3" />;
    case 'scanner': return <Scan className="h-3 w-3" />;
    default: return null;
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'control': return 'Control';
    case 'scanner': return 'Scanner';
    default: return role;
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

const EventSelector: React.FC<EventSelectorProps> = ({ compact = false, showRole = true }) => {
  const { selectedEvent, userEvents, isLoadingEvents, selectEvent, hasMultipleEvents, roleInSelectedEvent } = useEventContext();

  if (isLoadingEvents) {
    return (
      <div className={`${compact ? 'px-2' : 'w-full mb-4 md:mb-6 p-3 md:p-4'} bg-gray-900/50 rounded-lg border border-gray-800`}>
        <p className="text-hueso text-center text-sm">Cargando eventos...</p>
      </div>
    );
  }

  if (userEvents.length === 0) {
    return (
      <div className={`${compact ? 'px-2' : 'w-full mb-4 md:mb-6 p-3 md:p-4'} bg-gray-900/50 rounded-lg border border-gray-800`}>
        <p className="text-hueso text-center text-sm">No tienes eventos asignados</p>
      </div>
    );
  }

  // If only one event, show simplified view
  if (!hasMultipleEvents && selectedEvent) {
    return (
      <div className={`${compact ? 'flex items-center gap-2' : 'w-full mb-4 md:mb-6 p-3 md:p-4 bg-gray-900/50 rounded-lg border border-gray-800'}`}>
        {!compact && (
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-dorado flex-shrink-0" />
            <span className="text-hueso font-medium">{selectedEvent.event_name}</span>
          </div>
        )}
        {compact && (
          <span className="text-hueso text-sm font-medium truncate max-w-[150px]">
            {selectedEvent.event_name}
          </span>
        )}
        {showRole && roleInSelectedEvent && (
          <Badge variant="outline" className={`${getRoleBadgeClass(roleInSelectedEvent)} text-xs`}>
            {getRoleIcon(roleInSelectedEvent)}
            <span className="ml-1">{getRoleLabel(roleInSelectedEvent)}</span>
          </Badge>
        )}
      </div>
    );
  }

  // Multiple events - show selector
  return (
    <div className={`${compact ? '' : 'w-full mb-4 md:mb-6 p-3 md:p-4 bg-gray-900/50 rounded-lg border border-gray-800'}`}>
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 md:h-5 md:w-5 text-dorado flex-shrink-0" />
          <Label htmlFor="event-select" className="text-hueso text-base md:text-lg font-semibold">
            Seleccionar Evento
          </Label>
        </div>
      )}
      
      <Select value={selectedEvent?.id || ''} onValueChange={selectEvent}>
        <SelectTrigger 
          id="event-select"
          className={`${compact ? 'w-[200px]' : 'w-full'} bg-gray-950 border-gray-700 text-hueso hover:border-dorado focus:border-dorado transition-colors min-h-[44px] touch-manipulation`}
        >
          <SelectValue placeholder="Selecciona un evento" />
        </SelectTrigger>
        <SelectContent className="bg-gray-950 border-gray-700 z-[9999] max-h-[300px]">
          {userEvents.map((event) => (
            <SelectItem 
              key={event.event_id} 
              value={event.event_id}
              className="text-hueso hover:bg-gray-800 focus:bg-gray-800 cursor-pointer min-h-[44px] touch-manipulation"
            >
              <div className="flex items-center justify-between w-full py-1 gap-2">
                <span className="font-medium text-sm md:text-base truncate">{event.event_name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {event.is_active && (
                    <span className="px-1.5 py-0.5 bg-dorado/20 text-dorado text-xs rounded">
                      Activo
                    </span>
                  )}
                  <Badge variant="outline" className={`${getRoleBadgeClass(event.role_in_event)} text-xs`}>
                    {getRoleLabel(event.role_in_event)}
                  </Badge>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!compact && selectedEvent && (
        <div className="flex items-center gap-2 mt-2">
          <p className="text-xs md:text-sm text-gray-400">
            Evento: {selectedEvent.event_name}
          </p>
          {showRole && roleInSelectedEvent && (
            <Badge variant="outline" className={`${getRoleBadgeClass(roleInSelectedEvent)} text-xs`}>
              {getRoleIcon(roleInSelectedEvent)}
              <span className="ml-1">{getRoleLabel(roleInSelectedEvent)}</span>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default EventSelector;
