import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// HTTPS local es OBLIGATORIO para getUserMedia (cámara) y geolocation en iOS Safari.
// Usa `vite --host` para probar en el móvil del mismo wifi vía https/ngrok o un túnel.

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "HistoriAR",
        short_name: "HistoriAR",
        description: "Guía turística AR con gamificación",
        theme_color: "#1a1a1a",
        background_color: "#1a1a1a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Solo precachear el shell mínimo. Chunks lazy → NetworkFirst en runtime.
        globPatterns: [
          "index.html",
          "manifest.webmanifest",
          "registerSW.js",
          "assets/index-*.js",
          "assets/index-*.css",
          "icon-*.png",
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Chunks lazy de la app: red primero, caché como fallback
            urlPattern: /\/assets\/.+\.js$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "js-chunks",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "maptiler-cache",
              expiration: { maxEntries: 220, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.mind$/,
            handler: "CacheFirst",
            options: {
              cacheName: "mindar-targets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("i18next")) return "vendor-i18n";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("react-dom") || id.includes("react-router") || /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?react\//.test(id)) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
