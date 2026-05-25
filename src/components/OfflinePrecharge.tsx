import { useEffect, useState } from "react";
import { useEventContext } from "@/context/EventContext";
import { useOfflinePrecharge } from "@/hooks/useOfflinePrecharge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CloudDownload, CheckCircle2, AlertCircle, WifiOff, RefreshCw, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hace segundos";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export const OfflinePrecharge = () => {
  const { selectedEvent } = useEventContext();
  const eventId = selectedEvent?.id ?? null;
  const { run, isRunning, progress, lastMeta, refreshMeta, error } = useOfflinePrecharge(eventId);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const ready = !!lastMeta;
  const sameEvent = lastMeta?.eventId === eventId;

  return (
    <Card className="bg-gray-900/40 border-gray-700 mb-3">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <CloudDownload className="h-4 w-4 text-dorado flex-shrink-0" />
            <span className="text-sm font-medium text-hueso truncate">Modo offline</span>
            {ready && sameEvent ? (
              <Badge className="bg-green-700/40 text-green-300 border-green-500/40 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Listo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/40">
                <AlertCircle className="h-3 w-3 mr-1" /> No preparado
              </Badge>
            )}
            {!isOnline && (
              <Badge variant="outline" className="text-[10px] text-red-300 border-red-500/40">
                <WifiOff className="h-3 w-3 mr-1" /> Sin internet
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
              <Link to="/install">
                <Smartphone className="h-3.5 w-3.5 mr-1" /> Instalar
              </Link>
            </Button>
            <Button
              size="sm"
              variant={ready && sameEvent ? "outline" : "default"}
              onClick={() => void run()}
              disabled={isRunning || !eventId || !isOnline}
              className="h-8 text-xs"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> Descargando...
                </>
              ) : ready && sameEvent ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refrescar
                </>
              ) : (
                <>
                  <CloudDownload className="h-3.5 w-3.5 mr-1" /> Preparar evento offline
                </>
              )}
            </Button>
          </div>
        </div>

        {isRunning && progress && (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">{progress.step}…</div>
            <Progress value={progress.total > 0 ? (progress.current / progress.total) * 100 : 5} />
          </div>
        )}

        {ready && sameEvent && !isRunning && (
          <div className="text-[11px] text-gray-400">
            ✅ {lastMeta!.whitelistCount.toLocaleString()} cédulas · {lastMeta!.attendeesCount.toLocaleString()} tickets ·{" "}
            {lastMeta!.controlTypesCount} controles · actualizado {formatRelative(lastMeta!.lastSyncAt)}
          </div>
        )}

        {!isOnline && !(ready && sameEvent) && (
          <div className="text-[11px] text-amber-300">
            ⚠️ Estás sin internet y no hay cache para este evento. Conéctate para preparar el modo offline.
          </div>
        )}

        {error && <div className="text-[11px] text-red-400">{error}</div>}
      </CardContent>
    </Card>
  );
};

export default OfflinePrecharge;
