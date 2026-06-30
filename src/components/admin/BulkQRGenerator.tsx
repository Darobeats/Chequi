import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Loader2, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTicketCategories } from '@/hooks/useSupabaseData';
import { useEventContext } from '@/context/EventContext';
import { toast } from '@/components/ui/sonner';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para legibilidad

function randomCode(len: number): string {
  let out = '';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += ALPHABET[arr[i] % ALPHABET.length];
  return out;
}

const BulkQRGenerator: React.FC = () => {
  const { selectedEvent } = useEventContext();
  const { data: categories = [], isLoading: categoriesLoading } = useTicketCategories();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState<number>(100);
  const [prefix, setPrefix] = useState<string>('QR');
  const [categoryId, setCategoryId] = useState<string>('');
  const [namePrefix, setNamePrefix] = useState<string>('Pre-asignado');
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>('');

  const eventCategories = categories;
  const canGenerate = !!selectedEvent?.id && eventCategories.length > 0 && !!categoryId;

  const reset = () => {
    setProgress(0);
    setPhase('');
    setWorking(false);
  };

  const handleGenerate = async () => {
    if (!selectedEvent?.id) return toast.error('Selecciona un evento primero');
    if (!categoryId) return toast.error('Selecciona una categoría');
    if (quantity < 1 || quantity > 10000) return toast.error('Cantidad entre 1 y 10000');

    const cleanPrefix = (prefix || 'QR').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'QR';
    setWorking(true);

    try {
      // 1) Generar códigos únicos en memoria
      setPhase('Generando códigos únicos...');
      setProgress(2);
      const codes = new Set<string>();
      while (codes.size < quantity) {
        codes.add(`${cleanPrefix}-${randomCode(8)}`);
      }
      const codeList = Array.from(codes);

      // 2) Insertar en BD por lotes
      setPhase('Registrando en base de datos...');
      const batchSize = 200;
      for (let i = 0; i < codeList.length; i += batchSize) {
        const chunk = codeList.slice(i, i + batchSize);
        const rows = chunk.map((code, idx) => ({
          event_id: selectedEvent.id,
          category_id: categoryId,
          name: `${namePrefix} #${i + idx + 1}`,
          ticket_id: code,
          qr_code: code,
          status: 'valid',
        }));
        const { error } = await supabase.from('attendees').insert(rows);
        if (error) throw error;
        setProgress(2 + Math.round(((i + chunk.length) / codeList.length) * 48));
      }

      // 3) Generar PNGs en ZIP
      setPhase('Generando imágenes QR...');
      const zip = new JSZip();
      const folder = zip.folder('qrs')!;
      for (let i = 0; i < codeList.length; i++) {
        const code = codeList[i];
        const dataUrl = await QRCode.toDataURL(code, { width: 512, margin: 2, errorCorrectionLevel: 'M' });
        const b64 = dataUrl.split(',')[1];
        folder.file(`${code}.png`, b64, { base64: true });
        if (i % 25 === 0) {
          setProgress(50 + Math.round((i / codeList.length) * 35));
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // 4) Excel con listado
      setPhase('Generando Excel...');
      setProgress(88);
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('QRs');
      const catName = eventCategories.find((c: any) => c.id === categoryId)?.name || '';
      ws.columns = [
        { header: '#', key: 'n', width: 8 },
        { header: 'Código QR', key: 'code', width: 24 },
        { header: 'Categoría', key: 'cat', width: 20 },
        { header: 'Nombre', key: 'name', width: 24 },
      ];
      ws.getRow(1).font = { bold: true };
      codeList.forEach((code, idx) => {
        ws.addRow({ n: idx + 1, code, cat: catName, name: `${namePrefix} #${idx + 1}` });
      });
      const xlsxBuf = await wb.xlsx.writeBuffer();
      zip.file(`listado_${cleanPrefix}.xlsx`, xlsxBuf);

      // 5) Descarga
      setPhase('Empaquetando ZIP...');
      setProgress(95);
      const blob = await zip.generateAsync({ type: 'blob' }, (meta) => {
        setProgress(95 + Math.round(meta.percent * 0.05));
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `qrs_${cleanPrefix}_${quantity}_${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setProgress(100);
      setPhase('¡Listo!');
      toast.success(`${quantity} QRs generados y descargados`);
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1200);
    } catch (e: any) {
      console.error(e);
      toast.error(`Error: ${e.message || 'Falló la generación'}`);
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!working) { setOpen(o); if (!o) reset(); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-dorado text-dorado hover:bg-dorado hover:text-empresarial">
          <QrCode className="h-4 w-4" />
          Generar QRs masivos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generación masiva de QRs</DialogTitle>
          <DialogDescription>
            Crea QRs pre-asignados sin nombre ni cédula. Se registran en el evento, se descargan como PNG y un Excel con el listado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={1}
              max={10000}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value || '0', 10))}
              disabled={working}
            />
            <p className="text-xs text-muted-foreground">Entre 1 y 10.000 QRs por lote.</p>
          </div>

          <div className="space-y-2">
            <Label>Categoría destino</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={working || categoriesLoading || !selectedEvent?.id || eventCategories.length === 0}>
              <SelectTrigger><SelectValue placeholder={categoriesLoading ? 'Cargando categorías...' : 'Selecciona categoría'} /></SelectTrigger>
              <SelectContent>
                {eventCategories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedEvent?.id && (
              <p className="text-xs text-muted-foreground">Selecciona un evento para generar QRs.</p>
            )}
            {selectedEvent?.id && !categoriesLoading && eventCategories.length === 0 && (
              <p className="text-xs text-muted-foreground">Este evento aún no tiene categorías de ticket configuradas.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prefijo código</Label>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="QR" disabled={working} maxLength={8} />
            </div>
            <div className="space-y-2">
              <Label>Prefijo nombre</Label>
              <Input value={namePrefix} onChange={(e) => setNamePrefix(e.target.value)} placeholder="Pre-asignado" disabled={working} />
            </div>
          </div>

          {quantity >= 1000 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Generar {quantity.toLocaleString()} QRs puede tardar varios minutos. No cierres esta ventana.
              </AlertDescription>
            </Alert>
          )}

          {working && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">{phase} ({progress}%)</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={working}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={working || !canGenerate} className="gap-2">
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {working ? 'Procesando...' : 'Generar y descargar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkQRGenerator;
