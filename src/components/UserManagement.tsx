import React, { useState } from 'react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserPlus, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

const UserManagement = () => {
  const { useUsers, useCreateUser, useUpdateUser, useDeleteUser } = useUserManagement();
  const { data: users = [], isLoading } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'attendee' as 'admin' | 'control' | 'attendee' | 'viewer'
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      await createUserMutation.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      setFormData({ email: '', password: '', full_name: '', role: 'attendee' });
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    try {
      await updateUserMutation.mutateAsync({
        userId: editingUser.id,
        updates: {
          full_name: formData.full_name,
          role: formData.role
        }
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', full_name: '', role: 'attendee' });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      role: user.role
    });
    setIsEditDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'control': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'attendee': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'viewer': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'control': return 'Control';
      case 'attendee': return 'Asistente';
      case 'viewer': return 'Observador';
      default: return role;
    }
  };

  if (isLoading) {
    return <div className="text-hueso">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dorado">Gestión de Usuarios</h2>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-dorado text-empresarial hover:bg-dorado/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Crear Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-empresarial border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-dorado">Crear Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-hueso">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-hueso"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-hueso">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-hueso"
                  required
                />
              </div>
              <div>
                <Label htmlFor="full_name" className="text-hueso">Nombre Completo</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-hueso"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-hueso">Rol</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="bg-gray-900/50 border-gray-700 text-hueso">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-empresarial border-gray-700">
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="control">Control</SelectItem>
                    <SelectItem value="attendee">Asistente</SelectItem>
                    <SelectItem value="viewer">Observador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-gray-600 text-hueso hover:bg-gray-800"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="bg-dorado text-empresarial hover:bg-dorado/90"
                >
                  {createUserMutation.isPending ? 'Creando...' : 'Crear Usuario'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-gray-900/50 rounded-lg border border-gray-800">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800">
              <TableHead className="text-hueso">Email</TableHead>
              <TableHead className="text-hueso">Nombre</TableHead>
              <TableHead className="text-hueso">Rol</TableHead>
              <TableHead className="text-hueso">Fecha Creación</TableHead>
              <TableHead className="text-hueso">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="border-gray-800">
                <TableCell className="text-hueso">{user.email}</TableCell>
                <TableCell className="text-hueso">{user.full_name || 'Sin nombre'}</TableCell>
                <TableCell>
                  <Badge className={getRoleColor(user.role)}>
                    {getRoleText(user.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-hueso">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      className="text-hueso hover:text-dorado hover:bg-gray-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-empresarial border-gray-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-dorado">¿Eliminar Usuario?</AlertDialogTitle>
                          <AlertDialogDescription className="text-hueso">
                            Esta acción no se puede deshacer. El usuario {user.email} será eliminado permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-700 text-hueso hover:bg-gray-600">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-empresarial border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-dorado">Editar Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <Label htmlFor="edit_email" className="text-hueso">Email (Solo lectura)</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-800/50 border-gray-700 text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="edit_full_name" className="text-hueso">Nombre Completo</Label>
              <Input
                id="edit_full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="bg-gray-900/50 border-gray-700 text-hueso"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_role" className="text-hueso">Rol</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="bg-gray-900/50 border-gray-700 text-hueso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-empresarial border-gray-700">
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                  <SelectItem value="attendee">Asistente</SelectItem>
                  <SelectItem value="viewer">Observador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-gray-600 text-hueso hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                className="bg-dorado text-empresarial hover:bg-dorado/90"
              >
                {updateUserMutation.isPending ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;