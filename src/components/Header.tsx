
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'EVENTO QR ACCESS' }) => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <header className="bg-empresarial border-b border-dorado/30 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl md:text-2xl font-bold text-dorado">{title}</h1>
        </div>
        <div className="flex space-x-2">
          {isAuthenticated && (
            <>
              <Button
                variant="ghost"
                className="text-hueso hover:text-dorado hover:bg-empresarial"
                onClick={() => handleNavigation('/scanner')}
              >
                Scanner
              </Button>
              <Button
                variant="ghost"
                className="text-hueso hover:text-dorado hover:bg-empresarial"
                onClick={() => handleNavigation('/admin')}
              >
                Admin
              </Button>
              <Button
                variant="outline"
                className="border-dorado text-dorado hover:bg-dorado/10"
                onClick={logout}
              >
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
