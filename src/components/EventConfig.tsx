
import React, { useState } from 'react';
import { useEventConfigs, useUpdateEventConfig, useCreateEventConfig, useActivateEventConfig } from '@/hooks/useEventConfig';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EventConfig as EventConfigType } from '@/types/database';
import { Palette, Type, Image, Settings, Save, Plus, Check, UserPlus, QrCode, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AttendeesManager from '@/components/AttendeesManager';
import TicketManagement from '@/components/TicketManagement';

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
  const { data: eventConfigs = [], isLoading } = useEventConfigs();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const updateEventConfig = useUpdateEventConfig();
  const createEventConfig = useCreateEventConfig();
  const activateEventConfig = useActivateEventConfig();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('configuration');
  const [editingConfig, setEditingConfig] = useState<EventConfigType | null>(null);
  const [newConfig, setNewConfig] = useState({
    event_name: '',
    primary_color: '#D4AF37',
    secondary_color: '#0A0A0A',
    accent_color: '#F8F9FA',
    logo_url: '',
    event_image_url: '',
    font_family: 'Inter, sans-serif',
    is_active: false
  });

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-hueso">Cargando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acceso Restringido</CardTitle>
            <CardDescription className="text-center">
              No tienes permisos para acceder a la configuración de eventos.
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
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
      setEditingConfig(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración.",
        variant: "destructive",
      });
    }
  };

  const handleCreateConfig = async () => {
    try {
      await createEventConfig.mutateAsync(newConfig);
      toast({
        title: "Configuración creada",
        description: "Nueva configuración de evento creada exitosamente.",
      });
      setNewConfig({
        event_name: '',
        primary_color: '#D4AF37',
        secondary_color: '#0A0A0A',
        accent_color: '#F8F9FA',
        logo_url: '',
        event_image_url: '',
        font_family: 'Inter, sans-serif',
        is_active: false
      });
      setActiveTab('configuration');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la configuración.",
        variant: "destructive",
      });
    }
  };

  const handleActivateConfig = async (configId: string) => {
    try {
      await activateEventConfig.mutateAsync(configId);
      toast({
        title: "Configuración activada",
        description: "La configuración del evento está ahora activa.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo activar la configuración.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-hueso">Cargando configuraciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-dorado" />
        <h2 className="text-2xl font-bold text-dorado">Configuración de Eventos</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border border-gray-800">
          <TabsTrigger value="configuration" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración de Evento
          </TabsTrigger>
          <TabsTrigger value="ticket-management" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Gestión de Tickets
          </TabsTrigger>
          <TabsTrigger value="qr-management" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Gestión de QR
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          {/* Existing Configurations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dorado">Configuraciones Existentes</h3>
            {eventConfigs.map((config) => (
              <Card key={config.id} className="bg-gray-900/50 border border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-dorado flex items-center gap-2">
                        {config.event_name}
                        {config.is_active && <Badge className="bg-green-600">Activo</Badge>}
                      </CardTitle>
                      <CardDescription>
                        Creado: {new Date(config.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {!config.is_active && (
                        <Button
                          size="sm"
                          onClick={() => handleActivateConfig(config.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Activar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingConfig(config)}
                        className="border-dorado text-dorado hover:bg-dorado hover:text-empresarial"
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-gray-400">Color Primario</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-6 h-6 rounded border border-gray-600" 
                          style={{ backgroundColor: config.primary_color }}
                        />
                        <span className="text-hueso text-sm">{config.primary_color}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400">Color Secundario</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-6 h-6 rounded border border-gray-600" 
                          style={{ backgroundColor: config.secondary_color }}
                        />
                        <span className="text-hueso text-sm">{config.secondary_color}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400">Color de Acento</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-6 h-6 rounded border border-gray-600" 
                          style={{ backgroundColor: config.accent_color }}
                        />
                        <span className="text-hueso text-sm">{config.accent_color}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400">Fuente</Label>
                      <p className="text-hueso text-sm mt-1">{config.font_family}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* New Configuration Form */}
          <Card className="bg-gray-900/50 border border-gray-800">
            <CardHeader>
              <CardTitle className="text-dorado flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nueva Configuración de Evento
              </CardTitle>
              <CardDescription>
                Crea una nueva configuración personalizada para tu evento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="event_name" className="text-hueso">Nombre del Evento</Label>
                    <Input
                      id="event_name"
                      value={newConfig.event_name}
                      onChange={(e) => setNewConfig({ ...newConfig, event_name: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-hueso"
                      placeholder="Mi Evento 2024"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-hueso flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Colores
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="primary_color" className="text-sm text-gray-400">Primario</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="primary_color"
                            type="color"
                            value={newConfig.primary_color}
                            onChange={(e) => setNewConfig({ ...newConfig, primary_color: e.target.value })}
                            className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                          />
                          <Input
                            value={newConfig.primary_color}
                            onChange={(e) => setNewConfig({ ...newConfig, primary_color: e.target.value })}
                            className="bg-gray-800 border-gray-700 text-hueso text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="secondary_color" className="text-sm text-gray-400">Secundario</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="secondary_color"
                            type="color"
                            value={newConfig.secondary_color}
                            onChange={(e) => setNewConfig({ ...newConfig, secondary_color: e.target.value })}
                            className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                          />
                          <Input
                            value={newConfig.secondary_color}
                            onChange={(e) => setNewConfig({ ...newConfig, secondary_color: e.target.value })}
                            className="bg-gray-800 border-gray-700 text-hueso text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="accent_color" className="text-sm text-gray-400">Acento</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="accent_color"
                            type="color"
                            value={newConfig.accent_color}
                            onChange={(e) => setNewConfig({ ...newConfig, accent_color: e.target.value })}
                            className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                          />
                          <Input
                            value={newConfig.accent_color}
                            onChange={(e) => setNewConfig({ ...newConfig, accent_color: e.target.value })}
                            className="bg-gray-800 border-gray-700 text-hueso text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-hueso flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Fuente
                    </Label>
                    <select
                      value={newConfig.font_family}
                      onChange={(e) => setNewConfig({ ...newConfig, font_family: e.target.value })}
                      className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-md text-hueso"
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-hueso flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Imágenes
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="logo_url" className="text-sm text-gray-400">URL del Logo</Label>
                    <Input
                      id="logo_url"
                      value={newConfig.logo_url}
                      onChange={(e) => setNewConfig({ ...newConfig, logo_url: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-hueso"
                      placeholder="https://ejemplo.com/logo.png"
                    />
                  </div>

                  <div>
                    <Label htmlFor="event_image_url" className="text-sm text-gray-400">URL de Imagen del Evento</Label>
                    <Input
                      id="event_image_url"
                      value={newConfig.event_image_url}
                      onChange={(e) => setNewConfig({ ...newConfig, event_image_url: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-hueso"
                      placeholder="https://ejemplo.com/evento.jpg"
                    />
                  </div>

                  <div className="pt-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-400">Vista Previa</Label>
                      <div 
                        className="w-full h-24 rounded-lg border border-gray-700 flex items-center justify-center"
                        style={{
                          backgroundColor: newConfig.secondary_color,
                          color: newConfig.accent_color,
                          fontFamily: newConfig.font_family
                        }}
                      >
                        <div 
                          className="px-4 py-2 rounded"
                          style={{ 
                            backgroundColor: newConfig.primary_color,
                            color: newConfig.secondary_color 
                          }}
                        >
                          {newConfig.event_name || 'Vista Previa'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleCreateConfig}
                  disabled={!newConfig.event_name}
                  className="bg-dorado text-empresarial hover:bg-dorado/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Crear Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ticket-management" className="space-y-6">
          <TicketManagement />
        </TabsContent>

        <TabsContent value="qr-management" className="space-y-6">
          <Card className="bg-gray-900/50 border border-gray-800">
            <CardHeader>
              <CardTitle className="text-dorado flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Gestión de Asistentes y QR
              </CardTitle>
              <CardDescription>
                Administra asistentes, genera QR codes y gestiona el acceso al evento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendeesManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de edición */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-800">
            <CardHeader>
              <CardTitle className="text-dorado">Editar Configuración</CardTitle>
              <CardDescription>Modifica la configuración del evento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit_event_name" className="text-hueso">Nombre del Evento</Label>
                <Input
                  id="edit_event_name"
                  value={editingConfig.event_name}
                  onChange={(e) => setEditingConfig({ ...editingConfig, event_name: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-hueso"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm text-gray-400">Color Primario</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={editingConfig.primary_color}
                      onChange={(e) => setEditingConfig({ ...editingConfig, primary_color: e.target.value })}
                      className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                    />
                    <Input
                      value={editingConfig.primary_color}
                      onChange={(e) => setEditingConfig({ ...editingConfig, primary_color: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-hueso text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-400">Color Secundario</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={editingConfig.secondary_color}
                      onChange={(e) => setEditingConfig({ ...editingConfig, secondary_color: e.target.value })}
                      className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                    />
                    <Input
                      value={editingConfig.secondary_color}
                      onChange={(e) => setEditingConfig({ ...editingConfig, secondary_color: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-hueso text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-400">Color de Acento</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={editingConfig.accent_color}
                      onChange={(e) => setEditingConfig({ ...editingConfig, accent_color: e.target.value })}
                      className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                    />
                    <Input
                      value={editingConfig.accent_color}
                      onChange={(e) => setEditingConfig({ ...editingConfig, accent_color: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-hueso text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-hueso">Fuente</Label>
                <select
                  value={editingConfig.font_family}
                  onChange={(e) => setEditingConfig({ ...editingConfig, font_family: e.target.value })}
                  className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-md text-hueso"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-400">URL del Logo</Label>
                  <Input
                    value={editingConfig.logo_url || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, logo_url: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-400">URL de Imagen del Evento</Label>
                  <Input
                    value={editingConfig.event_image_url || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, event_image_url: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    placeholder="https://ejemplo.com/evento.jpg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingConfig(null)}
                  className="border-gray-700 text-hueso hover:bg-gray-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateConfig}
                  className="bg-dorado text-empresarial hover:bg-dorado/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
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
