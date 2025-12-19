import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTicketCategories, useCreateTicketCategory, useUpdateTicketCategory, useDeleteTicketCategory, useCategoryControls, useCreateCategoryControl, useUpdateCategoryControl, useDeleteCategoryControl } from '@/hooks/useTicketCategories';
import { useControlTypes } from '@/hooks/useSupabaseData';
import { useCreateControlType, useUpdateControlType, useDeleteControlType } from '@/hooks/useControlTypeManagement';
import { Plus, Edit, Trash2, Tag, Settings, Shield, Palette, Lock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TicketCategory, ControlType } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import IconPicker from '@/components/IconPicker';
import { useEventContext } from '@/context/EventContext';

const TicketManagement = () => {
  const { selectedEvent } = useEventContext();
  const { data: categories = [], refetch: refetchCategories } = useTicketCategories();
  const { data: controlTypes = [] } = useControlTypes();
  const { data: categoryControls = [], refetch: refetchCategoryControls } = useCategoryControls();
  const createCategory = useCreateTicketCategory();
  const updateCategory = useUpdateTicketCategory();
  const deleteCategory = useDeleteTicketCategory();
  const createCategoryControl = useCreateCategoryControl();
  const updateCategoryControl = useUpdateCategoryControl();
  const deleteCategoryControl = useDeleteCategoryControl();
  const createControlType = useCreateControlType();
  const updateControlType = useUpdateControlType();
  const deleteControlType = useDeleteControlType();
  const { toast } = useToast();

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#D4AF37'
  });
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  
  // Control type management state
  const [newControlType, setNewControlType] = useState({
    name: '',
    description: '',
    color: '#D4AF37',
    icon: '',
    requires_control_id: null as string | null
  });
  const [editingControlType, setEditingControlType] = useState<ControlType | null>(null);
  const [showNewControlTypeDialog, setShowNewControlTypeDialog] = useState(false);
  const [showEditControlTypeDialog, setShowEditControlTypeDialog] = useState(false);

  // Filter data by selected event
  const eventCategories = categories.filter(c => c.event_id === selectedEvent?.id);
  const eventControlTypes = controlTypes.filter(ct => ct.event_id === selectedEvent?.id);

  const handleCreateCategory = async () => {
    if (!selectedEvent?.id) {
      toast({
        title: "Error",
        description: "No hay evento seleccionado.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createCategory.mutateAsync({ 
        category: newCategory, 
        eventId: selectedEvent.id 
      });
      setNewCategory({ name: '', description: '', color: '#D4AF37' });
      setShowNewCategoryDialog(false);
      toast({
        title: "Categoría creada",
        description: "Nueva categoría de tickets creada exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la categoría.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    
    try {
      await updateCategory.mutateAsync(editingCategory);
      setEditingCategory(null);
      setShowEditCategoryDialog(false);
      toast({
        title: "Categoría actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    // Check if category has attendees
    const { data: attendeesCount } = await supabase
      .from('attendees')
      .select('id', { count: 'exact' })
      .eq('category_id', categoryId);

    if (attendeesCount && attendeesCount.length > 0) {
      toast({
        title: "No se puede eliminar",
        description: "Esta categoría tiene asistentes asociados. Elimine primero los asistentes.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteCategory.mutateAsync(categoryId);
      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada correctamente.",
      });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la categoría.",
        variant: "destructive",
      });
    }
  };

  const handleToggleControlAccess = async (categoryId: string, controlTypeId: string, currentMaxUses: number) => {
    try {
      if (currentMaxUses > 0) {
        // Remove access
        await deleteCategoryControl.mutateAsync({ category_id: categoryId, control_type_id: controlTypeId });
      } else {
        // Add access with default 1 use
        await createCategoryControl.mutateAsync({ 
          category_id: categoryId, 
          control_type_id: controlTypeId, 
          max_uses: 1 
        });
      }
      toast({
        title: "Acceso actualizado",
        description: "Los permisos de acceso han sido actualizados.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el acceso.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMaxUses = async (categoryId: string, controlTypeId: string, maxUses: number) => {
    try {
      await updateCategoryControl.mutateAsync({ 
        category_id: categoryId, 
        control_type_id: controlTypeId, 
        max_uses: maxUses 
      });
      toast({
        title: "Límite actualizado",
        description: "El límite de usos ha sido actualizado.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el límite.",
        variant: "destructive",
      });
    }
  };

  // Control type handlers
  const handleCreateControlType = async () => {
    if (!selectedEvent?.id) {
      toast({
        title: "Error",
        description: "No hay evento seleccionado.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createControlType.mutateAsync({ 
        controlType: newControlType, 
        eventId: selectedEvent.id 
      });
      setNewControlType({ name: '', description: '', color: '#D4AF37', icon: '', requires_control_id: null });
      setShowNewControlTypeDialog(false);
      toast({
        title: "Tipo de control creado",
        description: "Nuevo tipo de acceso creado exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el tipo de acceso.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateControlType = async () => {
    if (!editingControlType) return;
    
    try {
      await updateControlType.mutateAsync(editingControlType);
      setEditingControlType(null);
      setShowEditControlTypeDialog(false);
      toast({
        title: "Tipo de control actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el tipo de acceso.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteControlType = async (controlTypeId: string) => {
    try {
      await deleteControlType.mutateAsync(controlTypeId);
      toast({
        title: "Tipo de control eliminado",
        description: "El tipo de acceso ha sido eliminado correctamente.",
      });
    } catch (error: any) {
      console.error('Error deleting control type:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el tipo de acceso.",
        variant: "destructive",
      });
    }
  };

  const getCategoryControlMaxUses = (categoryId: string, controlTypeId: string) => {
    const control = categoryControls.find(cc => 
      cc.category_id === categoryId && cc.control_type_id === controlTypeId
    );
    return control?.max_uses || 0;
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-gray-900/50 border border-gray-800">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <p className="text-hueso/60">No hay un evento seleccionado.</p>
          <p className="text-hueso/40 text-sm">Selecciona un evento para gestionar tickets y controles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Types Management Section */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-dorado" />
            <h3 className="text-xl font-bold text-dorado">Tipos de Acceso</h3>
            <Badge variant="outline" className="ml-2">{selectedEvent.event_name}</Badge>
          </div>
          <Dialog open={showNewControlTypeDialog} onOpenChange={setShowNewControlTypeDialog}>
            <DialogTrigger asChild>
              <Button className="bg-dorado text-empresarial hover:bg-dorado/90">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-dorado">Crear Nuevo Tipo de Acceso</DialogTitle>
                <DialogDescription>
                  Crear tipo de acceso para: <strong>{selectedEvent.event_name}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="control_name" className="text-hueso">Nombre del Tipo</Label>
                  <Input
                    id="control_name"
                    value={newControlType.name}
                    onChange={(e) => setNewControlType({ ...newControlType, name: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    placeholder="Entrada, Consumibles, VIP..."
                  />
                </div>
                <div>
                  <Label htmlFor="control_description" className="text-hueso">Descripción</Label>
                  <Input
                    id="control_description"
                    value={newControlType.description}
                    onChange={(e) => setNewControlType({ ...newControlType, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    placeholder="Descripción del tipo de acceso..."
                  />
                </div>
                <IconPicker
                  value={newControlType.icon || ''}
                  onChange={(iconName) => setNewControlType({ ...newControlType, icon: iconName })}
                  label="Icono del tipo de acceso"
                />
                <div>
                  <Label htmlFor="requires_control" className="text-hueso">Requiere Control Previo (Opcional)</Label>
                  <Select
                    value={newControlType.requires_control_id || 'none'}
                    onValueChange={(value) => setNewControlType({ ...newControlType, requires_control_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-hueso">
                      <SelectValue placeholder="Ninguno" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="none" className="text-hueso">Ninguno (Sin prerrequisito)</SelectItem>
                      {eventControlTypes.filter(ct => ct.id !== editingControlType?.id).map((ct) => (
                        <SelectItem key={ct.id} value={ct.id} className="text-hueso">
                          {ct.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    Si se selecciona, este control solo podrá redimirse después del control previo
                  </p>
                </div>
                <div>
                  <Label htmlFor="control_color" className="text-hueso">Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="control_color"
                      type="color"
                      value={newControlType.color}
                      onChange={(e) => setNewControlType({ ...newControlType, color: e.target.value })}
                      className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                    />
                    <Input
                      value={newControlType.color}
                      onChange={(e) => setNewControlType({ ...newControlType, color: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-hueso"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowNewControlTypeDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateControlType}
                    disabled={!newControlType.name}
                    className="bg-dorado text-empresarial hover:bg-dorado/90"
                  >
                    Crear Tipo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid gap-3">
          {eventControlTypes.length === 0 ? (
            <p className="text-hueso/60 text-center py-4">No hay tipos de acceso para este evento.</p>
          ) : (
            eventControlTypes.map((controlType) => {
              const requiredControl = controlType.requires_control_id 
                ? eventControlTypes.find(ct => ct.id === controlType.requires_control_id)
                : null;
              
              return (
                <div key={controlType.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: controlType.color || '#D4AF37' }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-hueso font-medium">{controlType.name}</span>
                        {controlType.icon && (
                          <Badge variant="outline" className="text-xs">
                            {controlType.icon}
                          </Badge>
                        )}
                        {requiredControl && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Requiere: {requiredControl.name}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 border-gray-700 text-hueso">
                                <p>Este control solo puede redimirse después de "{requiredControl.name}"</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      {controlType.description && (
                        <span className="text-sm text-gray-400">{controlType.description}</span>
                      )}
                    </div>
                  </div>
                <div className="flex gap-2">
                  <Dialog open={showEditControlTypeDialog} onOpenChange={setShowEditControlTypeDialog}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingControlType(controlType)}
                        className="border-dorado text-dorado hover:bg-dorado hover:text-empresarial"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-800">
                      <DialogHeader>
                        <DialogTitle className="text-dorado">Editar Tipo de Acceso</DialogTitle>
                        <DialogDescription>
                          Modifica las propiedades del tipo de acceso
                        </DialogDescription>
                      </DialogHeader>
                      {editingControlType && (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit_control_name" className="text-hueso">Nombre del Tipo</Label>
                            <Input
                              id="edit_control_name"
                              value={editingControlType.name}
                              onChange={(e) => setEditingControlType({ ...editingControlType, name: e.target.value })}
                              className="bg-gray-800 border-gray-700 text-hueso"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit_control_description" className="text-hueso">Descripción</Label>
                            <Input
                              id="edit_control_description"
                              value={editingControlType.description || ''}
                              onChange={(e) => setEditingControlType({ ...editingControlType, description: e.target.value })}
                              className="bg-gray-800 border-gray-700 text-hueso"
                            />
                          </div>
                          <IconPicker
                            value={editingControlType.icon || ''}
                            onChange={(iconName) => setEditingControlType({ ...editingControlType, icon: iconName })}
                            label="Icono del tipo de acceso"
                          />
                          <div>
                            <Label htmlFor="edit_requires_control" className="text-hueso">Requiere Control Previo (Opcional)</Label>
                            <Select
                              value={editingControlType.requires_control_id || 'none'}
                              onValueChange={(value) => setEditingControlType({ ...editingControlType, requires_control_id: value === 'none' ? null : value })}
                            >
                              <SelectTrigger className="bg-gray-800 border-gray-700 text-hueso">
                                <SelectValue placeholder="Ninguno" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700">
                                <SelectItem value="none" className="text-hueso">Ninguno (Sin prerrequisito)</SelectItem>
                                {eventControlTypes.filter(ct => ct.id !== editingControlType?.id).map((ct) => (
                                  <SelectItem key={ct.id} value={ct.id} className="text-hueso">
                                    {ct.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="edit_control_color" className="text-hueso">Color</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="edit_control_color"
                                type="color"
                                value={editingControlType.color || '#D4AF37'}
                                onChange={(e) => setEditingControlType({ ...editingControlType, color: e.target.value })}
                                className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                              />
                              <Input
                                value={editingControlType.color || '#D4AF37'}
                                onChange={(e) => setEditingControlType({ ...editingControlType, color: e.target.value })}
                                className="bg-gray-800 border-gray-700 text-hueso"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => {
                              setEditingControlType(null);
                              setShowEditControlTypeDialog(false);
                            }}>
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleUpdateControlType}
                              className="bg-dorado text-empresarial hover:bg-dorado/90"
                            >
                              Guardar Cambios
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteControlType(controlType.id)}
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* Categories Management Section */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Tag className="h-6 w-6 text-dorado" />
            <h3 className="text-xl font-bold text-dorado">Categorías de Tickets</h3>
            <Badge variant="outline" className="ml-2">{selectedEvent.event_name}</Badge>
          </div>
          <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
            <DialogTrigger asChild>
              <Button className="bg-dorado text-empresarial hover:bg-dorado/90">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-dorado">Crear Nueva Categoría</DialogTitle>
                <DialogDescription>
                  Crear categoría para: <strong>{selectedEvent.event_name}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-hueso">Nombre de la Categoría</Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    placeholder="VIP, General, Staff..."
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-hueso">Descripción</Label>
                  <Input
                    id="description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-hueso"
                    placeholder="Descripción de la categoría..."
                  />
                </div>
                <div>
                  <Label htmlFor="color" className="text-hueso">Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                    />
                    <Input
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-hueso"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateCategory}
                    disabled={!newCategory.name}
                    className="bg-dorado text-empresarial hover:bg-dorado/90"
                  >
                    Crear Categoría
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {eventCategories.length === 0 ? (
            <p className="text-hueso/60 text-center py-4">No hay categorías para este evento.</p>
          ) : (
            eventCategories.map((category) => (
              <Card key={category.id} className="bg-gray-800/30 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color || '#D4AF37' }}
                      />
                      <CardTitle className="text-hueso text-lg">{category.name}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingCategory(category)}
                            className="border-dorado text-dorado hover:bg-dorado hover:text-empresarial"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-800">
                          <DialogHeader>
                            <DialogTitle className="text-dorado">Editar Categoría</DialogTitle>
                            <DialogDescription>
                              Modifica los detalles de la categoría
                            </DialogDescription>
                          </DialogHeader>
                          {editingCategory && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit_name" className="text-hueso">Nombre</Label>
                                <Input
                                  id="edit_name"
                                  value={editingCategory.name}
                                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                  className="bg-gray-800 border-gray-700 text-hueso"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_description" className="text-hueso">Descripción</Label>
                                <Input
                                  id="edit_description"
                                  value={editingCategory.description || ''}
                                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                                  className="bg-gray-800 border-gray-700 text-hueso"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_color" className="text-hueso">Color</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    id="edit_color"
                                    type="color"
                                    value={editingCategory.color || '#D4AF37'}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                                    className="w-12 h-8 p-1 bg-gray-800 border-gray-700"
                                  />
                                  <Input
                                    value={editingCategory.color || '#D4AF37'}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                                    className="bg-gray-800 border-gray-700 text-hueso"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => {
                                  setEditingCategory(null);
                                  setShowEditCategoryDialog(false);
                                }}>
                                  Cancelar
                                </Button>
                                <Button 
                                  onClick={handleUpdateCategory}
                                  className="bg-dorado text-empresarial hover:bg-dorado/90"
                                >
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {category.description && (
                    <CardDescription className="text-gray-400 mt-1">{category.description}</CardDescription>
                  )}
                </CardHeader>
                
                {/* Control access for this category */}
                {eventControlTypes.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="border-t border-gray-700 pt-4">
                      <Label className="text-hueso text-sm mb-3 block">Accesos permitidos:</Label>
                      <div className="flex flex-wrap gap-2">
                        {eventControlTypes.map((controlType) => {
                          const maxUses = getCategoryControlMaxUses(category.id, controlType.id);
                          const hasAccess = maxUses > 0;
                          
                          return (
                            <div key={controlType.id} className="flex items-center gap-1">
                              <Badge
                                variant={hasAccess ? "default" : "outline"}
                                className={`cursor-pointer transition-all ${
                                  hasAccess 
                                    ? 'bg-dorado text-empresarial hover:bg-dorado/80' 
                                    : 'text-gray-400 hover:text-hueso hover:border-hueso'
                                }`}
                                onClick={() => handleToggleControlAccess(category.id, controlType.id, maxUses)}
                              >
                                {controlType.name}
                              </Badge>
                              {hasAccess && (
                                <Input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={maxUses}
                                  onChange={(e) => handleUpdateMaxUses(category.id, controlType.id, parseInt(e.target.value) || 1)}
                                  className="w-14 h-6 text-xs bg-gray-800 border-gray-700 text-hueso text-center"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketManagement;
