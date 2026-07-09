import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, Line, Text, FabricObject } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketElement } from '@/types/database';
import {
  Trash2, Type, QrCode, ZoomIn, ZoomOut, Grid, Magnet,
  AlignLeft, AlignCenter, AlignRight, Bold, Undo2, Redo2,
  Download, FileText, Crop as CropIcon,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
  GitCompare, Eye,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';
import { TemplateCompareDialog } from './TemplateCompareDialog';
import { TicketTemplate } from '@/types/database';
import { BackgroundCropDialog } from './BackgroundCropDialog';

export interface BackgroundTransform {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  opacity?: number;
}

interface VisualTicketEditorProps {
  canvasWidth: number;
  canvasHeight: number;
  elements: TicketElement[];
  backgroundImageUrl?: string | null;
  backgroundOpacity?: number;
  backgroundTransform?: BackgroundTransform;
  backgroundMode?: 'tile' | 'cover' | 'contain' | 'full_ticket';
  onElementsChange: (elements: TicketElement[]) => void;
  onCanvasSizeChange: (width: number, height: number) => void;
  onBackgroundTransformChange?: (t: BackgroundTransform) => void;
  onBackgroundImageChange?: (url: string) => void;
}

interface HistoryEntry {
  json: any;
  bgTransform: BackgroundTransform | undefined;
}

const SNAP_GRID = 10;
const SNAP_ANGLE = 15;
const GUIDE_THRESHOLD = 5;

export const VisualTicketEditor = ({
  canvasWidth,
  canvasHeight,
  elements,
  backgroundImageUrl,
  backgroundOpacity = 0.15,
  backgroundTransform,
  backgroundMode: _backgroundMode = 'tile',
  onElementsChange,
  onCanvasSizeChange,
  onBackgroundTransformChange,
  onBackgroundImageChange,
}: VisualTicketEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [bgEditable, setBgEditable] = useState(true);
  const [cropOpen, setCropOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareExportOnly, setCompareExportOnly] = useState(false);
  const [editorSnapshot, setEditorSnapshot] = useState<string | null>(null);

  // Refs to avoid re-instantiating background on transform round-trip
  const isEditingBgRef = useRef(false);
  const suppressHistoryRef = useRef(false);
  const guideLinesRef = useRef<Line[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const cursorRef = useRef(-1);
  const [historyTick, setHistoryTick] = useState(0);
  const elementsRef = useRef(elements);
  const backgroundTransformRef = useRef(backgroundTransform);
  const backgroundOpacityRef = useRef(backgroundOpacity);
  const bgEditableRef = useRef(bgEditable);
  const onElementsChangeRef = useRef(onElementsChange);
  const onBackgroundTransformChangeRef = useRef(onBackgroundTransformChange);
  const onCanvasSizeChangeRef = useRef(onCanvasSizeChange);

  elementsRef.current = elements;
  backgroundTransformRef.current = backgroundTransform;
  backgroundOpacityRef.current = backgroundOpacity;
  bgEditableRef.current = bgEditable;
  onElementsChangeRef.current = onElementsChange;
  onBackgroundTransformChangeRef.current = onBackgroundTransformChange;
  onCanvasSizeChangeRef.current = onCanvasSizeChange;

  // ---------- Init canvas ----------
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0] as any;
      if (obj?.elementId) setSelectedElement(obj.elementId);
    });
    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0] as any;
      if (obj?.elementId) setSelectedElement(obj.elementId);
    });
    canvas.on('selection:cleared', () => setSelectedElement(null));

    setFabricCanvas(canvas);
    return () => { canvas.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize canvas when dimensions change
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    fabricCanvas.renderAll();
  }, [fabricCanvas, canvasWidth, canvasHeight]);

  // ---------- Background load (fix #0) ----------
  // Only re-instantiate on URL / canvas change. Skip while user is dragging.
  useEffect(() => {
    if (!fabricCanvas) return;
    if (isEditingBgRef.current) return;
    let cancelled = false;

    const removeBackgrounds = () => {
      fabricCanvas.getObjects().forEach((o: any) => {
        if (o.elementType === 'background') fabricCanvas.remove(o);
      });
    };

    if (!backgroundImageUrl) {
      removeBackgrounds();
      fabricCanvas.renderAll();
      return () => { cancelled = true; };
    }

    FabricImage.fromURL(backgroundImageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      if (cancelled) return;
      const iw = img.width || 1;
      const ih0 = img.height || 1;
      // Auto-fit canvas to image's natural dimensions.
      if (iw !== canvasWidth || ih0 !== canvasHeight) {
        onCanvasSizeChangeRef.current(iw, ih0);
        return; // effect will re-run with new dimensions
      }
      const ih = ih0;
      const transform = backgroundTransformRef.current;
      let scaleX = transform?.scaleX ?? 1;
      let scaleY = transform?.scaleY ?? 1;
      let left = transform?.x ?? 0;
      let top = transform?.y ?? 0;
      const angle = transform?.angle ?? 0;

      const hasStoredTransform =
        transform &&
        (transform.scaleX != null || transform.scaleY != null);

      if (!hasStoredTransform) {
        const s = Math.max(canvasWidth / iw, canvasHeight / ih);
        scaleX = s; scaleY = s;
        left = (canvasWidth - iw * s) / 2;
        top = (canvasHeight - ih * s) / 2;
      }

      // Defensive clamp: if stored position lands way off-canvas, recenter
      const outX = left < -canvasWidth || left > canvasWidth * 2;
      const outY = top < -canvasHeight || top > canvasHeight * 2;
      if (outX || outY) { left = 0; top = 0; }

      img.set({
        left, top, scaleX, scaleY, angle,
        opacity: backgroundOpacityRef.current,
        selectable: bgEditableRef.current,
        evented: bgEditableRef.current,
        hasControls: bgEditableRef.current,
        lockRotation: false,
      });
      (img as any).elementType = 'background';
      (img as any).backgroundSourceUrl = backgroundImageUrl;

      removeBackgrounds();
      fabricCanvas.add(img);
      try { fabricCanvas.sendObjectToBack(img); } catch { /* fabric api variance */ }
      fabricCanvas.renderAll();
    });
    return () => { cancelled = true; };
  }, [fabricCanvas, backgroundImageUrl, canvasWidth, canvasHeight]);

  // Update opacity without recreating background
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.getObjects().forEach((o: any) => {
      if (o.elementType === 'background') {
        o.set('opacity', backgroundOpacity);
      }
    });
    fabricCanvas.renderAll();
  }, [fabricCanvas, backgroundOpacity]);

  // Toggle bg interactivity
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.getObjects().forEach((o: any) => {
      if (o.elementType === 'background') {
        o.set({ selectable: bgEditable, evented: bgEditable, hasControls: bgEditable });
      }
    });
    fabricCanvas.renderAll();
  }, [fabricCanvas, bgEditable]);

  // ---------- Snap-to-grid + alignment guides ----------
  const clearGuides = useCallback(() => {
    if (!fabricCanvas) return;
    guideLinesRef.current.forEach(l => fabricCanvas.remove(l));
    guideLinesRef.current = [];
  }, [fabricCanvas]);

  const drawGuide = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    if (!fabricCanvas) return;
    const line = new Line([x1, y1, x2, y2], {
      stroke: '#ff00ff',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    (line as any).elementType = 'guide';
    fabricCanvas.add(line);
    guideLinesRef.current.push(line);
  }, [fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const onMoving = (e: any) => {
      const t = e.target as any;
      if (!t) return;
      if (t.elementType === 'background') isEditingBgRef.current = true;

      if (snapEnabled) {
        t.left = Math.round(t.left / SNAP_GRID) * SNAP_GRID;
        t.top = Math.round(t.top / SNAP_GRID) * SNAP_GRID;
      }

      clearGuides();
      // Alignment vs canvas center & edges
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;
      const objCx = t.left + (t.width * t.scaleX) / 2;
      const objCy = t.top + (t.height * t.scaleY) / 2;
      if (Math.abs(objCx - cx) < GUIDE_THRESHOLD) {
        t.left = cx - (t.width * t.scaleX) / 2;
        drawGuide(cx, 0, cx, canvasHeight);
      }
      if (Math.abs(objCy - cy) < GUIDE_THRESHOLD) {
        t.top = cy - (t.height * t.scaleY) / 2;
        drawGuide(0, cy, canvasWidth, cy);
      }
      if (Math.abs(t.left) < GUIDE_THRESHOLD) { t.left = 0; drawGuide(0, 0, 0, canvasHeight); }
      if (Math.abs(t.top) < GUIDE_THRESHOLD) { t.top = 0; drawGuide(0, 0, canvasWidth, 0); }
    };

    const onScaling = (e: any) => {
      const t = e.target as any;
      if (!t) return;
      if (t.elementType === 'background') isEditingBgRef.current = true;
    };

    const onRotating = (e: any) => {
      const t = e.target as any;
      if (!t) return;
      if (t.elementType === 'background') isEditingBgRef.current = true;
      if (snapEnabled) {
        t.angle = Math.round(t.angle / SNAP_ANGLE) * SNAP_ANGLE;
      }
    };

    const onModified = (e: any) => {
      const t = e.target as any;
      clearGuides();
      if (t?.elementType === 'background') {
        isEditingBgRef.current = false;
        const nextTransform = {
          x: t.left ?? 0,
          y: t.top ?? 0,
          scaleX: t.scaleX ?? 1,
          scaleY: t.scaleY ?? 1,
          angle: t.angle ?? 0,
          // opacity omitted intentionally
        };
        backgroundTransformRef.current = nextTransform;
        onBackgroundTransformChangeRef.current?.(nextTransform);
      } else {
        syncCanvasToElements(fabricCanvas);
      }
      pushHistory();
    };

    const onMouseUp = () => {
      clearGuides();
      isEditingBgRef.current = false;
    };

    fabricCanvas.on('object:moving', onMoving);
    fabricCanvas.on('object:scaling', onScaling);
    fabricCanvas.on('object:rotating', onRotating);
    fabricCanvas.on('object:modified', onModified);
    fabricCanvas.on('mouse:up', onMouseUp);

    return () => {
      fabricCanvas.off('object:moving', onMoving);
      fabricCanvas.off('object:scaling', onScaling);
      fabricCanvas.off('object:rotating', onRotating);
      fabricCanvas.off('object:modified', onModified);
      fabricCanvas.off('mouse:up', onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvas, snapEnabled, canvasWidth, canvasHeight, clearGuides, drawGuide]);

  // ---------- Sync elements ----------
  useEffect(() => {
    if (!fabricCanvas) return;

    const canvasElementIds = fabricCanvas.getObjects().map(obj => (obj as any).elementId).filter(Boolean);
    const elementIds = elements.map(e => e.id);

    fabricCanvas.getObjects().forEach(obj => {
      const elementId = (obj as any).elementId;
      if (elementId && !elementIds.includes(elementId)) {
        fabricCanvas.remove(obj);
      }
    });

    elements.forEach(element => {
      if (!canvasElementIds.includes(element.id)) {
        addElementToCanvas(fabricCanvas, element);
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, elements]);

  const addElementToCanvas = async (canvas: FabricCanvas, element: TicketElement) => {
    let obj: FabricObject | null = null;

    if (element.type === 'qr') {
      const qrDataUrl = await QRCode.toDataURL('SAMPLE-QR-' + element.id, {
        width: element.width, margin: 0,
      });
      const img = await FabricImage.fromURL(qrDataUrl);
      img.set({
        left: element.x, top: element.y,
        scaleX: element.width / (img.width || 1),
        scaleY: element.height / (img.height || 1),
      });
      obj = img;
    } else if (element.type === 'text') {
      const text = new Text(element.content || getSampleText(element.field), {
        left: element.x, top: element.y,
        fontSize: element.fontSize || 14,
        fontFamily: element.fontFamily || 'Arial',
        fill: element.color || '#000000',
        fontWeight: element.bold ? 'bold' : 'normal',
        textAlign: element.textAlign || 'left',
      });
      obj = text;
    }

    if (obj) {
      (obj as any).elementId = element.id;
      (obj as any).elementType = element.type;
      canvas.add(obj);
    }
  };

  const getSampleText = (field?: string) => {
    switch (field) {
      case 'name': return 'Juan Pérez';
      case 'email': return 'juan@example.com';
      case 'ticket_id': return 'EVT-VIP-ABC1-2024';
      case 'category': return 'VIP';
      case 'cedula': return 'Cc 1234567890';
      default: return 'Texto de ejemplo';
    }
  };

  const syncCanvasToElements = (canvas: FabricCanvas) => {
    // Preserve the visual stacking order from the Fabric canvas (bottom -> top).
    // Background and guides are excluded; only real elements contribute to the array order.
    const stack = canvas.getObjects()
      .filter((o: any) => o.elementId && (o.elementType === 'qr' || o.elementType === 'text'));
    const byId = new Map(elementsRef.current.map(e => [e.id, e]));

    const updated: TicketElement[] = [];
    stack.forEach((obj: any) => {
      const element = byId.get(obj.elementId);
      if (!element) return;
      const scaleX = obj.scaleX || 1;
      const scaleY = obj.scaleY || 1;
      if (element.type === 'text') {
        const baseFontSize = element.fontSize || obj.fontSize || 14;
        const newFontSize = Math.max(4, Math.round(baseFontSize * scaleY));
        const newWidth = (obj.width || 0) * scaleX;
        const newHeight = (obj.height || 0) * scaleY;
        if (scaleX !== 1 || scaleY !== 1) {
          obj.set({ fontSize: newFontSize, scaleX: 1, scaleY: 1, width: obj.width });
          obj.setCoords();
        }
        updated.push({
          ...element,
          x: obj.left || 0,
          y: obj.top || 0,
          width: newWidth,
          height: newHeight,
          fontSize: newFontSize,
        });
      } else {
        updated.push({
          ...element,
          x: obj.left || 0,
          y: obj.top || 0,
          width: (obj.width || 0) * scaleX,
          height: (obj.height || 0) * scaleY,
        });
      }
    });

    // Append any elements not present in canvas (safety) preserving previous order
    elementsRef.current.forEach(el => {
      if (!updated.find(u => u.id === el.id)) updated.push(el);
    });

    onElementsChangeRef.current(updated);
  };

  // ---------- History (undo/redo) ----------
  const pushHistory = useCallback(() => {
    if (!fabricCanvas) return;
    if (suppressHistoryRef.current) return;
    const entry: HistoryEntry = {
      json: (fabricCanvas as any).toJSON(['elementId', 'elementType']),
      bgTransform: backgroundTransformRef.current ? { ...backgroundTransformRef.current } : undefined,
    };
    // Drop redo tail
    historyRef.current = historyRef.current.slice(0, cursorRef.current + 1);
    historyRef.current.push(entry);
    if (historyRef.current.length > 50) historyRef.current.shift();
    cursorRef.current = historyRef.current.length - 1;
    setHistoryTick(t => t + 1);
  }, [fabricCanvas]);

  // Seed history on first canvas render
  useEffect(() => {
    if (!fabricCanvas) return;
    const t = setTimeout(() => pushHistory(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvas]);

  const applyHistory = useCallback((entry: HistoryEntry) => {
    if (!fabricCanvas) return;
    suppressHistoryRef.current = true;
    (fabricCanvas.loadFromJSON(entry.json) as unknown as Promise<any>).then(() => {
      fabricCanvas.renderAll();
      const restored: TicketElement[] = [];
      fabricCanvas.getObjects().forEach((o: any) => {
        if (!o.elementId) return;
        if (o.elementType === 'qr' || o.elementType === 'text') {
          const base = elementsRef.current.find(e => e.id === o.elementId);
          restored.push({
            ...(base as TicketElement),
            id: o.elementId,
            type: o.elementType,
            x: o.left || 0,
            y: o.top || 0,
            width: (o.width || 0) * (o.scaleX || 1),
            height: (o.height || 0) * (o.scaleY || 1),
          } as TicketElement);
        }
      });
      onElementsChangeRef.current(restored);
      if (entry.bgTransform) {
        backgroundTransformRef.current = entry.bgTransform;
        onBackgroundTransformChangeRef.current?.(entry.bgTransform);
      }
      setTimeout(() => { suppressHistoryRef.current = false; }, 100);
    });
  }, [fabricCanvas]);

  const undo = useCallback(() => {
    if (cursorRef.current <= 0) return;
    cursorRef.current -= 1;
    applyHistory(historyRef.current[cursorRef.current]);
    setHistoryTick(t => t + 1);
  }, [applyHistory]);

  const redo = useCallback(() => {
    if (cursorRef.current >= historyRef.current.length - 1) return;
    cursorRef.current += 1;
    applyHistory(historyRef.current[cursorRef.current]);
    setHistoryTick(t => t + 1);
  }, [applyHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) return;
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ---------- Export PNG / PDF ----------
  const exportPNG = () => {
    if (!fabricCanvas) return;
    clearGuides();
    const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2, quality: 1 } as any);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `ticket-${Date.now()}.png`;
    link.click();
    toast({ title: 'PNG exportado', description: 'La imagen se descargó a alta resolución.' });
  };

  const exportPDF = () => {
    if (!fabricCanvas) return;
    clearGuides();
    const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2, quality: 1 } as any);
    const pdf = new jsPDF({
      orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvasWidth, canvasHeight],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, canvasWidth, canvasHeight);
    pdf.save(`ticket-${Date.now()}.pdf`);
    toast({ title: 'PDF exportado', description: 'El PDF del ticket se descargó correctamente.' });
  };

  // ---------- Element ops ----------
  const addQRElement = () => {
    if (elements.some(e => e.type === 'qr')) {
      toast({ title: 'Ya existe un código QR', description: 'Solo puedes agregar un código QR por plantilla', variant: 'destructive' });
      return;
    }
    onElementsChange([...elements, {
      id: crypto.randomUUID(), type: 'qr', x: 50, y: 50, width: 150, height: 150,
    }]);
  };

  const addTextField = (field: 'name' | 'email' | 'ticket_id' | 'category' | 'cedula') => {
    if (elements.some(e => e.type === 'text' && e.field === field)) {
      toast({ title: 'Campo ya existe', description: `El campo "${field}" ya fue agregado`, variant: 'destructive' });
      return;
    }
    onElementsChange([...elements, {
      id: crypto.randomUUID(), type: 'text',
      x: 50, y: 220 + (elements.filter(e => e.type === 'text').length * 30),
      width: 200, height: 30, field, content: getSampleText(field),
      fontSize: 14, fontFamily: 'Arial', textAlign: 'left', color: '#000000', bold: false,
    }]);
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    onElementsChange(elements.filter(e => e.id !== selectedElement));
    setSelectedElement(null);
  };

  const updateSelectedElement = (updates: Partial<TicketElement>) => {
    if (!selectedElement) return;
    onElementsChange(elements.map(el => el.id === selectedElement ? { ...el, ...updates } : el));
    if (fabricCanvas) {
      const obj = fabricCanvas.getObjects().find(o => (o as any).elementId === selectedElement);
      if (obj && obj instanceof Text) {
        if (updates.fontSize) obj.set('fontSize', updates.fontSize);
        if (updates.fontFamily) obj.set('fontFamily', updates.fontFamily);
        if (updates.bold !== undefined) obj.set('fontWeight', updates.bold ? 'bold' : 'normal');
        if (updates.textAlign) obj.set('textAlign', updates.textAlign);
        if (updates.color) obj.set('fill', updates.color);
        fabricCanvas.renderAll();
      }
    }
  };

  const selectedElementData = elements.find(e => e.id === selectedElement);

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const nz = Math.min(zoom * 1.2, 3);
    setZoom(nz); fabricCanvas.setZoom(nz); fabricCanvas.renderAll();
  };
  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const nz = Math.max(zoom / 1.2, 0.3);
    setZoom(nz); fabricCanvas.setZoom(nz); fabricCanvas.renderAll();
  };

  const canUndo = cursorRef.current > 0;
  const canRedo = cursorRef.current < historyRef.current.length - 1;

  // ---------- Layer ops ----------
  const changeLayer = (mode: 'up' | 'down' | 'top' | 'bottom') => {
    if (!fabricCanvas || !selectedElement) return;
    const obj = fabricCanvas.getObjects().find(o => (o as any).elementId === selectedElement);
    if (!obj) return;
    try {
      if (mode === 'up') (fabricCanvas as any).bringObjectForward(obj);
      else if (mode === 'down') (fabricCanvas as any).sendObjectBackwards(obj);
      else if (mode === 'top') (fabricCanvas as any).bringObjectToFront(obj);
      else (fabricCanvas as any).sendObjectToBack(obj);
      // Keep background at the very bottom
      fabricCanvas.getObjects().forEach((o: any) => {
        if (o.elementType === 'background') {
          try { (fabricCanvas as any).sendObjectToBack(o); } catch { /* noop */ }
        }
      });
      syncCanvasToElements(fabricCanvas);
      fabricCanvas.renderAll();
      pushHistory();
    } catch (e) {
      console.warn('layer op failed', e);
    }
  };

  // ---------- Build a template snapshot for the export engine ----------
  const buildTemplateSnapshot = (): TicketTemplate => ({
    id: 'preview',
    event_config_id: null,
    name: 'Preview',
    tickets_per_page: 1,
    layout: '1x1',
    show_qr: true, show_name: true, show_email: false, show_category: false, show_ticket_id: false,
    custom_fields: [],
    qr_size: 200,
    font_size_name: 14, font_size_info: 10,
    margin_top: 0, margin_bottom: 0, margin_left: 0, margin_right: 0,
    background_image_url: backgroundImageUrl || null,
    background_opacity: backgroundOpacity,
    background_mode: (_backgroundMode as any) || 'tile',
    background_transform: backgroundTransform,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    canvas_width: canvasWidth,
    canvas_height: canvasHeight,
    elements: elements as any,
    use_visual_editor: true,
  } as any);

  const openCompare = () => {
    if (!fabricCanvas) return;
    clearGuides();
    try {
      const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 1, quality: 1 } as any);
      setEditorSnapshot(dataUrl);
    } catch {
      setEditorSnapshot(null);
    }
    setCompareExportOnly(false);
    setCompareOpen(true);
  };

  const openExportPreview = () => {
    setEditorSnapshot(null);
    setCompareExportOnly(true);
    setCompareOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button type="button" variant="outline" size="sm" onClick={handleZoomOut} title="Alejar">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[3ch] text-center">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="outline" size="sm" onClick={handleZoomIn} title="Acercar">
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button type="button" variant={showGrid ? 'default' : 'outline'} size="sm" onClick={() => setShowGrid(!showGrid)} title="Grilla">
            <Grid className="h-4 w-4" />
          </Button>
          <Button type="button" variant={snapEnabled ? 'default' : 'outline'} size="sm" onClick={() => setSnapEnabled(!snapEnabled)} title="Snap y guías de alineación">
            <Magnet className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button type="button" variant="outline" size="sm" onClick={exportPNG} title="Exportar PNG">
            <Download className="h-4 w-4 mr-1" /> PNG
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportPDF} title="Exportar PDF">
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button type="button" variant="outline" size="sm" onClick={openCompare} title="Comparar editor vs. motor de exportación">
            <GitCompare className="h-4 w-4 mr-1" /> Comparar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openExportPreview} title="Renderizar con el motor de exportación">
            <Eye className="h-4 w-4 mr-1" /> Render export
          </Button>
        </div>
      </Card>

      {/* CANVAS SIZE (auto-derived from background image) */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Label className="block">Tamaño del ticket</Label>
            <p className="text-xs text-muted-foreground">
              {backgroundImageUrl
                ? 'Definido automáticamente por la imagen de fondo.'
                : 'Sube una imagen para definir el tamaño del ticket.'}
            </p>
          </div>
          <div className="text-sm font-mono px-3 py-1.5 rounded-md bg-muted">
            {canvasWidth} × {canvasHeight} px
          </div>
        </div>
      </Card>

      {/* BACKGROUND CONTROLS */}
      {backgroundImageUrl && (
        <Card className="p-4 border-primary/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <Label className="block">Imagen de fondo</Label>
              <p className="text-xs text-muted-foreground">
                {bgEditable
                  ? '✏️ Arrastra, escala y rota la imagen sobre el canvas. Se conserva la calidad original.'
                  : '🔒 Bloqueada. Actívala para reposicionar/escalar/rotar.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCropOpen(true)}>
                <CropIcon className="h-4 w-4 mr-1" /> Recortar
              </Button>
              <Button type="button" variant={bgEditable ? 'default' : 'outline'} size="sm" onClick={() => setBgEditable(!bgEditable)}>
                {bgEditable ? '🔒 Bloquear' : '🔓 Editar'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ADD ELEMENTS */}
      <Card className="p-4">
        <Label className="mb-2 block">Agregar Elementos</Label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addQRElement}>
            <QrCode className="h-4 w-4 mr-2" /> Código QR
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addTextField('name')}>
            <Type className="h-4 w-4 mr-2" /> Nombre
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addTextField('ticket_id')}>
            <Type className="h-4 w-4 mr-2" /> ID Ticket
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addTextField('category')}>
            <Type className="h-4 w-4 mr-2" /> Categoría
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addTextField('cedula')}>
            <Type className="h-4 w-4 mr-2" /> Cédula
          </Button>
          {selectedElement && (
            <Button type="button" variant="destructive" size="sm" onClick={deleteSelectedElement}>
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
          )}
        </div>
      </Card>

      {selectedElementData && selectedElementData.type === 'text' && (
        <Card className="p-4">
          <Label className="mb-3 block">Propiedades del Texto</Label>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-2 block">Fuente</Label>
                <Select value={selectedElementData.fontFamily || 'Arial'} onValueChange={(v) => updateSelectedElement({ fontFamily: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-2 block">Tamaño</Label>
                <Input type="number" value={selectedElementData.fontSize || 14}
                  onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 14 })}
                  min={8} max={72} />
              </div>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Alineación</Label>
              <div className="flex gap-2">
                <Button type="button" variant={selectedElementData.textAlign === 'left' ? 'default' : 'outline'} size="sm" onClick={() => updateSelectedElement({ textAlign: 'left' })}><AlignLeft className="h-4 w-4" /></Button>
                <Button type="button" variant={selectedElementData.textAlign === 'center' ? 'default' : 'outline'} size="sm" onClick={() => updateSelectedElement({ textAlign: 'center' })}><AlignCenter className="h-4 w-4" /></Button>
                <Button type="button" variant={selectedElementData.textAlign === 'right' ? 'default' : 'outline'} size="sm" onClick={() => updateSelectedElement({ textAlign: 'right' })}><AlignRight className="h-4 w-4" /></Button>
                <Button type="button" variant={selectedElementData.bold ? 'default' : 'outline'} size="sm" onClick={() => updateSelectedElement({ bold: !selectedElementData.bold })}><Bold className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Color</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={selectedElementData.color || '#000000'} onChange={(e) => updateSelectedElement({ color: e.target.value })} className="w-20 h-10" />
                <Input type="text" value={selectedElementData.color || '#000000'} onChange={(e) => updateSelectedElement({ color: e.target.value })} className="flex-1" placeholder="#000000" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* CANVAS */}
      <Card className="p-4">
        <div
          className="relative border border-border rounded-lg overflow-auto"
          style={{
            maxHeight: '600px',
            backgroundImage: showGrid ? 'linear-gradient(hsl(var(--muted)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--muted)) 1px, transparent 1px)' : 'none',
            backgroundSize: showGrid ? '20px 20px' : 'auto',
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        💡 <strong>Atajos:</strong> Ctrl+Z deshacer · Ctrl+Shift+Z rehacer · arrastra la imagen del fondo para reposicionar · el snap alinea a la grilla y al centro.
      </div>

      {/* CROP DIALOG */}
      {backgroundImageUrl && onBackgroundImageChange && (
        <BackgroundCropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageUrl={backgroundImageUrl}
          onCropped={(newUrl) => {
            onBackgroundImageChange(newUrl);
            onBackgroundTransformChange?.({});
            setCropOpen(false);
          }}
        />
      )}
    </div>
  );
};
