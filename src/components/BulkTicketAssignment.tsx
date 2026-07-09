import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAttendees, useTicketCategories } from '@/hooks/useSupabaseData';
import { useUpdateAttendee } from '@/hooks/useAttendeeManagement';
import { toast } from '@/components/ui/sonner';
import { Users, Save, Filter, Search, X, ChevronDown, RotateCcw, Loader2 } from 'lucide-react';

const NO_CAT = '__nocat__';

const BulkTicketAssignment: React.FC = () => {
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: attendees = [], isLoading } = useAttendees();
  const { data: categories = [] } = useTicketCategories();
  const updateMutation = useUpdateAttendee();

  const catName = (id: string) => categories.find((c) => c.id === id)?.name || 'Sin categoría';
  const catColor = (id: string) => categories.find((c) => c.id === id)?.color || '#6B7280';

  // Category options with counts (including "Sin categoría")
  const categoryOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attendees) {
      const id = a.category_id || NO_CAT;
      map.set(id, (map.get(id) || 0) + 1);
    }
    return Array.from(map.entries()).map(([id, count]) => ({
      id,
      name: id === NO_CAT ? 'Sin categoría' : catName(id),
      color: id === NO_CAT ? '#EF4444' : catColor(id),
      count,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendees, categories]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return attendees.filter((a) => {
      const catId = a.category_id || NO_CAT;
      if (showOnlyUnassigned && catId !== NO_CAT) return false;
      if (categoryFilter.size > 0 && !categoryFilter.has(catId)) return false;
      if (statusFilter !== 'all' && (a as any).status !== statusFilter) return false;
      if (s) {
        const hay = `${a.name} ${(a as any).cedula || ''} ${a.ticket_id || ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [attendees, search, categoryFilter, statusFilter, showOnlyUnassigned]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((a) => next.delete(a.id));
      else filtered.forEach((a) => next.add(a.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const invertSelection = () => {
    setSelected((prev) => {
      const next = new Set<string>();
      filtered.forEach((a) => { if (!prev.has(a.id)) next.add(a.id); });
      return next;
    });
  };

  const toggleCatFilter = (id: string) => {
    setCategoryFilter((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const clearFilters = () => {
    setSearch(''); setCategoryFilter(new Set()); setStatusFilter('all'); setShowOnlyUnassigned(false);
  };

  const handleBulkUpdate = async () => {
    if (!targetCategoryId) { toast.error('Selecciona una categoría de destino'); return; }
    if (selected.size === 0) { toast.error('Selecciona al menos un asistente'); return; }

    setBusy(true); setProgress(0);
    const ids = Array.from(selected);
    let ok = 0; const errors: string[] = [];
    try {
      for (let i = 0; i < ids.length; i++) {
        try {
          await updateMutation.mutateAsync({ id: ids[i], category_id: targetCategoryId });
          ok++;
        } catch (e: any) {
          errors.push(ids[i]);
        }
        setProgress(Math.round(((i + 1) / ids.length) * 100));
      }
      toast.success('Asignación completa', {
        description: `${ok} asignados a "${catName(targetCategoryId)}"${errors.length ? ` · ${errors.length} errores` : ''}`,
      });
      setSelected(new Set());
      setTargetCategoryId('');
    } catch (e: any) {
      toast.error('Error masivo', { description: e?.message });
    } finally {
      setBusy(false); setProgress(0);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-dorado" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-dorado flex items-center gap-2">
          <Users className="w-5 h-5" />
          Asignación Masiva de Categorías
        </CardTitle>
        <p className="text-gray-400 text-sm">Filtra, busca y selecciona múltiples asistentes para reasignar su categoría.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[220px]">
            <Label className="text-xs text-hueso/70">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, cédula o ticket ID..." className="pl-8 bg-gray-800 border-gray-700 text-hueso" />
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-gray-700">
                <Filter className="h-4 w-4 mr-1" /> Categoría actual
                {categoryFilter.size > 0 && <Badge className="ml-1 bg-dorado text-empresarial">{categoryFilter.size}</Badge>}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-gray-900 border-gray-700">
              <ScrollArea className="max-h-64">
                <div className="space-y-1">
                  {categoryOptions.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-800 cursor-pointer">
                      <Checkbox checked={categoryFilter.has(c.id)} onCheckedChange={() => toggleCatFilter(c.id)} />
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: c.color }} />
                      <span className="text-sm text-hueso flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-gray-500">{c.count}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <div>
            <Label className="text-xs text-hueso/70">Estado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-hueso"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="valid">Válido</SelectItem>
                <SelectItem value="used">Usado</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={showOnlyUnassigned ? 'default' : 'outline'}
            className={showOnlyUnassigned ? 'bg-dorado text-empresarial' : 'border-gray-700'}
            onClick={() => setShowOnlyUnassigned((v) => !v)}
          >
            Solo sin categoría
          </Button>

          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Limpiar
          </Button>
        </div>

        {/* Selection controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <Button size="sm" variant="outline" className="border-gray-700 h-7" onClick={toggleAll}>
            {allVisibleSelected ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
          </Button>
          <Button size="sm" variant="outline" className="border-gray-700 h-7" onClick={invertSelection}>
            <RotateCcw className="h-3 w-3 mr-1" /> Invertir
          </Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelected(new Set())}>
            Limpiar selección
          </Button>
          <span className="ml-auto">
            Visibles <strong className="text-hueso">{filtered.length}</strong> · Seleccionados <strong className="text-hueso">{selected.size}</strong>
          </span>
        </div>

        {/* Table */}
        <div className="border border-gray-800 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-gray-900 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="text-hueso">Nombre</TableHead>
                <TableHead className="text-hueso">Cédula</TableHead>
                <TableHead className="text-hueso">Categoría actual</TableHead>
                <TableHead className="text-hueso">Estado</TableHead>
                <TableHead className="text-hueso">Ticket ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">No hay asistentes con esos filtros.</TableCell></TableRow>
              ) : filtered.slice(0, 1000).map((a) => (
                <TableRow key={a.id} className="border-gray-800">
                  <TableCell>
                    <Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggleOne(a.id)} />
                  </TableCell>
                  <TableCell className="text-hueso font-medium">{a.name}</TableCell>
                  <TableCell className="text-gray-400">{(a as any).cedula || '—'}</TableCell>
                  <TableCell>
                    {a.category_id ? (
                      <Badge variant="secondary" style={{ backgroundColor: `${catColor(a.category_id)}20`, color: catColor(a.category_id) }}>
                        {catName(a.category_id)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500 text-red-400">Sin categoría</Badge>
                    )}
                  </TableCell>
                  <TableCell><span className="text-xs text-gray-400">{(a as any).status || '—'}</span></TableCell>
                  <TableCell className="text-gray-400 font-mono text-xs">{a.ticket_id}</TableCell>
                </TableRow>
              ))}
              {filtered.length > 1000 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-yellow-500 py-2">
                    Mostrando 1000 de {filtered.length}. La selección procesa todos los seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Action bar */}
        <div className="border-t border-gray-800 pt-4 space-y-3">
          {busy && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-hueso/70"><span>Actualizando…</span><span>{progress}%</span></div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-dorado h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <Label className="text-xs text-hueso/70">Nueva categoría de destino</Label>
              <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-hueso">
                  <SelectValue placeholder="Selecciona categoría..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="capitalize">{c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleBulkUpdate}
              disabled={!targetCategoryId || selected.size === 0 || busy}
              className="bg-dorado text-empresarial hover:bg-dorado/90"
            >
              {busy
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {progress}%</>
                : <><Save className="w-4 h-4 mr-2" /> Asignar a {selected.size} asistentes</>}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkTicketAssignment;
