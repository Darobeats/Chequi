
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEventConfigs, useUpdateEventConfig, useCreateEventConfig } from '@/hooks/useEventConfig';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventConfig as EventConfigType, Attendee } from '@/types/database';
import { Palette, Type, Image, Settings, Save, Plus, UserPlus, QrCode, Tag, Users, RefreshCw, Ticket, Shield, UsersRound, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import AttendeesManager from '@/components/AttendeesManager';
import TicketManagement from '@/components/TicketManagement';
import AttendeeManagement from '@/components/AttendeeManagement';
import BulkTicketAssignment from '@/components/BulkTicketAssignment';
import TicketTemplateEditor from '@/components/TicketTemplateEditor';
import { useTicketTemplates, useDeleteTicketTemplate, TicketTemplate } from '@/hooks/useTicketTemplates';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2 } from 'lucide-react';
import { ExportTicketsPNG } from '@/components/ExportTicketsPNG';
import { CedulasAutorizadasManager } from '@/components/cedula/CedulasAutorizadasManager';
import { EventTeamManager } from '@/components/EventTeamManager';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useEventContext } from '@/context/EventContext';

const FONT_OPTIONS = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: 'Open Sans, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Lato', value: 'Lato, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Source Sans Pro', value: 'Source Sans Pro, sans-serif' },
  { name: 'Oswald', value: 'Oswald, sans-serif' }
];

const EventConfig = () => {
  const { t } = useTranslation('common');
  const { data: eventConfigs = [], isLoading } = useEventConfigs();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { selectedEvent, userEvents, selectEvent } = useEventContext();
  const updateEventConfig = useUpdateEventConfig();
  const createEventConfig = useCreateEventConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState('configuration');
  const [editingConfig, setEditingConfig] = useState<EventConfigType | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const { data: ticketTemplates = [] } = useTicketTemplates();
  const deleteTemplateMutation = useDeleteTicketTemplate();
  
  const { data: attendees = [] } = useQuery({
    queryKey: ['attendees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          ticket_category:ticket_categories(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Attendee[];
    },
  });
  const [newConfig, setNewConfig] = useState({
    event_name: '',
    primary_color: '#D4AF37',
    secondary_color: '#0A0A0A',
    accent_color: '#F8F9FA',
    logo_url: '',
    event_image_url: '',
    font_family: 'Inter, sans-serif',
    is_active: false,
    event_date: null,
    event_status: 'active' as const
  });

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-hueso">{t('eventConfig.loading')}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t('eventConfig.restrictedAccess')}</CardTitle>
            <CardDescription className="text-center">
              {t('eventConfig.restrictedAccessDesc')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleUpdateConfig = async () => {
    if (!editingConfig) return;
    try {
      await updateEventConfig.mutateAsync(editingConfig);
      toast({ title: t('eventConfig.configUpdated'), description: t('eventConfig.configUpdatedDesc') });
      setEditingConfig(null);
    } catch (error) {
      toast({ title: t('eventConfig.error'), description: t('eventConfig.errorUpdate'), variant: "destructive" });
    }
  };

  const handleCreateConfig = async () => {
    try {
      await createEventConfig.mutateAsync(newConfig);
      toast({ title: t('eventConfig.configCreated'), description: t('eventConfig.configCreatedDesc') });
      setNewConfig({
        event_name: '', primary_color: '#D4AF37', secondary_color: '#0A0A0A', accent_color: '#F8F9FA',
        logo_url: '', event_image_url: '', font_family: 'Inter, sans-serif', is_active: false, event_date: null, event_status: 'active' as const
      });
      setActiveTab('configuration');
    } catch (error) {
      toast({ title: t('eventConfig.error'), description: t('eventConfig.errorCreate'), variant: "destructive" });
    }
  };

  const handleApplyChanges = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['eventConfigs'] });
      await queryClient.invalidateQueries({ queryKey: ['activeEventConfig'] });
      await queryClient.invalidateQueries({ queryKey: ['attendees'] });
      await queryClient.invalidateQueries({ queryKey: ['ticketCategories'] });
      await queryClient.invalidateQueries({ queryKey: ['controlTypes'] });
      await queryClient.invalidateQueries({ queryKey: ['categoryControls'] });
      await queryClient.invalidateQueries({ queryKey: ['controlUsage'] });
      toast({ title: t('eventConfig.changesApplied'), description: t('eventConfig.changesAppliedDesc') });
    } catch (error) {
      toast({ title: t('eventConfig.error'), description: t('eventConfig.errorApply'), variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-hueso">{t('eventConfig.loadingConfigs')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-dorado" />
          <h2 className="text-2xl font-bold text-dorado">{t('eventConfig.title')}</h2>
        </div>
        <div className="flex items-center gap-4">
          {userEvents.length > 0 && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-hueso/60" />
              <Select value={selectedEvent?.id || ''} onValueChange={selectEvent}>
                <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-hueso">
                  <SelectValue placeholder={t('eventConfig.selectEvent')} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {userEvents.map((event) => (
                    <SelectItem key={event.event_id} value={event.event_id} className="text-hueso">
                      {event.event_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleApplyChanges} disabled={isRefreshing} className="bg-dorado text-empresarial hover:bg-dorado/90 font-semibold">
            {isRefreshing ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />{t('eventConfig.updating')}</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />{t('eventConfig.applyChanges')}</>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-gray-900/50 border border-gray-800 gap-1 h-auto">
          <TabsTrigger value="configuration" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex flex-col lg:flex-row items-center justify-center gap-1 min-h-[48px] px-1 lg:px-2">
            <Settings className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
            <span className="text-[10px] lg:text-xs truncate max-w-full">{t('eventConfig.tabs.config')}</span>
          </TabsTrigger>
          <TabsTrigger value="ticket-management" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex flex-col lg:flex-row items-center justify-center gap-1 min-h-[48px] px-1 lg:px-2">
            <Tag className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
            <span className="text-[10px] lg:text-xs truncate max-w-full">{t('eventConfig.tabs.tickets')}</span>
          </TabsTrigger>
          <TabsTrigger value="attendee-management" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex flex-col lg:flex-row items-center justify-center gap-1 min-h-[48px] px-1 lg:px-2">
            <Users className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
            <span className="text-[10px] lg:text-xs truncate max-w-full">{t('eventConfig.tabs.attendees')}</span>
          </TabsTrigger>
          <TabsTrigger value="ticket-assignment" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex flex-col lg:flex-row items-center justify-center gap-1 min-h-[48px] px-1 lg:px-2">
            <UserPlus className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
            <span className="text-[10px] lg:text-xs truncate max-w-full">{t('eventConfig.tabs.assign')}</span>
          </TabsTrigger>
          <TabsTrigger value="ticket-templates" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex flex-col lg:flex-row items-center justify-center gap-1 min-h-[48px] px-1 lg:px-2">
            <Ticket className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
            <span className="text-[10px] lg:text-xs truncate max-w-full">{t('eventConfig.tabs.templates')}</span>
          </TabsTrigger>
          <TabsTrigger value="qr-management" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex flex-col lg:flex-row items-center justify-center gap-1 min-h-[48px] px-1 lg:px-2">
            <QrCode className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
            <span className="text-[10px] lg:text-xs truncate max-w-full">{t('eventConfig.tabs.qr')}</span>
          </TabsTrigger>
          <TabsTrigger value="whitelist" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex flex-col lg:flex-row items-center justify-center gap-1 min-h-[48px] px-1 lg:px-2">
            <Shield className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
            <span className="text-[10px] lg:text-xs truncate max-w-full">{t('eventConfig.tabs.access')}</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex flex-col lg:flex-row items-center justify-center gap-1 min-h-[48px] px-1 lg:px-2">
            <UsersRound className="h-5 w-5 lg:h-4 lg:w-4 flex-shrink-0" />
            <span className="text-[10px] lg:text-xs truncate max-w-full">{t('eventConfig.tabs.team')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dorado">{t('eventConfig.existingConfigs')}</h3>
            {eventConfigs.map((config) => (
              <Card key={config.id} className={`bg-gray-900/50 border ${selectedEvent?.id === config.id ? 'border-dorado' : 'border-gray-800'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-dorado flex items-center gap-2">
                        {config.event_name}
                        {selectedEvent?.id === config.id && <Badge className="bg-dorado text-empresarial">{t('eventConfig.selected')}</Badge>}
                        <Badge variant="outline" className={
                          config.event_status === 'active' ? 'border-green-500 text-green-500' :
                          config.event_status === 'draft' ? 'border-yellow-500 text-yellow-500' :
                          'border-gray-500 text-gray-500'
                        }>
                          {config.event_status === 'active' ? t('eventConfig.active') : 
                           config.event_status === 'draft' ? t('eventConfig.draft') : t('eventConfig.finished')}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {t('eventConfig.created')}: {new Date(config.created_at).toLocaleDateString()}
                        {config.event_date && ` | ${t('eventConfig.date')}: ${new Date(config.event_date).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingConfig(config)} className="border-dorado text-dorado hover:bg-dorado hover:text-empresarial">
                        {t('eventConfig.edit')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-gray-400">{t('eventConfig.primaryColor')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded border border-gray-600" style={{ backgroundColor: config.primary_color }} />
                        <span className="text-hueso text-sm">{config.primary_color}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400">{t('eventConfig.secondaryColor')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded border border-gray-600" style={{ backgroundColor: config.secondary_color }} />
                        <span className="text-hueso text-sm">{config.secondary_color}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400">{t('eventConfig.accentColor')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded border border-gray-600" style={{ backgroundColor: config.accent_color }} />
                        <span className="text-hueso text-sm">{config.accent_color}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400">{t('eventConfig.font')}</Label>
                      <p className="text-hueso text-sm mt-1">{config.font_family}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gray-900/50 border border-gray-800">
            <CardHeader>
              <CardTitle className="text-dorado flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {t('eventConfig.newConfig')}
              </CardTitle>
              <CardDescription>{t('eventConfig.newConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="event_name" className="text-hueso">{t('eventConfig.eventName')}</Label>
                    <Input id="event_name" value={newConfig.event_name} onChange={(e) => setNewConfig({ ...newConfig, event_name: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso" placeholder={t('eventConfig.eventNamePlaceholder')} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-hueso flex items-center gap-2"><Palette className="h-4 w-4" />{t('eventConfig.colors')}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="primary_color" className="text-sm text-gray-400">{t('eventConfig.primaryColor')}</Label>
                        <div className="flex items-center gap-2">
                          <Input id="primary_color" type="color" value={newConfig.primary_color} onChange={(e) => setNewConfig({ ...newConfig, primary_color: e.target.value })} className="w-12 h-8 p-1 bg-gray-800 border-gray-700" />
                          <Input value={newConfig.primary_color} onChange={(e) => setNewConfig({ ...newConfig, primary_color: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso text-xs" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="secondary_color" className="text-sm text-gray-400">{t('eventConfig.secondaryColor')}</Label>
                        <div className="flex items-center gap-2">
                          <Input id="secondary_color" type="color" value={newConfig.secondary_color} onChange={(e) => setNewConfig({ ...newConfig, secondary_color: e.target.value })} className="w-12 h-8 p-1 bg-gray-800 border-gray-700" />
                          <Input value={newConfig.secondary_color} onChange={(e) => setNewConfig({ ...newConfig, secondary_color: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso text-xs" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="accent_color" className="text-sm text-gray-400">{t('eventConfig.accentColor')}</Label>
                        <div className="flex items-center gap-2">
                          <Input id="accent_color" type="color" value={newConfig.accent_color} onChange={(e) => setNewConfig({ ...newConfig, accent_color: e.target.value })} className="w-12 h-8 p-1 bg-gray-800 border-gray-700" />
                          <Input value={newConfig.accent_color} onChange={(e) => setNewConfig({ ...newConfig, accent_color: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-hueso flex items-center gap-2"><Type className="h-4 w-4" />{t('eventConfig.font')}</Label>
                    <select value={newConfig.font_family} onChange={(e) => setNewConfig({ ...newConfig, font_family: e.target.value })} className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-md text-hueso">
                      {FONT_OPTIONS.map((font) => (<option key={font.value} value={font.value}>{font.name}</option>))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-hueso flex items-center gap-2"><Image className="h-4 w-4" />{t('eventConfig.images')}</Label>
                  </div>
                  <div>
                    <Label htmlFor="logo_url" className="text-sm text-gray-400">{t('eventConfig.logoUrl')}</Label>
                    <Input id="logo_url" value={newConfig.logo_url} onChange={(e) => setNewConfig({ ...newConfig, logo_url: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso" placeholder="https://ejemplo.com/logo.png" />
                  </div>
                  <div>
                    <Label htmlFor="event_image_url" className="text-sm text-gray-400">{t('eventConfig.eventImageUrl')}</Label>
                    <Input id="event_image_url" value={newConfig.event_image_url} onChange={(e) => setNewConfig({ ...newConfig, event_image_url: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso" placeholder="https://ejemplo.com/evento.jpg" />
                  </div>
                  <div className="pt-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-400">{t('eventConfig.preview')}</Label>
                      <div className="w-full h-24 rounded-lg border border-gray-700 flex items-center justify-center" style={{ backgroundColor: newConfig.secondary_color, color: newConfig.accent_color, fontFamily: newConfig.font_family }}>
                        <div className="px-4 py-2 rounded" style={{ backgroundColor: newConfig.primary_color, color: newConfig.secondary_color }}>
                          {newConfig.event_name || t('eventConfig.preview')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreateConfig} disabled={!newConfig.event_name} className="bg-dorado text-empresarial hover:bg-dorado/90">
                  <Save className="h-4 w-4 mr-2" />{t('eventConfig.createConfig')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ticket-management" className="space-y-6"><TicketManagement /></TabsContent>
        <TabsContent value="attendee-management" className="space-y-6"><AttendeeManagement /></TabsContent>
        <TabsContent value="ticket-assignment" className="space-y-6"><BulkTicketAssignment /></TabsContent>

        <TabsContent value="ticket-templates" className="space-y-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-dorado">{t('eventConfig.templates.title')}</h3>
                <p className="text-sm text-gray-400">{t('eventConfig.templates.description')}</p>
              </div>
              <Button onClick={() => { setEditingTemplate(null); setShowTemplateEditor(true); }} className="bg-dorado text-empresarial hover:bg-dorado/90">
                <Plus className="h-4 w-4 mr-2" />{t('eventConfig.templates.newTemplate')}
              </Button>
            </div>

            {showTemplateEditor ? (
              <Card className="bg-gray-900/50 border border-gray-800">
                <CardHeader>
                  <CardTitle className="text-dorado">
                    {editingTemplate ? t('eventConfig.templates.editTemplate') : t('eventConfig.templates.newTemplate')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TicketTemplateEditor template={editingTemplate} onSuccess={() => { setShowTemplateEditor(false); setEditingTemplate(null); }} onCancel={() => { setShowTemplateEditor(false); setEditingTemplate(null); }} />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {ticketTemplates.length === 0 ? (
                  <Card className="bg-gray-900/50 border border-gray-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Ticket className="h-12 w-12 text-gray-600 mb-4" />
                      <p className="text-gray-400 text-center">
                        {t('eventConfig.templates.noTemplates')}<br />{t('eventConfig.templates.noTemplatesDesc')}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  ticketTemplates.map((template) => (
                    <Card key={template.id} className="bg-gray-900/50 border border-gray-800">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-dorado">{template.name}</CardTitle>
                            <CardDescription>{template.layout} - {template.tickets_per_page} tickets</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingTemplate(template); setShowTemplateEditor(true); }} className="border-dorado text-dorado hover:bg-dorado hover:text-empresarial">
                              <Edit className="h-4 w-4 mr-1" />{t('eventConfig.edit')}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4 mr-1" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('eventConfig.templates.deleteTemplate')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('eventConfig.templates.deleteTemplateDesc', { name: template.name })}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('cedulaScanResult.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTemplateMutation.mutate(template.id)} className="bg-red-600 hover:bg-red-700">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <Label className="text-gray-400">{t('eventConfig.templates.mode')}:</Label>
                              <Badge variant="outline" className="mt-1">{template.use_visual_editor ? '🎨 Visual' : '📋 Form'}</Badge>
                            </div>
                            <div>
                              <Label className="text-gray-400">{t('eventConfig.templates.visibleFields')}</Label>
                              <div className="mt-1 space-y-1">
                                {template.show_qr && <Badge variant="outline">QR</Badge>}
                                {template.show_name && <Badge variant="outline">Name</Badge>}
                                {template.show_email && <Badge variant="outline">Email</Badge>}
                                {template.show_category && <Badge variant="outline">Category</Badge>}
                                {template.show_ticket_id && <Badge variant="outline">Ticket ID</Badge>}
                              </div>
                            </div>
                            <div>
                              <Label className="text-gray-400">{t('eventConfig.templates.qrSize')}:</Label>
                              <p className="text-hueso mt-1">{template.qr_size}px</p>
                            </div>
                            <div>
                              <Label className="text-gray-400">{t('eventConfig.templates.canvas')}:</Label>
                              <p className="text-hueso mt-1">{template.canvas_width || 800}x{template.canvas_height || 600}</p>
                            </div>
                          </div>
                          {template.use_visual_editor && template.elements && template.elements.length > 0 && (
                            <ExportTicketsPNG template={template} attendees={attendees || []} />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="qr-management" className="space-y-6">
          <Card className="bg-gray-900/50 border border-gray-800">
            <CardHeader>
              <CardTitle className="text-dorado flex items-center gap-2"><QrCode className="h-5 w-5" />{t('eventConfig.qr.title')}</CardTitle>
              <CardDescription>{t('eventConfig.qr.description')}</CardDescription>
            </CardHeader>
            <CardContent><AttendeesManager /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whitelist" className="space-y-6">
          {selectedEvent?.id ? (
            <CedulasAutorizadasManager eventId={selectedEvent.id} />
          ) : (
            <Card className="bg-gray-900/50 border border-gray-800">
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto text-hueso/30 mb-4" />
                <p className="text-hueso/60">{t('eventConfig.whitelist.noEvent')}</p>
                <p className="text-hueso/40 text-sm">{t('eventConfig.whitelist.noEventDesc')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          {selectedEvent?.id ? (
            <EventTeamManager eventId={selectedEvent.id} eventName={selectedEvent.event_name} />
          ) : (
            <Card className="bg-gray-900/50 border border-gray-800">
              <CardContent className="p-8 text-center">
                <UsersRound className="h-12 w-12 mx-auto text-hueso/30 mb-4" />
                <p className="text-hueso/60">{t('eventConfig.team.noEvent')}</p>
                <p className="text-hueso/40 text-sm">{t('eventConfig.team.noEventDesc')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {editingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-800">
            <CardHeader>
              <CardTitle className="text-dorado">{t('eventConfig.editConfig')}</CardTitle>
              <CardDescription>{t('eventConfig.editConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit_event_name" className="text-hueso">{t('eventConfig.eventName')}</Label>
                <Input id="edit_event_name" value={editingConfig.event_name} onChange={(e) => setEditingConfig({ ...editingConfig, event_name: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm text-gray-400">{t('eventConfig.primaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" value={editingConfig.primary_color} onChange={(e) => setEditingConfig({ ...editingConfig, primary_color: e.target.value })} className="w-12 h-8 p-1 bg-gray-800 border-gray-700" />
                    <Input value={editingConfig.primary_color} onChange={(e) => setEditingConfig({ ...editingConfig, primary_color: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-400">{t('eventConfig.secondaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" value={editingConfig.secondary_color} onChange={(e) => setEditingConfig({ ...editingConfig, secondary_color: e.target.value })} className="w-12 h-8 p-1 bg-gray-800 border-gray-700" />
                    <Input value={editingConfig.secondary_color} onChange={(e) => setEditingConfig({ ...editingConfig, secondary_color: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-400">{t('eventConfig.accentColor')}</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" value={editingConfig.accent_color} onChange={(e) => setEditingConfig({ ...editingConfig, accent_color: e.target.value })} className="w-12 h-8 p-1 bg-gray-800 border-gray-700" />
                    <Input value={editingConfig.accent_color} onChange={(e) => setEditingConfig({ ...editingConfig, accent_color: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso text-xs" />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-hueso">{t('eventConfig.font')}</Label>
                <select value={editingConfig.font_family} onChange={(e) => setEditingConfig({ ...editingConfig, font_family: e.target.value })} className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-md text-hueso">
                  {FONT_OPTIONS.map((font) => (<option key={font.value} value={font.value}>{font.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-400">{t('eventConfig.logoUrl')}</Label>
                  <Input value={editingConfig.logo_url || ''} onChange={(e) => setEditingConfig({ ...editingConfig, logo_url: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso" placeholder="https://ejemplo.com/logo.png" />
                </div>
                <div>
                  <Label className="text-sm text-gray-400">{t('eventConfig.eventImageUrl')}</Label>
                  <Input value={editingConfig.event_image_url || ''} onChange={(e) => setEditingConfig({ ...editingConfig, event_image_url: e.target.value })} className="bg-gray-800 border-gray-700 text-hueso" placeholder="https://ejemplo.com/evento.jpg" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingConfig(null)} className="border-gray-700 text-hueso hover:bg-gray-800">
                  {t('cedulaScanResult.cancel')}
                </Button>
                <Button onClick={handleUpdateConfig} className="bg-dorado text-empresarial hover:bg-dorado/90">
                  <Save className="h-4 w-4 mr-2" />{t('eventConfig.saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EventConfig;
