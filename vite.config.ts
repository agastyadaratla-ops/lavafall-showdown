import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// GitHub Pages serves project sites from /<repo>/, so the Pages workflow sets
// VITE_BASE. Left unset the app stays rooted at "/".
const base = process.env.VITE_BASE || "/";

// Note: the browser build that actually ships to GitHub Pages is
// vite.pages.config.ts. This config covers local dev and the SSR/Nitro build.
export default defineConfig({
  base,
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    // server entry points at src/server.ts, our SSR error wrapper
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    nitro(),
  ],
});
