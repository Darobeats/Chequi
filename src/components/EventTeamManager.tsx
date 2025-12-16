import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEventTeamMembers, useAddUserToEvent, useUpdateUserEventRole, useRemoveUserFromEvent, useSearchUsers } from '@/hooks/useUserEvents';
import { Users, UserPlus, Shield, Scan, Trash2, Search, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventTeamManagerProps {
  eventId: string;
  eventName: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <Shield className="h-4 w-4" />;
    case 'control': return <Users className="h-4 w-4" />;
    case 'scanner': return <Scan className="h-4 w-4" />;
    default: return null;
  }
};

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'control': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'scanner': return 'bg-green-500/20 text-green-400 border-green-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'control': return 'Control';
    case 'scanner': return 'Scanner';
    default: return role;
  }
};

export function EventTeamManager({ eventId, eventName }: EventTeamManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'control' | 'scanner'>('scanner');

  const { data: teamMembers = [], isLoading } = useEventTeamMembers(eventId);
  const { data: searchResults = [] } = useSearchUsers(searchTerm);
  const addUserMutation = useAddUserToEvent();
  const updateRoleMutation = useUpdateUserEventRole();
  const removeUserMutation = useRemoveUserFromEvent();

  const handleAddUser = async () => {
    if (!selectedUserId) return;
    
    await addUserMutation.mutateAsync({
      userId: selectedUserId,
      eventId,
      roleInEvent: selectedRole,
    });
    
    setShowAddDialog(false);
    setSearchTerm('');
    setSelectedUserId(null);
    setSelectedRole('scanner');
  };

  const handleUpdateRole = async (assignmentId: string, newRole: 'admin' | 'control' | 'scanner') => {
    await updateRoleMutation.mutateAsync({
      assignmentId,
      roleInEvent: newRole,
    });
  };

  const handleRemoveUser = async (assignmentId: string) => {
    await removeUserMutation.mutateAsync({
      assignmentId,
      eventId,
    });
  };

  // Filter out already assigned users from search results
  const filteredSearchResults = searchResults.filter(
    user => !teamMembers.some(member => member.user_id === user.id)
  );

  // Statistics
  const adminCount = teamMembers.filter(m => m.role_in_event === 'admin').length;
  const controlCount = teamMembers.filter(m => m.role_in_event === 'control').length;
  const scannerCount = teamMembers.filter(m => m.role_in_event === 'scanner').length;

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-dorado flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipo del Evento
            </CardTitle>
            <CardDescription>
              Gestiona los usuarios asignados a "{eventName}"
            </CardDescription>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-dorado text-empresarial hover:bg-dorado/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-dorado">Agregar Usuario al Evento</DialogTitle>
                <DialogDescription>
                  Busca un usuario por email y asígnale un rol en este evento
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="search-email">Buscar por Email</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search-email"
                      placeholder="Escribe al menos 3 caracteres..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
                
                {filteredSearchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Seleccionar Usuario</Label>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {filteredSearchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => setSelectedUserId(user.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedUserId === user.id
                              ? 'bg-dorado/20 border-dorado'
                              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-hueso">{user.email}</span>
                          </div>
                          {user.full_name && (
                            <p className="text-xs text-gray-400 mt-1 ml-6">{user.full_name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {searchTerm.length >= 3 && filteredSearchResults.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No se encontraron usuarios disponibles
                  </p>
                )}
                
                {selectedUserId && (
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol en el Evento</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-red-400" />
                            Admin - Control total del evento
                          </div>
                        </SelectItem>
                        <SelectItem value="control">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-400" />
                            Control - Dashboard y scanner
                          </div>
                        </SelectItem>
                        <SelectItem value="scanner">
                          <div className="flex items-center gap-2">
                            <Scan className="h-4 w-4 text-green-400" />
                            Scanner - Solo escaneo
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-dorado text-empresarial hover:bg-dorado/90"
                  onClick={handleAddUser}
                  disabled={!selectedUserId || addUserMutation.isPending}
                >
                  {addUserMutation.isPending ? 'Agregando...' : 'Agregar Usuario'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">Admins</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{adminCount}</p>
          </div>
          
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-400">Control</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{controlCount}</p>
          </div>
          
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Scan className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400">Scanners</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{scannerCount}</p>
          </div>
        </div>
        
        {/* Team Members Table */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Cargando equipo...</p>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No hay usuarios asignados a este evento</p>
            <p className="text-sm text-gray-500 mt-1">Agrega usuarios para que puedan acceder al evento</p>
          </div>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-hueso">Usuario</TableHead>
                  <TableHead className="text-hueso">Rol</TableHead>
                  <TableHead className="text-hueso">Asignado</TableHead>
                  <TableHead className="text-hueso text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id} className="border-gray-800">
                    <TableCell>
                      <div>
                        <p className="font-medium text-hueso">{member.email}</p>
                        {member.full_name && (
                          <p className="text-sm text-gray-400">{member.full_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.role_in_event}
                        onValueChange={(v) => handleUpdateRole(member.id, v as any)}
                      >
                        <SelectTrigger className="w-[140px] bg-transparent border-gray-700">
                          <Badge variant="outline" className={`${getRoleBadgeClass(member.role_in_event)}`}>
                            {getRoleIcon(member.role_in_event)}
                            <span className="ml-1">{getRoleLabel(member.role_in_event)}</span>
                          </Badge>
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="control">Control</SelectItem>
                          <SelectItem value="scanner">Scanner</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {format(new Date(member.assigned_at), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-900 border-gray-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Remover usuario del evento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              El usuario {member.email} ya no tendrá acceso a este evento. Esta acción se puede revertir agregando el usuario nuevamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleRemoveUser(member.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
