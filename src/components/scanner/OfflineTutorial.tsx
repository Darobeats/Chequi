import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CloudDownload, WifiOff, RefreshCw, Download, Smartphone } from "lucide-react";

const STORAGE_KEY = "chequi.offlineTutorial.seen.v1";

export default function OfflineTutorial() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Delay so it doesn't fight other UI
        const t = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, []);

  const handleClose = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogContent className="bg-empresarial border-gray-700 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-dorado flex items-center gap-2">
            <WifiOff className="h-5 w-5" /> Trabaja sin internet
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-hueso">
          <p>
            Chequi funciona aunque no haya señal en el evento. Sigue estos 4 pasos
            <strong> antes</strong> de perder la conexión:
          </p>
          <ol className="space-y-2">
            <li className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 text-dorado mt-0.5" />
              <span><strong>Instala la app</strong> en la pantalla de inicio (botón "Instalar").</span>
            </li>
            <li className="flex items-start gap-2">
              <CloudDownload className="h-4 w-4 text-dorado mt-0.5" />
              <span><strong>Prepara el evento offline</strong>: descarga la lista de cédulas y tickets
                con el botón “Preparar evento offline”.</span>
            </li>
            <li className="flex items-start gap-2">
              <WifiOff className="h-4 w-4 text-amber-400 mt-0.5" />
              <span>Escanea normalmente. Los registros quedan en cola local segura.</span>
            </li>
            <li className="flex items-start gap-2">
              <RefreshCw className="h-4 w-4 text-green-400 mt-0.5" />
              <span>Al recuperar internet la <strong>sincronización es automática</strong>.</span>
            </li>
          </ol>
          <div className="rounded-md border border-amber-500/40 bg-amber-900/20 p-2 text-xs text-amber-200">
            <Download className="h-3 w-3 inline mr-1" />
            Puedes descargar un backup .xlsx en cualquier momento desde el botón “Cola offline”.
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleClose} className="bg-dorado text-empresarial hover:bg-dorado/90">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
