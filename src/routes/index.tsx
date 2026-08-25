import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const DeadlandsGame = lazy(() => import("@/components/game/DeadlandsGame"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Deadlands — Volcanic Horde Survival Shooter" },
      {
        name: "description",
        content:
          "Survive endless waves in a lava-split crater: ammo-limited rifle, infinite machete, stamina tackles and hazard kills. Play free in your browser.",
      },
      { property: "og:title", content: "The Deadlands — Volcanic Horde Survival Shooter" },
      {
        property: "og:description",
        content:
          "Endless waves, lava hazards, staggers and tackles. A browser-playable 3D horde survival prototype.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="h-screen w-screen bg-background">
      <h1 className="sr-only">The Deadlands — volcanic horde survival shooter</h1>
      <ClientOnly fallback={<div className="flex h-screen items-center justify-center text-display">Loading the crater…</div>}>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-display">Loading the crater…</div>}>
          <DeadlandsGame />
        </Suspense>
      </ClientOnly>
    </main>
  );
}
