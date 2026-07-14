import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      devOptions: { enabled: false },
      includeAssets: ["favicon.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: false,
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,png,svg,ico,json,webmanifest,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.mode === "navigate" && url.pathname !== "/~oauth",
            handler: "NetworkFirst",
            options: { cacheName: "aschrisk-pages", networkTimeoutSeconds: 3 },
          },
          {
            urlPattern: ({ sameOrigin, url }) => sameOrigin && /\/assets\/.+\.(js|css|png|svg|woff2?)$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "aschrisk-assets" },
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
