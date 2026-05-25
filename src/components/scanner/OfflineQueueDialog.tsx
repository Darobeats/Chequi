import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks, RefreshCw, Trash2, Download, AlertTriangle } from "lucide-react";
import {
  listPendingCedulaScans,
  deletePendingCedulaScan,
  type PendingCedulaScan,
} from "@/lib/offlineDB";
import { useEventContext } from "@/context/EventContext";
import { exportOfflineBackup, downloadBlob } from "@/lib/offlineBackupExport";
import { toast } from "sonner";

interface Props {
  isOnline: boolean;
  isSyncing: boolean;
  onSync: () => void;
  pendingCount: number;
}

export default function OfflineQueueDialog({ isOnline, isSyncing, onSync, pendingCount }: Props) {
  const { selectedEvent } = useEventContext();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingCedulaScan[]>([]);
  const eventId = selectedEvent?.id ?? null;

  const refresh = async () => {
    if (!eventId) return setItems([]);
    setItems(await listPendingCedulaScans(eventId));
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open, pendingCount]);

  const failed = useMemo(() => items.filter((i) => i.status === "failed").length, [items]);

  const handleDownloadBackup = async () => {
    if (!eventId) return;
    try {
      const blob = await exportOfflineBackup({
        eventId,
        eventName: selectedEvent?.event_name,
      });
      const safeName = (selectedEvent?.event_name ?? "evento").replace(/[^a-z0-9]+/gi, "_");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadBlob(blob, `Chequi_backup_offline_${safeName}_${stamp}.xlsx`);
      toast.success("Backup descargado");
    } catch (e: any) {
      console.error(e);
      toast.error("No se pudo generar el backup", { description: e?.message });
    }
  };

  const handleDelete = async (id: string) => {
    await deletePendingCedulaScan(id);
    await refresh();
    toast.success("Escaneo eliminado de la cola");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs">
          <ListChecks className="h-3.5 w-3.5 mr-1" />
          Cola offline
          {pendingCount > 0 && (
            <Badge className="ml-2 bg-amber-500 text-black h-5 px-1.5 text-[10px]">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-empresarial border-gray-700 max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-dorado flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Cola de escaneos offline
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 py-2">
          <Badge variant="outline" className="text-xs">
            {items.length} pendientes
          </Badge>
          {failed > 0 && (
            <Badge variant="destructive" className="text-xs">
              {failed} con error
            </Badge>
          )}
          <Badge variant={isOnline ? "default" : "secondary"} className="text-xs">
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onSync} disabled={!isOnline || isSyncing || items.length === 0}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
            Sincronizar ahora
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadBackup} disabled={!eventId}>
            <Download className="h-3.5 w-3.5 mr-1" /> Descargar backup .xlsx
          </Button>
        </div>

        <ScrollArea className="h-[50vh] mt-3 rounded border border-gray-700">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              No hay escaneos pendientes 🎉
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {items.map((it) => {
                const reg = it.payload?.registro ?? {};
                const nombre = [reg.nombres, reg.primer_apellido, reg.segundo_apellido]
                  .filter(Boolean).join(" ").trim();
                return (
                  <li key={it.id} className="p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-hueso truncate">
                        {nombre || it.numeroCedula}
                      </div>
                      <div className="text-xs text-gray-400">
                        Cédula: {it.numeroCedula} ·{" "}
                        {new Date(it.timestamp).toLocaleTimeString()}
                      </div>
                      {it.status === "failed" && (
                        <div className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {it.lastError ?? "Error desconocido"} · reintentos {it.retryCount}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={it.status === "failed" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {it.status}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(it.id)}
                      title="Eliminar de la cola"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <p className="text-[11px] text-gray-500 pt-2">
          💡 La cola se sincroniza automáticamente al recuperar internet. El backup .xlsx
          incluye pendientes + usos locales para reconciliación posterior.
        </p>
      </DialogContent>
    </Dialog>
  );
}
