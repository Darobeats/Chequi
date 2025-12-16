import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './SupabaseAuthContext';
import { EventConfig } from '@/types/database';

export interface UserEventAssignment {
  event_id: string;
  event_name: string;
  role_in_event: 'admin' | 'control' | 'scanner';
  is_primary: boolean;
  event_status: string;
  event_date: string | null;
  is_active: boolean;
}

interface EventContextType {
  selectedEvent: EventConfig | null;
  userEvents: UserEventAssignment[];
  isLoadingEvents: boolean;
  selectEvent: (eventId: string) => void;
  hasMultipleEvents: boolean;
  roleInSelectedEvent: 'admin' | 'control' | 'scanner' | null;
  refetchUserEvents: () => void;
}

const EventContext = createContext<EventContextType | null>(null);

const SELECTED_EVENT_KEY = 'selectedEventId';

export function EventProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseAuth();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SELECTED_EVENT_KEY);
    }
    return null;
  });

  // Fetch user's assigned events
  const { data: userEvents = [], isLoading: isLoadingEvents, refetch: refetchUserEvents } = useQuery({
    queryKey: ['user_events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('get_user_events', {
        check_user_id: user.id
      });
      
      if (error) {
        console.error('Error fetching user events:', error);
        return [];
      }
      
      return (data || []) as UserEventAssignment[];
    },
    enabled: !!user?.id,
  });

  // Fetch selected event details
  const { data: selectedEvent } = useQuery({
    queryKey: ['selected_event', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null;
      
      const { data, error } = await supabase
        .from('event_configs')
        .select('*')
        .eq('id', selectedEventId)
        .single();
      
      if (error) {
        console.error('Error fetching selected event:', error);
        return null;
      }
      
      return data as EventConfig;
    },
    enabled: !!selectedEventId,
  });

  // Auto-select event logic
  useEffect(() => {
    if (isLoadingEvents || userEvents.length === 0) return;

    // If no event selected, or selected event is not in user's list
    const currentEventValid = selectedEventId && userEvents.some(e => e.event_id === selectedEventId);
    
    if (!currentEventValid) {
      // Select primary event first, then first available
      const primaryEvent = userEvents.find(e => e.is_primary);
      const activeEvent = userEvents.find(e => e.is_active);
      const eventToSelect = primaryEvent || activeEvent || userEvents[0];
      
      if (eventToSelect) {
        setSelectedEventId(eventToSelect.event_id);
        localStorage.setItem(SELECTED_EVENT_KEY, eventToSelect.event_id);
      }
    }
  }, [userEvents, isLoadingEvents, selectedEventId]);

  // Clear selection on logout
  useEffect(() => {
    if (!user) {
      setSelectedEventId(null);
      localStorage.removeItem(SELECTED_EVENT_KEY);
    }
  }, [user]);

  const selectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    localStorage.setItem(SELECTED_EVENT_KEY, eventId);
  };

  const hasMultipleEvents = userEvents.length > 1;
  
  const roleInSelectedEvent = selectedEventId 
    ? userEvents.find(e => e.event_id === selectedEventId)?.role_in_event || null
    : null;

  const value: EventContextType = {
    selectedEvent,
    userEvents,
    isLoadingEvents,
    selectEvent,
    hasMultipleEvents,
    roleInSelectedEvent,
    refetchUserEvents,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
}

// Hook for components that need event context but can work without it (e.g., landing page)
export function useOptionalEventContext() {
  return useContext(EventContext);
}
