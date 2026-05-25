import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        // Do NOT enable SW in dev/Lovable preview (iframes break it)
        enabled: false,
      },
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: false, // We ship our own manifest.webmanifest in /public
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // Never intercept auth/oauth/supabase requests
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/auth/,
          /supabase\.co/,
          /\/functions\/v1\//,
        ],
        // App shell: NetworkFirst so updates roll out, fallback to cache offline
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-shell",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ request }) =>
              ["style", "script", "worker", "font"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "static-assets" },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        // Never precache user-uploaded assets or auth responses
        globIgnores: ["**/sw.js", "**/workbox-*.js"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
