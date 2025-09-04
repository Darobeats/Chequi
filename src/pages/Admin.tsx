import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import Header from '@/components/Header';
import AttendeeList from '@/components/AttendeeList';
import AttendeesManager from '@/components/AttendeesManager';
import ControlAnalytics from '@/components/ControlAnalytics';
import ExportButton from '@/components/ExportButton';
import EventConfig from '@/components/EventConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAttendees, useControlUsage, useControlTypes, useTicketCategories } from '@/hooks/useSupabaseData';
import { BarChart3, Users, FileText, Settings, UserPlus } from 'lucide-react';

const Admin = () => {
  const { user, loading } = useSupabaseAuth();
  const { isAdmin, isControl, isViewer, canAccessAdmin, canAccessConfig, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  
  const { data: attendees = [] } = useAttendees();
  const { data: controlUsage = [] } = useControlUsage();
  const { data: controlTypes = [] } = useControlTypes();
  const { data: ticketCategories = [] } = useTicketCategories();

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    } else if (user && !roleLoading && !canAccessAdmin) {
      navigate('/dashboard');
    }
  }, [user, loading, canAccessAdmin, roleLoading, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-empresarial flex flex-col">
        <Header title="ADMIN DASHBOARD" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-hueso">Cargando...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalAttendees = attendees.length;
  const totalUsages = controlUsage.length;
  const attendeesWithUsage = new Set(controlUsage.map(usage => usage.attendee_id)).size;
  const attendeesWithQR = attendees.filter(a => a.qr_code).length;

  // Usage by control type
  const usageByControlType = controlTypes.map(controlType => {
    const usageCount = controlUsage.filter(usage => usage.control_type_id === controlType.id).length;
    return {
      name: controlType.name,
      count: usageCount,
      color: controlType.color
    };
  });

  // Attendees by category
  const attendeesByCategory = ticketCategories.map(category => {
    const count = attendees.filter(attendee => attendee.category_id === category.id).length;
    return {
      name: category.name,
      count,
      color: category.color
    };
  });

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title="ADMIN DASHBOARD" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-dorado">Panel de Control</h1>
          <ExportButton />
        </div>
        
        {/* Main Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-lg font-medium mb-1">Total Asistentes</h3>
            <p className="text-3xl font-bold text-dorado">{totalAttendees}</p>
          </div>
          
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-lg font-medium mb-1">Con QR Generado</h3>
            <p className="text-3xl font-bold text-dorado">{attendeesWithQR}</p>
          </div>
          
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-lg font-medium mb-1">Con Registros</h3>
            <p className="text-3xl font-bold text-dorado">{attendeesWithUsage}</p>
          </div>
          
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-lg font-medium mb-1">Total Usos</h3>
            <p className="text-3xl font-bold text-dorado">{totalUsages}</p>
          </div>
          
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-lg font-medium mb-1">Sin Registros</h3>
            <p className="text-3xl font-bold text-dorado">{totalAttendees - attendeesWithUsage}</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className={`grid w-full ${canAccessConfig ? 'grid-cols-4' : 'grid-cols-3'} bg-gray-900/50 border border-gray-800`}>
            <TabsTrigger 
              value="analytics" 
              className="flex items-center gap-2 data-[state=active]:bg-dorado data-[state=active]:text-empresarial"
            >
              <BarChart3 className="h-4 w-4" />
              Análisis
            </TabsTrigger>
            <TabsTrigger 
              value="attendees" 
              className="flex items-center gap-2 data-[state=active]:bg-dorado data-[state=active]:text-empresarial"
            >
              <Users className="h-4 w-4" />
              Asistentes
            </TabsTrigger>
            <TabsTrigger 
              value="summary" 
              className="flex items-center gap-2 data-[state=active]:bg-dorado data-[state=active]:text-empresarial"
            >
              <FileText className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            {canAccessConfig && (
              <TabsTrigger 
                value="config" 
                className="flex items-center gap-2 data-[state=active]:bg-dorado data-[state=active]:text-empresarial"
              >
                <Settings className="h-4 w-4" />
                Configuración
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <ControlAnalytics />
          </TabsContent>

          <TabsContent value="attendees" className="space-y-6">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow">
              <h2 className="text-xl font-semibold text-dorado mb-4">Lista de Asistentes</h2>
              <AttendeeList />
            </div>
          </TabsContent>


          <TabsContent value="summary" className="space-y-6">
            {/* Control Types Usage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow">
                <h3 className="text-xl font-semibold text-dorado mb-4">Uso por Tipo de Control</h3>
                <div className="space-y-3">
                  {usageByControlType.map((usage) => (
                    <div key={usage.name} className="flex justify-between items-center">
                      <span className="text-hueso capitalize">{usage.name}</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: usage.color || '#64748B' }}
                        ></div>
                        <span className="text-dorado font-medium">{usage.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow">
                <h3 className="text-xl font-semibold text-dorado mb-4">Asistentes por Categoría</h3>
                <div className="space-y-3">
                  {attendeesByCategory.map((category) => (
                    <div key={category.name} className="flex justify-between items-center">
                      <span className="text-hueso capitalize">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color || '#64748B' }}
                        ></div>
                        <span className="text-dorado font-medium">{category.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {canAccessConfig && (
            <TabsContent value="config" className="space-y-6">
              <EventConfig />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
