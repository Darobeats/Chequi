/**
 * HMAC-SHA256 signature for offline scans.
 * Same scheme as src/hooks/useOfflineScans.ts so the edge function can verify
 * scans coming from either the QR queue or the new Cédula queue.
 */
export async function generateScanSignature(
  primaryKey: string, // ticketId or numeroCedula
  controlTypeId: string,
  timestamp: number,
  userId: string
): Promise<string> {
  const data = `${primaryKey}|${controlTypeId}|${timestamp}|${userId}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Key material rotates daily to limit replay window
  const keyMaterial = encoder.encode(
    `chequi_scan_${userId}_${Math.floor(timestamp / 86400000)}`
  );

  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, dataBuffer);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
