
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is authenticated from localStorage
    const checkAuth = () => {
      const auth = localStorage.getItem('evento-auth');
      setIsAuthenticated(auth === 'true');
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    
    // This would be replaced with an actual API call to send a magic link
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email && email.includes('@')) {
          localStorage.setItem('evento-auth', 'true');
          setIsAuthenticated(true);
          resolve({ success: true, message: 'Magic link sent! For demo purposes, you will be logged in automatically.' });
        } else {
          resolve({ success: false, message: 'Please enter a valid email address.' });
        }
        setLoading(false);
      }, 1000);
    });
  };

  const logout = () => {
    localStorage.removeItem('evento-auth');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
