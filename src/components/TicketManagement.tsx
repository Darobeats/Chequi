import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTicketCategories, useCreateTicketCategory, useUpdateTicketCategory, useDeleteTicketCategory, useCategoryControls, useCreateCategoryControl, useUpdateCategoryControl, useDeleteCategoryControl } from '@/hooks/useTicketCategories';
import { useControlTypes } from '@/hooks/useSupabaseData';
import { Plus, Edit, Trash2, Tag, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TicketCategory, ControlType } from '@/types/database';

const TicketManagement = () => {
  const { data: categories = [], refetch: refetchCategories } = useTicketCategories();
  const { data: controlTypes = [] } = useControlTypes();
  const { data: categoryControls = [], refetch: refetchCategoryControls } = useCategoryControls();
  const createCategory = useCreateTicketCategory();
  const updateCategory = useUpdateTicketCategory();
  const deleteCategory = useDeleteTicketCategory();
  const createCategoryControl = useCreateCategoryControl();
  const updateCategoryControl = useUpdateCategoryControl();
  const deleteCategoryControl = useDeleteCategoryControl();
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

  const handleCreateCategory = async () => {
    try {
      await createCategory.mutateAsync(newCategory);
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
    try {
      await deleteCategory.mutateAsync(categoryId);
      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría.",
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

  const getCategoryControlMaxUses = (categoryId: string, controlTypeId: string) => {
    const control = categoryControls.find(cc => 
      cc.category_id === categoryId && cc.control_type_id === controlTypeId
    );
    return control?.max_uses || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tag className="h-6 w-6 text-dorado" />
          <h2 className="text-2xl font-bold text-dorado">Gestión de Tickets</h2>
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
                Crea una nueva categoría de tickets para tu evento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category_name" className="text-hueso">Nombre de la Categoría</Label>
                <Input
                  id="category_name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-hueso"
                  placeholder="VIP, General, Staff..."
                />
              </div>
              <div>
                <Label htmlFor="category_description" className="text-hueso">Descripción</Label>
                <Input
                  id="category_description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-hueso"
                  placeholder="Descripción de la categoría..."
                />
              </div>
              <div>
                <Label htmlFor="category_color" className="text-hueso">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="category_color"
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

      {/* Categories List */}
      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="bg-gray-900/50 border border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <CardTitle className="text-dorado">{category.name}</CardTitle>
                    {category.description && (
                      <CardDescription>{category.description}</CardDescription>
                    )}
                  </div>
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
                      </DialogHeader>
                      {editingCategory && (
                        <div className="space-y-4">
                          <div>
                            <Label className="text-hueso">Nombre</Label>
                            <Input
                              value={editingCategory.name}
                              onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                              className="bg-gray-800 border-gray-700 text-hueso"
                            />
                          </div>
                          <div>
                            <Label className="text-hueso">Descripción</Label>
                            <Input
                              value={editingCategory.description || ''}
                              onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                              className="bg-gray-800 border-gray-700 text-hueso"
                            />
                          </div>
                          <div>
                            <Label className="text-hueso">Color</Label>
                            <div className="flex items-center gap-2">
                              <Input
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
                            <Button variant="outline" onClick={() => setShowEditCategoryDialog(false)}>
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleUpdateCategory}
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
                    onClick={() => handleDeleteCategory(category.id)}
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4 text-dorado" />
                  <Label className="text-hueso font-medium">Tipos de Acceso</Label>
                </div>
                <div className="grid gap-2">
                  {controlTypes.map((controlType) => {
                    const maxUses = getCategoryControlMaxUses(category.id, controlType.id);
                    const hasAccess = maxUses > 0;
                    
                    return (
                      <div key={controlType.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: controlType.color || '#D4AF37' }}
                          />
                          <span className="text-hueso">{controlType.name}</span>
                          {controlType.description && (
                            <span className="text-sm text-gray-400">- {controlType.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasAccess && (
                            <div className="flex items-center gap-2">
                              <Label className="text-sm text-gray-400">Usos:</Label>
                              <Input
                                type="number"
                                min="1"
                                value={maxUses}
                                onChange={(e) => handleUpdateMaxUses(category.id, controlType.id, parseInt(e.target.value) || 1)}
                                className="w-16 h-8 bg-gray-700 border-gray-600 text-hueso text-sm"
                              />
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant={hasAccess ? "destructive" : "default"}
                            onClick={() => handleToggleControlAccess(category.id, controlType.id, maxUses)}
                            className={hasAccess ? "" : "bg-green-600 hover:bg-green-700"}
                          >
                            {hasAccess ? "Denegar" : "Permitir"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TicketManagement;