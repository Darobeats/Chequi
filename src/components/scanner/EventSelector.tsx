import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { EventConfig } from '@/types/database';

interface EventSelectorProps {
  events: EventConfig[] | undefined;
  selectedEventId: string;
  onEventChange: (eventId: string) => void;
  isLoading: boolean;
}

const EventSelector: React.FC<EventSelectorProps> = ({
  events,
  selectedEventId,
  onEventChange,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="w-full mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
        <p className="text-hueso text-center">Cargando eventos...</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="w-full mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
        <p className="text-hueso text-center">No hay eventos configurados</p>
      </div>
    );
  }

  return (
    <div className="w-full mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-dorado" />
        <Label htmlFor="event-select" className="text-hueso text-lg font-semibold">
          Seleccionar Evento
        </Label>
      </div>
      
      <Select value={selectedEventId} onValueChange={onEventChange}>
        <SelectTrigger 
          id="event-select"
          className="w-full bg-gray-950 border-gray-700 text-hueso hover:border-dorado focus:border-dorado transition-colors"
        >
          <SelectValue placeholder="Selecciona un evento" />
        </SelectTrigger>
        <SelectContent className="bg-gray-950 border-gray-700">
          {events.map((event) => (
            <SelectItem 
              key={event.id} 
              value={event.id}
              className="text-hueso hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{event.event_name}</span>
                {event.is_active && (
                  <span className="ml-2 px-2 py-0.5 bg-dorado/20 text-dorado text-xs rounded-full">
                    Activo
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedEventId && (
        <p className="text-sm text-gray-400 mt-2">
          Escaneando para: {events.find(e => e.id === selectedEventId)?.event_name}
        </p>
      )}
    </div>
  );
};

export default EventSelector;
