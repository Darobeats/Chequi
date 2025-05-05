
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import AttendeeList from '@/components/AttendeeList';
import ExportButton from '@/components/ExportButton';

const Admin = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-empresarial flex flex-col">
        <Header title="ADMIN DASHBOARD" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-hueso">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title="ADMIN DASHBOARD" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-dorado">Panel de Control</h1>
          <ExportButton />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-lg font-medium mb-1">Asistentes Registrados</h3>
            <p className="text-3xl font-bold text-dorado">5</p>
          </div>
          
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-lg font-medium mb-1">Ingresos Registrados</h3>
            <p className="text-3xl font-bold text-dorado">2</p>
          </div>
          
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-lg font-medium mb-1">Tickets Disponibles</h3>
            <p className="text-3xl font-bold text-dorado">3</p>
          </div>
        </div>
        
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow">
          <h2 className="text-xl font-semibold text-dorado mb-4">Lista de Asistentes</h2>
          <AttendeeList />
        </div>
      </div>
    </div>
  );
};

export default Admin;
