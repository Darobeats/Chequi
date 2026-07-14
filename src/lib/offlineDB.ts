/**
 * Offline IndexedDB store powered by `idb`.
 *
 * Stores everything needed to operate Chequi without internet:
 *  - whitelist  : authorized cédulas per event (for offline auth checks)
 *  - attendees  : QR/ticket attendees per event
 *  - controlTypes / categoryControls / eventConfig: scanner config per event
 *  - localCedulaUsage / localAttendeeUsage: locally registered usages (offline duplicate detection)
 *  - pendingCedulaScans / pendingQRScans: queued scans waiting to sync
 *  - meta       : last sync timestamps and counters per event
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "chequi_offline";
const DB_VERSION = 1;

export interface PendingCedulaScan {
  id: string; // uuid
  eventId: string;
  numeroCedula: string;
  controlTypeId: string;
  scannedBy: string; // user id
  timestamp: number;
  signature: string; // HMAC integrity
  retryCount: number;
  status: "queued" | "syncing" | "failed";
  payload: {
    registro: any;
    controlUsage: any;
    accessLog?: any;
    isUnauthorized?: boolean;
  };
  lastError?: string;
}

export interface PendingQRScan {
  id: string;
  ticketId: string;
  controlTypeId: string;
  eventId: string;
  scannedBy: string;
  timestamp: number;
  signature: string;
  retryCount: number;
  device: string;
}

export interface CachedWhitelistEntry {
  id: string;
  event_id: string;
  numero_cedula: string;
  nombre_completo: string | null;
  categoria: string | null;
  empresa: string | null;
  notas: string | null;
}

export interface CachedAttendee {
  id: string;
  event_id: string;
  ticket_id: string;
  qr_code: string | null;
  name: string;
  category_id: string;
  status: string;
}

export interface CachedControlType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  requires_control_id: string | null;
}

export interface CachedCategoryControl {
  id: string;
  category_id: string;
  control_type_id: string;
  max_uses: number | null;
}

export interface CachedEventConfig {
  id: string;
  event_name: string;
  require_whitelist: boolean;
  [key: string]: any;
}

export interface LocalCedulaUsage {
  id: string; // `${eventId}|${numeroCedula}|${controlTypeId}|${timestamp}`
  eventId: string;
  numeroCedula: string;
  controlTypeId: string;
  timestamp: number;
}

export interface LocalAttendeeUsage {
  id: string;
  eventId: string;
  attendeeId: string;
  controlTypeId: string;
  timestamp: number;
}

export interface OfflineMeta {
  eventId: string;
  lastSyncAt: number;
  whitelistCount: number;
  attendeesCount: number;
  controlTypesCount: number;
}

interface ChequiOfflineDB extends DBSchema {
  whitelist: {
    key: string; // `${eventId}|${numeroCedula}`
    value: CachedWhitelistEntry;
    indexes: { byEvent: string; byCedula: [string, string] };
  };
  attendees: {
    key: string; // id
    value: CachedAttendee;
    indexes: { byEvent: string; byTicket: [string, string]; byQr: [string, string] };
  };
  controlTypes: {
    key: string;
    value: CachedControlType;
    indexes: { byEvent: string };
  };
  categoryControls: {
    key: string;
    value: CachedCategoryControl;
    indexes: { byCategory: string };
  };
  eventConfig: {
    key: string;
    value: CachedEventConfig;
  };
  localCedulaUsage: {
    key: string;
    value: LocalCedulaUsage;
    indexes: { byEventCedulaControl: [string, string, string]; byEvent: string };
  };
  localAttendeeUsage: {
    key: string;
    value: LocalAttendeeUsage;
    indexes: { byEventAttendeeControl: [string, string, string] };
  };
  pendingCedulaScans: {
    key: string;
    value: PendingCedulaScan;
    indexes: { byEvent: string; byStatus: string };
  };
  pendingQRScans: {
    key: string;
    value: PendingQRScan;
    indexes: { byEvent: string };
  };
  meta: {
    key: string; // eventId
    value: OfflineMeta;
  };
}

let dbPromise: Promise<IDBPDatabase<ChequiOfflineDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<ChequiOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ChequiOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("whitelist")) {
          const s = db.createObjectStore("whitelist", { keyPath: "__key" as any });
          s.createIndex("byEvent", "event_id");
          s.createIndex("byCedula", ["event_id", "numero_cedula"], { unique: true });
        }
        if (!db.objectStoreNames.contains("attendees")) {
          const s = db.createObjectStore("attendees", { keyPath: "id" });
          s.createIndex("byEvent", "event_id");
          s.createIndex("byTicket", ["event_id", "ticket_id"]);
          s.createIndex("byQr", ["event_id", "qr_code"]);
        }
        if (!db.objectStoreNames.contains("controlTypes")) {
          const s = db.createObjectStore("controlTypes", { keyPath: "id" });
          s.createIndex("byEvent", "event_id");
        }
        if (!db.objectStoreNames.contains("categoryControls")) {
          const s = db.createObjectStore("categoryControls", { keyPath: "id" });
          s.createIndex("byCategory", "category_id");
        }
        if (!db.objectStoreNames.contains("eventConfig")) {
          db.createObjectStore("eventConfig", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("localCedulaUsage")) {
          const s = db.createObjectStore("localCedulaUsage", { keyPath: "id" });
          s.createIndex("byEventCedulaControl", ["eventId", "numeroCedula", "controlTypeId"]);
          s.createIndex("byEvent", "eventId");
        }
        if (!db.objectStoreNames.contains("localAttendeeUsage")) {
          const s = db.createObjectStore("localAttendeeUsage", { keyPath: "id" });
          s.createIndex("byEventAttendeeControl", ["eventId", "attendeeId", "controlTypeId"]);
        }
        if (!db.objectStoreNames.contains("pendingCedulaScans")) {
          const s = db.createObjectStore("pendingCedulaScans", { keyPath: "id" });
          s.createIndex("byEvent", "eventId");
          s.createIndex("byStatus", "status");
        }
        if (!db.objectStoreNames.contains("pendingQRScans")) {
          const s = db.createObjectStore("pendingQRScans", { keyPath: "id" });
          s.createIndex("byEvent", "eventId");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "eventId" });
        }
      },
    });
  }
  return dbPromise;
}

// ---------------- whitelist helpers ----------------
const IDB_CHUNK = 2000;

async function yieldToUI() {
  await new Promise((r) => setTimeout(r, 0));
}

export async function putWhitelistEntries(
  eventId: string,
  rows: CachedWhitelistEntry[],
  onProgress?: (written: number, total: number) => void,
) {
  const db = await getOfflineDB();
  // Clear previous whitelist for this event in its own transaction so we
  // don't hold a long-running readwrite while iterating large arrays.
  {
    const tx = db.transaction("whitelist", "readwrite");
    const idx = tx.store.index("byEvent");
    let cursor = await idx.openCursor(IDBKeyRange.only(eventId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
  const total = rows.length;
  for (let i = 0; i < total; i += IDB_CHUNK) {
    const slice = rows.slice(i, i + IDB_CHUNK);
    const tx = db.transaction("whitelist", "readwrite");
    for (const row of slice) {
      tx.store.put({ ...row, __key: `${row.event_id}|${row.numero_cedula}` } as any);
    }
    await tx.done;
    onProgress?.(Math.min(i + slice.length, total), total);
    await yieldToUI();
  }
}

export async function findWhitelistEntry(
  eventId: string,
  numeroCedula: string
): Promise<CachedWhitelistEntry | null> {
  const db = await getOfflineDB();
  const row = await db.get("whitelist", `${eventId}|${numeroCedula}` as any);
  return (row as CachedWhitelistEntry) ?? null;
}

// ---------------- attendees helpers ----------------
export async function putAttendees(
  eventId: string,
  rows: CachedAttendee[],
  onProgress?: (written: number, total: number) => void,
) {
  const db = await getOfflineDB();
  {
    const tx = db.transaction("attendees", "readwrite");
    const idx = tx.store.index("byEvent");
    let cursor = await idx.openCursor(IDBKeyRange.only(eventId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
  const total = rows.length;
  for (let i = 0; i < total; i += IDB_CHUNK) {
    const slice = rows.slice(i, i + IDB_CHUNK);
    const tx = db.transaction("attendees", "readwrite");
    for (const row of slice) tx.store.put(row);
    await tx.done;
    onProgress?.(Math.min(i + slice.length, total), total);
    await yieldToUI();
  }
}

export async function findAttendeeByTicket(
  eventId: string,
  ticketOrQr: string
): Promise<CachedAttendee | null> {
  const db = await getOfflineDB();
  const byTicket = await db.getFromIndex("attendees", "byTicket", [eventId, ticketOrQr]);
  if (byTicket) return byTicket;
  const byQr = await db.getFromIndex("attendees", "byQr", [eventId, ticketOrQr]);
  return byQr ?? null;
}

// ---------------- control types & limits ----------------
export async function putControlTypes(eventId: string, rows: CachedControlType[]) {
  const db = await getOfflineDB();
  const tx = db.transaction("controlTypes", "readwrite");
  const idx = tx.store.index("byEvent");
  let cursor = await idx.openCursor(IDBKeyRange.only(eventId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  for (const row of rows) await tx.store.put(row);
  await tx.done;
}

export async function putCategoryControls(rows: CachedCategoryControl[]) {
  const db = await getOfflineDB();
  const tx = db.transaction("categoryControls", "readwrite");
  for (const row of rows) await tx.store.put(row);
  await tx.done;
}

export async function getMaxUsesForCategory(
  categoryId: string,
  controlTypeId: string
): Promise<number | null> {
  const db = await getOfflineDB();
  const rows = await db.getAllFromIndex("categoryControls", "byCategory", categoryId);
  const match = rows.find((r) => r.control_type_id === controlTypeId);
  return match?.max_uses ?? null;
}

// ---------------- event config ----------------
export async function putEventConfig(cfg: CachedEventConfig) {
  const db = await getOfflineDB();
  await db.put("eventConfig", cfg);
}

export async function getEventConfig(eventId: string): Promise<CachedEventConfig | null> {
  const db = await getOfflineDB();
  return (await db.get("eventConfig", eventId)) ?? null;
}

// ---------------- local usage (offline duplicate detection) ----------------
export async function recordLocalCedulaUsage(usage: Omit<LocalCedulaUsage, "id">) {
  const db = await getOfflineDB();
  const id = `${usage.eventId}|${usage.numeroCedula}|${usage.controlTypeId}|${usage.timestamp}`;
  await db.put("localCedulaUsage", { ...usage, id });
}

export async function countLocalCedulaUsage(
  eventId: string,
  numeroCedula: string,
  controlTypeId: string
): Promise<number> {
  const db = await getOfflineDB();
  const rows = await db.getAllFromIndex(
    "localCedulaUsage",
    "byEventCedulaControl",
    [eventId, numeroCedula, controlTypeId]
  );
  return rows.length;
}

export async function clearLocalCedulaUsageForEvent(eventId: string) {
  const db = await getOfflineDB();
  const tx = db.transaction("localCedulaUsage", "readwrite");
  const idx = tx.store.index("byEvent");
  let cursor = await idx.openCursor(IDBKeyRange.only(eventId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ---------------- pending scans queue ----------------
export async function enqueuePendingCedulaScan(scan: PendingCedulaScan) {
  const db = await getOfflineDB();
  await db.put("pendingCedulaScans", scan);
}

export async function listPendingCedulaScans(eventId?: string): Promise<PendingCedulaScan[]> {
  const db = await getOfflineDB();
  if (eventId) {
    return db.getAllFromIndex("pendingCedulaScans", "byEvent", eventId);
  }
  return db.getAll("pendingCedulaScans");
}

export async function updatePendingCedulaScan(scan: PendingCedulaScan) {
  const db = await getOfflineDB();
  await db.put("pendingCedulaScans", scan);
}

export async function deletePendingCedulaScan(id: string) {
  const db = await getOfflineDB();
  await db.delete("pendingCedulaScans", id);
}

// ---------------- meta ----------------
export async function putMeta(meta: OfflineMeta) {
  const db = await getOfflineDB();
  await db.put("meta", meta);
}

export async function getMeta(eventId: string): Promise<OfflineMeta | null> {
  const db = await getOfflineDB();
  return (await db.get("meta", eventId)) ?? null;
}
