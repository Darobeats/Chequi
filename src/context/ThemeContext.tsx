
import React, { createContext, useContext, useEffect } from 'react';
import { useActiveEventConfig } from '@/hooks/useEventConfig';

interface ThemeContextType {
  eventConfig: any;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: eventConfig, isLoading } = useActiveEventConfig();

  useEffect(() => {
    if (eventConfig) {
      // Apply custom CSS variables
      const root = document.documentElement;
      root.style.setProperty('--primary-color', eventConfig.primary_color || '#D4AF37');
      root.style.setProperty('--secondary-color', eventConfig.secondary_color || '#0A0A0A');
      root.style.setProperty('--accent-color', eventConfig.accent_color || '#F8F9FA');
      
      // Apply font family
      if (eventConfig.font_family) {
        root.style.setProperty('--font-family', eventConfig.font_family);
        document.body.style.fontFamily = eventConfig.font_family;
      }

      // Update document title
      if (eventConfig.event_name) {
        document.title = `${eventConfig.event_name} - Control de Acceso`;
      }
    }
  }, [eventConfig]);

  return (
    <ThemeContext.Provider value={{ eventConfig, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
