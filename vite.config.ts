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
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // "prompt": a new version waits until the user taps Reload, so nobody is reloaded mid-game or mid-chat,
      // and the old version's files stay cached (and loadable) until then.
      registerType: "prompt",
      injectRegister: null,
      filename: "sw.js",
      devOptions: { enabled: false },
      manifest: {
        name: "eYe Pod System",
        short_name: "eYe",
        description: "Jackie · 24-pod compression intelligence system",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/placeholder.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        // Precache the whole app, every page and game chunk, so it all works offline after one online visit.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2,webmanifest}"],
        // The main bundle is about 4 MB. The ceiling stays well below the size of the AI engine, so a
        // runaway chunk still fails the build loudly instead of silently missing from the offline cache.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        // Sign-in callbacks and server endpoints always go to the network and are never cached.
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /^\/functions/],
        runtimeCaching: [
          {
            // The on-device AI engine (about 9 MB of WebAssembly) is cached the first time the AI page uses it,
            // instead of being downloaded by every visitor.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith(".wasm"),
            handler: "CacheFirst",
            options: {
              cacheName: "eye-wasm",
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Anything same-origin that isn't precached (files added to public/ later, for example).
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|gif|ico|json)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "eye-assets",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
