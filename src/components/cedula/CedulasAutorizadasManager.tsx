import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCedulasAutorizadas, useCreateCedulaAutorizada, useDeleteCedulaAutorizada, useClearCedulasAutorizadas, useCedulasAutorizadasStats } from '@/hooks/useCedulasAutorizadas';
import { useEventWhitelistConfigById, useUpdateWhitelistConfig } from '@/hooks/useEventWhitelistConfig';
import { useCedulaRegistros } from '@/hooks/useCedulaRegistros';
import { CedulasBulkImport } from './CedulasBulkImport';
import { CedulaAccessLogs } from './CedulaAccessLogs';
import { Shield, ShieldCheck, ShieldX, UserPlus, Search, Trash2, Upload, Users, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

interface CedulasAutorizadasManagerProps {
  eventId: string;
}

export function CedulasAutorizadasManager({ eventId }: CedulasAutorizadasManagerProps) {
  const { user } = useSupabaseAuth();
  const { data: autorizadas = [], isLoading } = useCedulasAutorizadas(eventId);
  const { data: registros = [] } = useCedulaRegistros(eventId);
  const { data: whitelistConfig } = useEventWhitelistConfigById(eventId);
  const { data: stats } = useCedulasAutorizadasStats(eventId);
  
  const updateWhitelist = useUpdateWhitelistConfig();
  const createAutorizada = useCreateCedulaAutorizada();
  const deleteAutorizada = useDeleteCedulaAutorizada();
  const clearAutorizadas = useClearCedulasAutorizadas();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newCedula, setNewCedula] = useState({ numero_cedula: '', nombre_completo: '', categoria: '', empresa: '' });
  const [activeTab, setActiveTab] = useState('lista');
  
  // Set de cédulas registradas para comparación rápida
  const registeredCedulas = useMemo(() => 
    new Set(registros.map(r => r.numero_cedula)), 
    [registros]
  );
  
  // Filtrar autorizadas
  const filteredAutorizadas = useMemo(() => {
    if (!searchTerm.trim()) return autorizadas;
    const term = searchTerm.toLowerCase();
    return autorizadas.filter(a => 
      a.numero_cedula.includes(searchTerm) ||
      a.nombre_completo?.toLowerCase().includes(term) ||
      a.categoria?.toLowerCase().includes(term) ||
      a.empresa?.toLowerCase().includes(term)
    );
  }, [autorizadas, searchTerm]);
  
  const handleToggleWhitelist = () => {
    updateWhitelist.mutate({
      eventId,
      requireWhitelist: !whitelistConfig?.requireWhitelist,
    });
  };
  
  const handleAddCedula = async () => {
    if (!newCedula.numero_cedula.trim()) return;
    
    await createAutorizada.mutateAsync({
      event_id: eventId,
      numero_cedula: newCedula.numero_cedula.trim(),
      nombre_completo: newCedula.nombre_completo.trim() || undefined,
      categoria: newCedula.categoria.trim() || undefined,
      empresa: newCedula.empresa.trim() || undefined,
      created_by: user?.id,
    });
    
    setNewCedula({ numero_cedula: '', nombre_completo: '', categoria: '', empresa: '' });
    setShowAddDialog(false);
  };
  
  const handleDelete = (id: string) => {
    deleteAutorizada.mutate({ id, eventId });
  };
  
  const handleClearAll = () => {
    clearAutorizadas.mutate(eventId);
  };

  return (
    <div className="space-y-6">
      {/* Header con toggle */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-dorado" />
              <div>
                <CardTitle className="text-dorado">Control de Acceso por Lista Blanca</CardTitle>
                <CardDescription>
                  Gestiona las cédulas autorizadas para el evento
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Label htmlFor="whitelist-toggle" className="text-hueso text-sm">
                {whitelistConfig?.requireWhitelist ? 'Activo' : 'Inactivo'}
              </Label>
              <Switch
                id="whitelist-toggle"
                checked={whitelistConfig?.requireWhitelist ?? false}
                onCheckedChange={handleToggleWhitelist}
                disabled={updateWhitelist.isPending}
              />
            </div>
          </div>
        </CardHeader>
        
        {whitelistConfig?.requireWhitelist && (
          <CardContent>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <span className="text-amber-400 text-sm">
                <strong>Modo Lista Blanca Activo:</strong> Solo las cédulas en la lista podrán registrarse.
              </span>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hueso text-xs mb-1">Total Autorizados</p>
              <p className="text-2xl font-bold text-dorado">{stats?.total || 0}</p>
            </div>
            <Users className="h-8 w-8 text-dorado/50" />
          </div>
        </Card>
        
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hueso text-xs mb-1">Registrados</p>
              <p className="text-2xl font-bold text-green-500">{stats?.registered || 0}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500/50" />
          </div>
        </Card>
        
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hueso text-xs mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-amber-500">{stats?.pending || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500/50" />
          </div>
        </Card>
        
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hueso text-xs mb-1">Rechazados</p>
              <p className="text-2xl font-bold text-red-500">{stats?.denied || 0}</p>
            </div>
            <ShieldX className="h-8 w-8 text-red-500/50" />
          </div>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-900/50 border border-gray-800">
          <TabsTrigger value="lista" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial">
            <Users className="h-4 w-4 mr-2" />
            Lista de Autorizados
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-dorado data-[state=active]:text-empresarial">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Intentos Rechazados
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="lista" className="mt-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hueso/40" />
                  <Input
                    placeholder="Buscar por cédula, nombre, categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-gray-900/50 border-gray-700 text-hueso placeholder:text-hueso/40"
                  />
                </div>
                
                <div className="flex gap-2">
                  {/* Agregar manual */}
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-dorado text-dorado hover:bg-dorado hover:text-empresarial">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-empresarial border-gray-800">
                      <DialogHeader>
                        <DialogTitle className="text-dorado">Agregar Cédula Autorizada</DialogTitle>
                        <DialogDescription className="text-hueso/80">
                          Agrega una cédula a la lista de autorizados
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-hueso">Número de Cédula *</Label>
                          <Input
                            value={newCedula.numero_cedula}
                            onChange={(e) => setNewCedula({ ...newCedula, numero_cedula: e.target.value.replace(/\D/g, '') })}
                            placeholder="1234567890"
                            className="bg-gray-900/50 border-gray-700 text-hueso"
                          />
                        </div>
                        <div>
                          <Label className="text-hueso">Nombre Completo</Label>
                          <Input
                            value={newCedula.nombre_completo}
                            onChange={(e) => setNewCedula({ ...newCedula, nombre_completo: e.target.value })}
                            placeholder="Juan Pérez García"
                            className="bg-gray-900/50 border-gray-700 text-hueso"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-hueso">Categoría</Label>
                            <Input
                              value={newCedula.categoria}
                              onChange={(e) => setNewCedula({ ...newCedula, categoria: e.target.value })}
                              placeholder="VIP, General..."
                              className="bg-gray-900/50 border-gray-700 text-hueso"
                            />
                          </div>
                          <div>
                            <Label className="text-hueso">Empresa</Label>
                            <Input
                              value={newCedula.empresa}
                              onChange={(e) => setNewCedula({ ...newCedula, empresa: e.target.value })}
                              placeholder="Empresa S.A."
                              className="bg-gray-900/50 border-gray-700 text-hueso"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleAddCedula}
                          disabled={!newCedula.numero_cedula.trim() || createAutorizada.isPending}
                          className="bg-dorado text-empresarial hover:bg-dorado/90"
                        >
                          Agregar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Importar Excel */}
                  <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-dorado text-empresarial hover:bg-dorado/90">
                        <Upload className="h-4 w-4 mr-2" />
                        Importar Excel
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-empresarial border-gray-800 max-w-2xl">
                      <CedulasBulkImport 
                        eventId={eventId} 
                        onComplete={() => setShowImportDialog(false)} 
                      />
                    </DialogContent>
                  </Dialog>
                  
                  {/* Limpiar todo */}
                  {autorizadas.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-empresarial border-gray-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-dorado">¿Limpiar lista completa?</AlertDialogTitle>
                          <AlertDialogDescription className="text-hueso/80">
                            Esto eliminará las {autorizadas.length} cédulas autorizadas. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-gray-700 text-hueso hover:bg-gray-800">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearAll}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Eliminar Todo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-900/80 hover:bg-gray-900/80">
                      <TableHead className="text-dorado">Cédula</TableHead>
                      <TableHead className="text-dorado">Nombre</TableHead>
                      <TableHead className="text-dorado hidden md:table-cell">Categoría</TableHead>
                      <TableHead className="text-dorado hidden lg:table-cell">Empresa</TableHead>
                      <TableHead className="text-dorado text-center">Estado</TableHead>
                      <TableHead className="text-dorado w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-hueso/60">
                          Cargando...
                        </TableCell>
                      </TableRow>
                    ) : filteredAutorizadas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-hueso/60">
                          {searchTerm ? 'No se encontraron resultados' : 'No hay cédulas autorizadas'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAutorizadas.map((autorizada) => {
                        const isRegistered = registeredCedulas.has(autorizada.numero_cedula);
                        return (
                          <TableRow key={autorizada.id} className="hover:bg-gray-900/30">
                            <TableCell className="font-mono text-hueso">{autorizada.numero_cedula}</TableCell>
                            <TableCell className="text-hueso">{autorizada.nombre_completo || '-'}</TableCell>
                            <TableCell className="text-hueso hidden md:table-cell">{autorizada.categoria || '-'}</TableCell>
                            <TableCell className="text-hueso hidden lg:table-cell">{autorizada.empresa || '-'}</TableCell>
                            <TableCell className="text-center">
                              {isRegistered ? (
                                <Badge className="bg-green-600">Registrado</Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500 text-amber-500">Pendiente</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-empresarial border-gray-800">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-dorado">Eliminar Autorización</AlertDialogTitle>
                                    <AlertDialogDescription className="text-hueso/80">
                                      ¿Eliminar la cédula {autorizada.numero_cedula} de la lista de autorizados?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-gray-700 text-hueso hover:bg-gray-800">
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(autorizada.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs" className="mt-4">
          <CedulaAccessLogs eventId={eventId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
