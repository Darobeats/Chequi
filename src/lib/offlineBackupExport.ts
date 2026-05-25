/**
 * Generate an Excel backup of ALL local offline data for the current event.
 * Useful when an event ends in a zone with no connectivity and you need a
 * physical record before sync completes (for billing / reconciliation).
 *
 * Uses ExcelJS (project standard — never use `xlsx`).
 */
import ExcelJS from "exceljs";
import {
  getOfflineDB,
  listPendingCedulaScans,
} from "./offlineDB";

export interface OfflineBackupOptions {
  eventId: string;
  eventName?: string;
}

export async function exportOfflineBackup({ eventId, eventName }: OfflineBackupOptions): Promise<Blob> {
  const db = await getOfflineDB();

  const [pending, localUsage, whitelist, attendees, controlTypes] = await Promise.all([
    listPendingCedulaScans(eventId),
    db.getAllFromIndex("localCedulaUsage", "byEvent", eventId),
    db.getAllFromIndex("whitelist", "byEvent", eventId),
    db.getAllFromIndex("attendees", "byEvent", eventId),
    db.getAllFromIndex("controlTypes", "byEvent", eventId),
  ]);

  const controlTypeMap = new Map(controlTypes.map((c) => [c.id, c.name]));
  const whitelistMap = new Map(whitelist.map((w) => [w.numero_cedula, w]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Chequi";
  wb.created = new Date();

  // ---------- Sheet 1: Resumen ----------
  const summary = wb.addWorksheet("Resumen");
  summary.columns = [
    { header: "Métrica", key: "k", width: 40 },
    { header: "Valor", key: "v", width: 25 },
  ];
  summary.getRow(1).font = { bold: true };
  summary.addRows([
    { k: "Evento", v: eventName ?? eventId },
    { k: "Event ID", v: eventId },
    { k: "Generado", v: new Date().toLocaleString() },
    { k: "Escaneos pendientes de sincronizar", v: pending.length },
    { k: "Usos registrados localmente (totales)", v: localUsage.length },
    { k: "Cédulas autorizadas en cache", v: whitelist.length },
    { k: "Tickets/QR en cache", v: attendees.length },
    { k: "Tipos de control configurados", v: controlTypes.length },
  ]);

  // ---------- Sheet 2: Escaneos pendientes ----------
  const pendingSheet = wb.addWorksheet("Pendientes_sync");
  pendingSheet.columns = [
    { header: "ID local", key: "id", width: 38 },
    { header: "Cédula", key: "ced", width: 16 },
    { header: "Nombre detectado", key: "nom", width: 35 },
    { header: "Tipo de control", key: "ctrl", width: 22 },
    { header: "Autorizado", key: "auth", width: 12 },
    { header: "Fecha/Hora", key: "ts", width: 22 },
    { header: "Estado", key: "st", width: 14 },
    { header: "Reintentos", key: "rt", width: 11 },
    { header: "Último error", key: "err", width: 40 },
  ];
  pendingSheet.getRow(1).font = { bold: true };
  for (const p of pending) {
    const reg = p.payload?.registro ?? {};
    const nombre = [reg.nombres, reg.primer_apellido, reg.segundo_apellido]
      .filter(Boolean)
      .join(" ")
      .trim() || "—";
    pendingSheet.addRow({
      id: p.id,
      ced: p.numeroCedula,
      nom: nombre,
      ctrl: controlTypeMap.get(p.controlTypeId) ?? p.controlTypeId,
      auth: p.payload?.isUnauthorized ? "NO" : "SÍ",
      ts: new Date(p.timestamp).toLocaleString(),
      st: p.status,
      rt: p.retryCount,
      err: p.lastError ?? "",
    });
  }

  // ---------- Sheet 3: Usos locales ----------
  const usageSheet = wb.addWorksheet("Usos_locales");
  usageSheet.columns = [
    { header: "Cédula", key: "ced", width: 16 },
    { header: "Tipo de control", key: "ctrl", width: 22 },
    { header: "Fecha/Hora", key: "ts", width: 22 },
    { header: "Nombre (whitelist)", key: "nom", width: 35 },
    { header: "Categoría", key: "cat", width: 18 },
  ];
  usageSheet.getRow(1).font = { bold: true };
  for (const u of localUsage) {
    const wl = whitelistMap.get(u.numeroCedula);
    usageSheet.addRow({
      ced: u.numeroCedula,
      ctrl: controlTypeMap.get(u.controlTypeId) ?? u.controlTypeId,
      ts: new Date(u.timestamp).toLocaleString(),
      nom: wl?.nombre_completo ?? "—",
      cat: wl?.categoria ?? "—",
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
