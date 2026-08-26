import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// GitHub Pages serves project sites from /<repo>/, so the workflow sets VITE_BASE.
// Defaults to "/" so `npm run build:pages` works locally and for custom domains.
const base = process.env.VITE_BASE || "/";

/**
 * Standalone client-only build used for GitHub Pages.
 *
 * Kept separate from vite.config.ts so the SSR/Nitro setup the main app deploys
 * with stays untouched. See pages/main.tsx for why Pages needs its own entry.
 */
export default defineConfig({
  root: resolve("./pages"),
  base,
  // static assets (favicon, robots.txt) live at the project root, not under pages/
  publicDir: resolve("./public"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": resolve("./src") },
  },
  build: {
    outDir: resolve("./dist-pages"),
    emptyOutDir: true,
  },
});
