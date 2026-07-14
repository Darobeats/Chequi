import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, Package, Filter, Search, X, ChevronDown, FileDown, Eye, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Attendee, TicketTemplate } from '@/types/database';
import { useTicketTemplates } from '@/hooks/useTicketTemplates';
import { useAllTemplateBindings } from '@/hooks/useTemplateCategoryBindings';
import { renderTicket, sanitize } from '@/lib/renderTicket';
import VirtualizedExportTable from './tickets/VirtualizedExportTable';

interface Props {
  eventId: string;
  attendees: Attendee[];
}

type ZipStructure = 'category' | 'template' | 'flat';
type NameFormat = 'cedula_nombre' | 'ticket_nombre' | 'nombre' | 'ticket';

const buildFilename = (a: Attendee, fmt: NameFormat) => {
  const nombre = sanitize(a.name);
  const ticket = sanitize(a.ticket_id || 'sinticket');
  const cedula = a.cedula || 'SinCedula';
  switch (fmt) {
    case 'cedula_nombre': return `${cedula}_${nombre}.png`;
    case 'ticket_nombre': return `${ticket}_${nombre}.png`;
    case 'nombre': return `${nombre}.png`;
    case 'ticket': return `${ticket}.png`;
  }
};

const TicketExportCenter: React.FC<Props> = ({ eventId, attendees }) => {
  const { data: templates = [] } = useTicketTemplates();
  const { data: bindings = [] } = useAllTemplateBindings();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zipStructure, setZipStructure] = useState<ZipStructure>('category');
  const [nameFormat, setNameFormat] = useState<NameFormat>('cedula_nombre');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastReport, setLastReport] = useState<{ ok: number; skipped: string[]; errors: string[] } | null>(null);
  const [autoSync, setAutoSync] = useState(false);

  // Preview dialog state
  const [previewFor, setPreviewFor] = useState<{ attendee: Attendee; template: TicketTemplate } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFilename, setPreviewFilename] = useState('');
  const previewBlobRef = useRef<Blob | null>(null);

  const eventTemplates = useMemo(
    () => templates.filter((t) => t.event_config_id === eventId && t.use_visual_editor && (t.elements?.length ?? 0) > 0),
    [templates, eventId],
  );

  const defaultTemplate = useMemo(() => {
    const bDef = bindings.find((b) => b.is_default && eventTemplates.some((t) => t.id === b.template_id));
    return bDef ? eventTemplates.find((t) => t.id === bDef.template_id) : eventTemplates[0];
  }, [bindings, eventTemplates]);

  const resolveTemplate = (categoryId: string): TicketTemplate | undefined => {
    const b = bindings.find((b) => b.category_id === categoryId);
    if (b) return eventTemplates.find((t) => t.id === b.template_id);
    return defaultTemplate;
  };

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string; count: number }>();
    for (const a of attendees) {
      const id = a.category_id;
      const existing = map.get(id);
      if (existing) existing.count++;
      else map.set(id, {
        id,
        name: a.ticket_category?.name || 'Sin categoría',
        color: a.ticket_category?.color || '#888',
        count: 1,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendees]);

  const rows = useMemo(() => {
    return attendees.map((a) => ({ attendee: a, template: resolveTemplate(a.category_id) }));
  }, [attendees, bindings, eventTemplates]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(({ attendee: a, template: tpl }) => {
      if (selectedCategories.size > 0 && !selectedCategories.has(a.category_id)) return false;
      if (selectedTemplates.size > 0) {
        const tid = tpl?.id || '__none__';
        if (!selectedTemplates.has(tid)) return false;
      }
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (s) {
        const hay = `${a.name} ${a.cedula || ''} ${a.ticket_id || ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, search, selectedCategories, selectedTemplates, statusFilter]);

  // Auto-sync: keep selection = filtered rows with template
  useEffect(() => {
    if (!autoSync) return;
    setSelectedIds(new Set(filtered.filter((r) => r.template).map((r) => r.attendee.id)));
  }, [autoSync, filtered]);

  const applyFiltersToSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => { if (r.template) next.add(r.attendee.id); });
      return next;
    });
    toast({ title: 'Selección actualizada', description: `${filtered.filter((r) => r.template).length} tickets añadidos` });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.attendee.id));

  const toggleAll = () => {
    if (autoSync) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((r) => next.delete(r.attendee.id));
      else filtered.forEach((r) => { if (r.template) next.add(r.attendee.id); });
      return next;
    });
  };

  const toggleOne = (id: string) => {
    if (autoSync) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleCatFilter = (id: string) => {
    setSelectedCategories((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleTplFilter = (id: string) => {
    setSelectedTemplates((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const clearFilters = () => {
    setSearch(''); setSelectedCategories(new Set()); setSelectedTemplates(new Set()); setStatusFilter('all');
  };

  const downloadSingle = async (a: Attendee, tpl?: TicketTemplate) => {
    if (!tpl) { toast({ title: 'Sin plantilla asignada', variant: 'destructive' }); return; }
    setDownloadingId(a.id);
    try {
      const blob = await renderTicket(tpl, a);
      saveAs(blob, buildFilename(a, nameFormat));
    } catch (e: any) {
      toast({ title: 'Error al generar', description: e?.message, variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const openPreview = async (a: Attendee, tpl?: TicketTemplate) => {
    if (!tpl) { toast({ title: 'Sin plantilla asignada', variant: 'destructive' }); return; }
    setPreviewFor({ attendee: a, template: tpl });
    setPreviewFilename(buildFilename(a, nameFormat));
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const blob = await renderTicket(tpl, a);
      previewBlobRef.current = blob;
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      toast({ title: 'Error al generar preview', description: e?.message, variant: 'destructive' });
      setPreviewFor(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFor(null);
    previewBlobRef.current = null;
  };

  const downloadFromPreview = () => {
    if (!previewBlobRef.current) return;
    const name = previewFilename.trim().endsWith('.png') ? previewFilename.trim() : `${previewFilename.trim() || 'ticket'}.png`;
    saveAs(previewBlobRef.current, name);
  };

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const runBulkExport = async (source: 'selected' | 'filtered') => {
    const target = source === 'selected'
      ? filtered.filter((r) => selectedIds.has(r.attendee.id))
      : filtered;
    if (target.length === 0) { toast({ title: 'Nada para exportar', variant: 'destructive' }); return; }

    setBulkBusy(true); setProgress(0); setLastReport(null);
    const zip = new JSZip();
    const skipped: string[] = [];
    const errors: string[] = [];
    let ok = 0;

    try {
      for (let i = 0; i < target.length; i++) {
        const { attendee: a, template: tpl } = target[i];
        if (!tpl) { skipped.push(a.name); setProgress(Math.round(((i + 1) / target.length) * 100)); continue; }
        try {
          const blob = await renderTicket(tpl, a);
          const fname = buildFilename(a, nameFormat);
          let path = fname;
          if (zipStructure === 'category') path = `${sanitize(a.ticket_category?.name || 'sin_categoria')}/${fname}`;
          else if (zipStructure === 'template') path = `${sanitize(tpl.name || 'plantilla')}/${fname}`;
          zip.file(path, blob);
          ok++;
        } catch (e: any) {
          errors.push(`${a.name}: ${e?.message || 'error'}`);
        }
        setProgress(Math.round(((i + 1) / target.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const ts = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `tickets_${zipStructure}_${ts}.zip`);
      setLastReport({ ok, skipped, errors });
      toast({
        title: 'Exportación completa',
        description: `${ok} generados · ${skipped.length} sin plantilla · ${errors.length} errores`,
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo generar', variant: 'destructive' });
    } finally {
      setBulkBusy(false); setProgress(0);
    }
  };

  const selectedCount = filtered.filter((r) => selectedIds.has(r.attendee.id)).length;
  const catsInSelection = new Set(filtered.filter((r) => selectedIds.has(r.attendee.id)).map((r) => r.attendee.category_id)).size;
  const tplsInSelection = new Set(filtered.filter((r) => selectedIds.has(r.attendee.id) && r.template).map((r) => r.template!.id)).size;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button disabled={eventTemplates.length === 0} className="w-full bg-dorado text-empresarial hover:bg-dorado/90">
            <FileDown className="h-4 w-4 mr-2" />
            Abrir Centro de Exportación ({attendees.length} tickets)
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl bg-gray-900 border-gray-800 max-h-[92vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-3 border-b border-gray-800">
            <DialogTitle className="text-dorado flex items-center gap-2">
              <Package className="h-5 w-5" /> Centro de Exportación de Tickets
            </DialogTitle>
            <DialogDescription>
              Filtra, previsualiza, selecciona y descarga tickets individualmente o en lote como ZIP.
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="px-6 py-3 border-b border-gray-800 space-y-3">
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
                    <Filter className="h-4 w-4 mr-1" /> Categorías
                    {selectedCategories.size > 0 && <Badge className="ml-1 bg-dorado text-empresarial">{selectedCategories.size}</Badge>}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 bg-gray-900 border-gray-700">
                  <ScrollArea className="max-h-64">
                    <div className="space-y-1">
                      {categories.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-800 cursor-pointer">
                          <Checkbox checked={selectedCategories.has(c.id)} onCheckedChange={() => toggleCatFilter(c.id)} />
                          <span className="w-3 h-3 rounded" style={{ backgroundColor: c.color }} />
                          <span className="text-sm text-hueso flex-1 truncate">{c.name}</span>
                          <span className="text-xs text-gray-500">{c.count}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="border-gray-700">
                    <Filter className="h-4 w-4 mr-1" /> Plantillas
                    {selectedTemplates.size > 0 && <Badge className="ml-1 bg-dorado text-empresarial">{selectedTemplates.size}</Badge>}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 bg-gray-900 border-gray-700">
                  <ScrollArea className="max-h-64">
                    <div className="space-y-1">
                      {eventTemplates.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-800 cursor-pointer">
                          <Checkbox checked={selectedTemplates.has(t.id)} onCheckedChange={() => toggleTplFilter(t.id)} />
                          <span className="text-sm text-hueso flex-1 truncate">{t.name}</span>
                        </label>
                      ))}
                      <label className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-800 cursor-pointer">
                        <Checkbox checked={selectedTemplates.has('__none__')} onCheckedChange={() => toggleTplFilter('__none__')} />
                        <span className="text-sm text-red-400 flex-1">Sin plantilla</span>
                      </label>
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

              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Limpiar
              </Button>
            </div>

            {/* Selection controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-2 px-2 py-1 rounded bg-gray-800/60 border border-gray-700">
                <Switch id="auto-sync" checked={autoSync} onCheckedChange={setAutoSync} />
                <Label htmlFor="auto-sync" className="text-xs text-hueso cursor-pointer flex items-center gap-1">
                  <Wand2 className="h-3 w-3" /> Sincronizar selección con filtros
                </Label>
                {autoSync && <Badge className="bg-dorado text-empresarial text-[10px] h-4">AUTO</Badge>}
              </div>
              <Button size="sm" variant="outline" className="border-gray-700 h-7" onClick={applyFiltersToSelection} disabled={autoSync}>
                Añadir filtrados a selección
              </Button>
              <Button size="sm" variant="outline" className="border-gray-700 h-7" onClick={toggleAll} disabled={autoSync}>
                {allVisibleSelected ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelectedIds(new Set())} disabled={autoSync}>
                Limpiar selección
              </Button>
              <span className="ml-auto">
                Mostrando <strong className="text-hueso">{filtered.length}</strong> de {attendees.length} · Seleccionados <strong className="text-hueso">{selectedCount}</strong>
              </span>
            </div>
          </div>

          {/* Table (virtualized) */}
          <VirtualizedExportTable
            filtered={filtered}
            selectedIds={selectedIds}
            allVisibleSelected={allVisibleSelected}
            autoSync={autoSync}
            bulkBusy={bulkBusy}
            downloadingId={downloadingId}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            onPreview={openPreview}
            onDownload={downloadSingle}
          />


          {/* Action bar */}
          <div className="border-t border-gray-800 p-4 space-y-3 bg-gray-900">
            {bulkBusy && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-hueso/70">
                  <span>Generando ZIP…</span><span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-dorado h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {lastReport && !bulkBusy && (
              <div className="text-xs text-hueso/70 bg-gray-800/50 rounded p-2">
                Último export: <strong className="text-green-400">{lastReport.ok} OK</strong>
                {lastReport.skipped.length > 0 && <> · <span className="text-yellow-400">{lastReport.skipped.length} sin plantilla</span></>}
                {lastReport.errors.length > 0 && <> · <span className="text-red-400">{lastReport.errors.length} errores</span></>}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs text-hueso/70">Estructura del ZIP</Label>
                <Select value={zipStructure} onValueChange={(v) => setZipStructure(v as ZipStructure)}>
                  <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-hueso"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="category">Por categoría</SelectItem>
                    <SelectItem value="template">Por plantilla</SelectItem>
                    <SelectItem value="flat">Plano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-hueso/70">Formato de nombre</Label>
                <Select value={nameFormat} onValueChange={(v) => setNameFormat(v as NameFormat)}>
                  <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-hueso"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="cedula_nombre">Cédula_Nombre</SelectItem>
                    <SelectItem value="ticket_nombre">TicketID_Nombre</SelectItem>
                    <SelectItem value="nombre">Nombre</SelectItem>
                    <SelectItem value="ticket">TicketID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 text-xs text-gray-400 min-w-[200px]">
                {selectedCount > 0 && <>{selectedCount} seleccionados · {catsInSelection} categorías · {tplsInSelection} plantillas</>}
              </div>

              <Button variant="outline" className="border-gray-700" disabled={bulkBusy || filtered.length === 0} onClick={() => runBulkExport('filtered')}>
                <Package className="h-4 w-4 mr-2" /> Descargar filtrados ({filtered.length})
              </Button>
              <Button className="bg-dorado text-empresarial hover:bg-dorado/90" disabled={bulkBusy || selectedCount === 0} onClick={() => runBulkExport('selected')}>
                {bulkBusy
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {progress}%</>
                  : <><Download className="h-4 w-4 mr-2" /> Descargar seleccionados ({selectedCount})</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewFor} onOpenChange={(v) => { if (!v) closePreview(); }}>
        <DialogContent className="max-w-3xl bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-dorado flex items-center gap-2">
              <Eye className="h-5 w-5" /> Vista previa del ticket
            </DialogTitle>
            <DialogDescription>
              Revisa el contenido antes de descargar. Puedes editar el nombre del archivo.
            </DialogDescription>
          </DialogHeader>
          {previewFor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-500">Asistente:</span> <span className="text-hueso">{previewFor.attendee.name}</span></div>
                <div><span className="text-gray-500">Cédula:</span> <span className="text-hueso">{previewFor.attendee.cedula || '—'}</span></div>
                <div><span className="text-gray-500">Ticket ID:</span> <span className="text-hueso font-mono">{previewFor.attendee.ticket_id}</span></div>
                <div><span className="text-gray-500">Categoría:</span> <span className="text-hueso">{previewFor.attendee.ticket_category?.name || 'N/A'}</span></div>
                <div><span className="text-gray-500">Plantilla:</span> <span className="text-hueso">{previewFor.template.name}</span></div>
                <div><span className="text-gray-500">Tamaño:</span> <span className="text-hueso">{previewFor.template.canvas_width}×{previewFor.template.canvas_height}px</span></div>
              </div>

              <div className="flex items-center justify-center bg-gray-800/50 rounded p-4 min-h-[300px] max-h-[50vh] overflow-auto">
                {previewLoading || !previewUrl ? (
                  <Loader2 className="h-8 w-8 animate-spin text-dorado" />
                ) : (
                  <img src={previewUrl} alt="Preview ticket" className="max-w-full h-auto shadow-lg" />
                )}
              </div>

              <div>
                <Label className="text-xs text-hueso/70">Nombre del archivo</Label>
                <Input value={previewFilename} onChange={(e) => setPreviewFilename(e.target.value)} className="bg-gray-800 border-gray-700 text-hueso font-mono text-sm" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-gray-700" onClick={closePreview}>Cerrar</Button>
                <Button className="bg-dorado text-empresarial hover:bg-dorado/90" disabled={previewLoading || !previewBlobRef.current} onClick={downloadFromPreview}>
                  <Download className="h-4 w-4 mr-2" /> Descargar este ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TicketExportCenter;
