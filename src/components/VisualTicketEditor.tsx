import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, Rect, Text, FabricObject } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TicketElement } from '@/types/database';
import { Plus, Trash2, Image as ImageIcon, Type, QrCode, ZoomIn, ZoomOut, Grid } from 'lucide-react';
import QRCode from 'qrcode';

interface VisualTicketEditorProps {
  canvasWidth: number;
  canvasHeight: number;
  elements: TicketElement[];
  backgroundImageUrl?: string | null;
  backgroundOpacity?: number;
  onElementsChange: (elements: TicketElement[]) => void;
  onCanvasSizeChange: (width: number, height: number) => void;
}

export const VisualTicketEditor = ({
  canvasWidth,
  canvasHeight,
  elements,
  backgroundImageUrl,
  backgroundOpacity = 0.15,
  onElementsChange,
  onCanvasSizeChange,
}: VisualTicketEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
    });

    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0] as any;
      if (obj && obj.elementId) {
        setSelectedElement(obj.elementId);
      }
    });

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0] as any;
      if (obj && obj.elementId) {
        setSelectedElement(obj.elementId);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedElement(null);
    });

    canvas.on('object:modified', (e) => {
      syncCanvasToElements(canvas);
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [canvasWidth, canvasHeight]);

  // Load background image
  useEffect(() => {
    if (!fabricCanvas || !backgroundImageUrl) return;

    FabricImage.fromURL(backgroundImageUrl, {
      crossOrigin: 'anonymous',
    }).then((img) => {
      img.scaleToWidth(canvasWidth);
      img.scaleToHeight(canvasHeight);
      img.set({
        opacity: backgroundOpacity,
        selectable: false,
        evented: false,
      });
      fabricCanvas.backgroundImage = img;
      fabricCanvas.renderAll();
    });
  }, [fabricCanvas, backgroundImageUrl, backgroundOpacity, canvasWidth, canvasHeight]);

  // Sync elements to canvas
  useEffect(() => {
    if (!fabricCanvas) return;

    // Clear canvas objects (except background)
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => fabricCanvas.remove(obj));

    // Add elements
    elements.forEach(element => {
      addElementToCanvas(fabricCanvas, element);
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, elements]);

  const addElementToCanvas = async (canvas: FabricCanvas, element: TicketElement) => {
    let obj: FabricObject | null = null;

    if (element.type === 'qr') {
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL('SAMPLE-QR-' + element.id, {
        width: element.width,
        margin: 0,
      });
      
      const img = await FabricImage.fromURL(qrDataUrl);
      img.set({
        left: element.x,
        top: element.y,
        scaleX: element.width / (img.width || 1),
        scaleY: element.height / (img.height || 1),
      });
      obj = img;
    } else if (element.type === 'text') {
      const text = new Text(element.content || getSampleText(element.field), {
        left: element.x,
        top: element.y,
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
      case 'cedula': return '1234567890';
      default: return 'Texto de ejemplo';
    }
  };

  const syncCanvasToElements = (canvas: FabricCanvas) => {
    const updatedElements = elements.map(element => {
      const obj = canvas.getObjects().find(o => (o as any).elementId === element.id);
      if (!obj) return element;

      return {
        ...element,
        x: obj.left || 0,
        y: obj.top || 0,
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1),
      };
    });

    onElementsChange(updatedElements);
  };

  const addQRElement = () => {
    const newElement: TicketElement = {
      id: crypto.randomUUID(),
      type: 'qr',
      x: 50,
      y: 50,
      width: 150,
      height: 150,
    };
    onElementsChange([...elements, newElement]);
  };

  const addTextField = (field: 'name' | 'email' | 'ticket_id' | 'category' | 'cedula') => {
    const newElement: TicketElement = {
      id: crypto.randomUUID(),
      type: 'text',
      x: 50,
      y: 220 + (elements.filter(e => e.type === 'text').length * 30),
      width: 200,
      height: 30,
      field,
      content: getSampleText(field),
      fontSize: 14,
      fontFamily: 'Arial',
      textAlign: 'left',
      color: '#000000',
      bold: false,
    };
    onElementsChange([...elements, newElement]);
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    onElementsChange(elements.filter(e => e.id !== selectedElement));
    setSelectedElement(null);
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.3);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Dimensiones del Canvas</Label>
            <div className="flex gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Ancho (px)</Label>
              <Input
                type="number"
                value={canvasWidth}
                onChange={(e) => onCanvasSizeChange(parseInt(e.target.value) || 800, canvasHeight)}
                min={400}
                max={1200}
              />
            </div>
            <div className="flex-1">
              <Label>Alto (px)</Label>
              <Input
                type="number"
                value={canvasHeight}
                onChange={(e) => onCanvasSizeChange(canvasWidth, parseInt(e.target.value) || 600)}
                min={300}
                max={1200}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <Label className="mb-2 block">Agregar Elementos</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQRElement}
          >
            <QrCode className="h-4 w-4 mr-2" />
            Código QR
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTextField('name')}
          >
            <Type className="h-4 w-4 mr-2" />
            Nombre
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTextField('ticket_id')}
          >
            <Type className="h-4 w-4 mr-2" />
            ID Ticket
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTextField('category')}
          >
            <Type className="h-4 w-4 mr-2" />
            Categoría
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTextField('cedula')}
          >
            <Type className="h-4 w-4 mr-2" />
            Cédula
          </Button>
          {selectedElement && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={deleteSelectedElement}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </Card>

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

      <div className="text-sm text-muted-foreground">
        <p>💡 <strong>Instrucciones:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Haz clic en los botones para agregar elementos al canvas</li>
          <li>Arrastra los elementos para posicionarlos</li>
          <li>Redimensiona los elementos usando los controles en las esquinas</li>
          <li>Selecciona un elemento y haz clic en "Eliminar" para quitarlo</li>
          <li>Los elementos se guardarán automáticamente con la plantilla</li>
        </ul>
      </div>
    </div>
  );
};
