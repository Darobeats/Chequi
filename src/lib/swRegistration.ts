/**
 * Service Worker registration with safety guards.
 *
 * CRITICAL: Never register in Lovable preview iframe — SW breaks hot reload
 * and pollutes the cache across sessions.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.dev") ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isInIframe || isPreviewHost) {
    // Aggressively unregister any prior SW to avoid stale cache in preview
    navigator.serviceWorker?.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    console.log("[PWA] Service Worker disabled (preview/iframe)");
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  // Lazy import workbox-window only in production runtime
  import("workbox-window")
    .then(({ Workbox }) => {
      const wb = new Workbox("/sw.js");
      wb.addEventListener("waiting", () => {
        // New version ready — activate immediately on next load
        wb.messageSkipWaiting();
      });
      wb.addEventListener("controlling", () => {
        // Reload once new SW takes control to ensure fresh shell
        window.location.reload();
      });
      wb.register().catch((err) =>
        console.warn("[PWA] SW registration failed:", err)
      );
    })
    .catch(() => {});
}
