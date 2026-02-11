import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useEventContext } from '@/context/EventContext';
import Header from '@/components/Header';
import AttendeeList from '@/components/AttendeeList';
import AttendeesManager from '@/components/AttendeesManager';
import ControlAnalytics from '@/components/ControlAnalytics';
import ExportButton from '@/components/ExportButton';
import EventConfig from '@/components/EventConfig';
import ScannerSetup from '@/components/scanner/ScannerSetup';
import { CedulaDashboardMonitor } from '@/components/cedula/CedulaDashboardMonitor';
import CedulaControlAnalytics from '@/components/analytics/CedulaControlAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAttendees, useControlUsage, useControlTypes, useTicketCategories } from '@/hooks/useSupabaseData';
import { useCedulaStats } from '@/hooks/useCedulaRegistros';
import { useCedulaControlStats } from '@/hooks/useCedulaControlUsage';
import { BarChart3, Users, FileText, Settings, ClipboardCheck, IdCard, Utensils } from 'lucide-react';

const Admin = () => {
  const { user, loading } = useSupabaseAuth();
  const { isAdmin, isControl, canAccessAdmin, canAccessConfig, canModifyData, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const { t } = useTranslation('common');
  
  const { selectedEvent } = useEventContext();
  const { data: attendees = [] } = useAttendees();
  const { data: controlUsage = [] } = useControlUsage();
  const { data: controlTypes = [] } = useControlTypes();
  const { data: ticketCategories = [] } = useTicketCategories();
  
  const { data: cedulaStats } = useCedulaStats(selectedEvent?.id || null);
  const { data: cedulaControlStats } = useCedulaControlStats(selectedEvent?.id || null);

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
        <Header title={t('admin.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-hueso">{t('admin.loading')}</p>
        </div>
      </div>
    );
  }

  const totalAttendees = attendees.length;
  const totalUsages = controlUsage.length;
  const attendeesWithUsage = new Set(controlUsage.map(usage => usage.attendee_id)).size;
  const attendeesWithQR = attendees.filter(a => a.qr_code).length;

  const usageByControlType = controlTypes.map(controlType => {
    const usageCount = controlUsage.filter(usage => usage.control_type_id === controlType.id).length;
    return { name: controlType.name, count: usageCount, color: controlType.color };
  });

  const attendeesByCategory = ticketCategories.map(category => {
    const count = attendees.filter(attendee => attendee.category_id === category.id).length;
    return { name: category.name, count, color: category.color };
  });

  return (
    <div className="min-h-screen bg-empresarial flex flex-col">
      <Header title={t('admin.title')} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-dorado">{t('admin.controlPanel')}</h1>
          {isAdmin && (
            <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  {t('admin.preEventCheck')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('admin.systemVerification')}</DialogTitle>
                </DialogHeader>
                <ScannerSetup onSetupComplete={() => setShowSetupDialog(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 mb-8">
          <div className="bg-gray-900/50 p-4 md:p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-base md:text-lg font-medium mb-1">{t('admin.totalAttendees')}</h3>
            <p className="text-2xl md:text-3xl font-bold text-dorado">{totalAttendees}</p>
          </div>
          <div className="bg-gray-900/50 p-4 md:p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-base md:text-lg font-medium mb-1">{t('admin.withQR')}</h3>
            <p className="text-2xl md:text-3xl font-bold text-dorado">{attendeesWithQR}</p>
          </div>
          <div className="bg-gray-900/50 p-4 md:p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-base md:text-lg font-medium mb-1">{t('admin.withRecords')}</h3>
            <p className="text-2xl md:text-3xl font-bold text-dorado">{attendeesWithUsage}</p>
          </div>
          <div className="bg-gray-900/50 p-4 md:p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-base md:text-lg font-medium mb-1">{t('admin.totalUsages')}</h3>
            <p className="text-2xl md:text-3xl font-bold text-dorado">{totalUsages}</p>
          </div>
          <div className="bg-gray-900/50 p-4 md:p-6 rounded-lg border border-gray-800 shadow card-hover">
            <h3 className="text-hueso text-base md:text-lg font-medium mb-1">{t('admin.withoutRecords')}</h3>
            <p className="text-2xl md:text-3xl font-bold text-dorado">{totalAttendees - attendeesWithUsage}</p>
          </div>
        </div>

        {(cedulaStats?.total > 0 || cedulaControlStats?.total > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-gray-900/50 p-4 md:p-6 rounded-lg border border-amber-800/50 shadow card-hover">
              <h3 className="text-hueso text-base md:text-lg font-medium mb-1 flex items-center gap-2">
                <IdCard className="h-4 w-4 text-amber-400" />
                {t('admin.cedulasScanned')}
              </h3>
              <p className="text-2xl md:text-3xl font-bold text-amber-400">{cedulaStats?.total || 0}</p>
              <p className="text-xs text-hueso/60 mt-1">{t('admin.today')}: {cedulaStats?.today || 0}</p>
            </div>
            <div className="bg-gray-900/50 p-4 md:p-6 rounded-lg border border-green-800/50 shadow card-hover">
              <h3 className="text-hueso text-base md:text-lg font-medium mb-1 flex items-center gap-2">
                <Utensils className="h-4 w-4 text-green-400" />
                {t('admin.consumablesRegistered')}
              </h3>
              <p className="text-2xl md:text-3xl font-bold text-green-400">{cedulaControlStats?.total || 0}</p>
              <p className="text-xs text-hueso/60 mt-1">{t('admin.today')}: {cedulaControlStats?.today || 0}</p>
            </div>
            {(cedulaControlStats?.byControl || []).slice(0, 2).map((item) => {
              const controlType = controlTypes.find(ct => ct.id === item.controlTypeId);
              return (
                <div key={item.controlTypeId} className="bg-gray-900/50 p-4 md:p-6 rounded-lg border border-blue-800/50 shadow card-hover">
                  <h3 className="text-hueso text-base md:text-lg font-medium mb-1 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: controlType?.color || '#3b82f6' }} />
                    {controlType?.name || 'Control'}
                  </h3>
                  <p className="text-2xl md:text-3xl font-bold text-blue-400">{item.count}</p>
                </div>
              );
            })}
          </div>
        )}

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className={`grid w-full ${canAccessConfig ? 'grid-cols-4' : 'grid-cols-3'} bg-gray-900/50 border border-gray-800 p-2 gap-2`}>
            <TabsTrigger value="analytics" className="flex items-center justify-center gap-2 py-2.5 rounded-md data-[state=active]:bg-dorado data-[state=active]:text-empresarial">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{t('admin.analytics')}</span>
            </TabsTrigger>
            <TabsTrigger value="attendees" className="flex items-center justify-center gap-2 py-2.5 rounded-md data-[state=active]:bg-dorado data-[state=active]:text-empresarial">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{t('admin.attendees')}</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center justify-center gap-2 py-2.5 rounded-md data-[state=active]:bg-dorado data-[state=active]:text-empresarial">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{t('admin.summary')}</span>
            </TabsTrigger>
            {canAccessConfig && (
              <TabsTrigger value="config" className="flex items-center justify-center gap-2 py-2.5 rounded-md data-[state=active]:bg-dorado data-[state=active]:text-empresarial">
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">{t('admin.config')}</span>
                  <span className="sm:hidden">Config</span>
                </span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <ControlAnalytics />
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-dorado mb-4">{t('admin.consumableControl')}</h2>
              <CedulaControlAnalytics />
            </div>
            <div className="mt-6">
              <CedulaDashboardMonitor />
            </div>
          </TabsContent>

          <TabsContent value="attendees" className="space-y-6">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow">
              <h2 className="text-xl font-semibold text-dorado mb-4">{t('admin.attendeeList')}</h2>
              <AttendeeList />
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow">
                <h3 className="text-xl font-semibold text-dorado mb-4">{t('admin.usageByControlType')}</h3>
                <div className="space-y-3">
                  {usageByControlType.map((usage) => (
                    <div key={usage.name} className="flex justify-between items-center">
                      <span className="text-hueso capitalize">{usage.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: usage.color || '#64748B' }} />
                        <span className="text-dorado font-medium">{usage.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800 shadow">
                <h3 className="text-xl font-semibold text-dorado mb-4">{t('admin.attendeesByCategory')}</h3>
                <div className="space-y-3">
                  {attendeesByCategory.map((category) => (
                    <div key={category.name} className="flex justify-between items-center">
                      <span className="text-hueso capitalize">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || '#64748B' }} />
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
