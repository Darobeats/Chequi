import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Attendee, TicketTemplate } from '@/types/database';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Eye } from 'lucide-react';

export interface ExportRow {
  attendee: Attendee;
  template?: TicketTemplate;
}

interface Props {
  filtered: ExportRow[];
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  autoSync: boolean;
  bulkBusy: boolean;
  downloadingId: string | null;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onPreview: (a: Attendee, tpl?: TicketTemplate) => void;
  onDownload: (a: Attendee, tpl?: TicketTemplate) => void;
}

const ROW_HEIGHT = 44;
const OVERSCAN = 8;

/**
 * Lightweight virtualized table for the export center. Renders only the rows
 * currently visible in the scroll viewport plus a small overscan. Handles
 * 9.500+ rows without collapsing the DOM.
 */
const VirtualizedExportTable: React.FC<Props> = ({
  filtered,
  selectedIds,
  allVisibleSelected,
  autoSync,
  bulkBusy,
  downloadingId,
  onToggleAll,
  onToggleOne,
  onPreview,
  onDownload,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(400);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const total = filtered.length;
  const totalHeight = total * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(total, Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + OVERSCAN);
  const items = useMemo(() => filtered.slice(startIndex, endIndex), [filtered, startIndex, endIndex]);
  const offsetY = startIndex * ROW_HEIGHT;

  return (
    <div className="flex-1 flex flex-col min-h-0 px-6 py-3">
      {/* Header */}
      <div className="text-xs text-hueso/70 border-b border-gray-800 grid grid-cols-[40px_2fr_1fr_1.2fr_1fr_1fr_120px] items-center px-2 py-2 sticky top-0 bg-gray-900 z-10">
        <div><Checkbox checked={allVisibleSelected} onCheckedChange={onToggleAll} disabled={autoSync} /></div>
        <div>Nombre</div>
        <div>Cédula</div>
        <div>Ticket ID</div>
        <div>Categoría</div>
        <div>Plantilla</div>
        <div className="text-right">Acciones</div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex-1 overflow-auto relative"
        style={{ contain: 'strict' as any }}
      >
        {total === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No hay resultados con los filtros aplicados.</div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
              {items.map(({ attendee: a, template: tpl }) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[40px_2fr_1fr_1.2fr_1fr_1fr_120px] items-center px-2 border-b border-gray-800/50 hover:bg-gray-800/30 text-sm"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div>
                    <Checkbox
                      checked={selectedIds.has(a.id)}
                      disabled={!tpl || autoSync}
                      onCheckedChange={() => onToggleOne(a.id)}
                    />
                  </div>
                  <div className="text-hueso truncate">{a.name}</div>
                  <div className="text-gray-400 truncate">{a.cedula || '—'}</div>
                  <div className="text-gray-400 font-mono text-xs truncate">{a.ticket_id}</div>
                  <div className="truncate">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: a.ticket_category?.color || '#888',
                        color: a.ticket_category?.color || '#888',
                      }}
                    >
                      {a.ticket_category?.name || 'N/A'}
                    </Badge>
                  </div>
                  <div className="truncate">
                    {tpl ? (
                      <span className="text-hueso/80 text-xs">{tpl.name}</span>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Sin plantilla</Badge>
                    )}
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-gray-700"
                      disabled={!tpl || bulkBusy}
                      onClick={() => onPreview(a, tpl)}
                      title="Vista previa"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-gray-700"
                      disabled={!tpl || downloadingId === a.id || bulkBusy}
                      onClick={() => onDownload(a, tpl)}
                    >
                      {downloadingId === a.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-3 w-3 mr-1" /> PNG
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-gray-500 pt-1 px-1">
        {total.toLocaleString()} filas · renderizando {items.length} visibles (virtualizado)
      </div>
    </div>
  );
};

export default VirtualizedExportTable;
