// Client-only entry for the GitHub Pages build.
//
// The main app ships as a TanStack Start SSR bundle via Nitro. GitHub Pages only
// serves static files, and Nitro's static presets currently fail to prerender the
// Start route on this beta, so Pages gets its own plain SPA entry instead. The game
// is already client-only (`ClientOnly` + `lazy` in src/routes/index.tsx), so nothing
// is lost by skipping the router here.
import { createRoot } from "react-dom/client";

import DeadlandsGame from "@/components/game/DeadlandsGame";
import "@/styles.css";

const host = document.getElementById("root");
if (!host) throw new Error("missing #root mount point");

createRoot(host).render(<DeadlandsGame />);
