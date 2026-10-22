// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import { fileURLToPath, URL } from "node:url";
import inject from "@rollup/plugin-inject";
import pkg from "./package.json";

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    inject({
      $: "jquery",
      jQuery: "jquery",
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 8020,
    proxy: {
      "/api": {
        // ⚠️ ENV PEMBAHASAN LOKAL: request /api dari FE dev diarahkan ke
        // backend lokal yang jalan di port 3199 komputer ini (kode baru
        // dengan jurnal otomatis). Sesudah deploy kesini ke VPS, balikkan
        // ke http://103.175.221.20:3199.
        target: "http://localhost:3199",
        changeOrigin: true,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  optimizeDeps: {
    include: ["jquery", "pivottable"],
  },
});
