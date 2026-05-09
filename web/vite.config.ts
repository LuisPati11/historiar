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
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // mind-ar + three.js producen un chunk grande (~3 MB). Es contenido estático
        // que rara vez cambia y queremos que se precachee para uso offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\.(mp4|m4a|mp3|webm)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "media-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
