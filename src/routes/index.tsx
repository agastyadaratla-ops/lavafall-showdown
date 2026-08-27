import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const DeadlandsGame = lazy(() => import("@/components/game/DeadlandsGame"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Neo Kestrel - Co-op Capture the Core" },
      {
        name: "description",
        content:
          "Team up against the alien machines occupying Neo Kestrel. Take back the core, run it home, and hold the line downtown. Free peer-to-peer co-op in your browser.",
      },
      { property: "og:title", content: "Neo Kestrel - Co-op Capture the Core" },
      {
        property: "og:description",
        content:
          "Team up against the alien machines occupying Neo Kestrel. Take back the core, run it home, and hold the line downtown. Free peer-to-peer co-op in your browser.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="h-screen w-screen bg-background">
      <h1 className="sr-only">Neo Kestrel - co-op capture the core</h1>
      <ClientOnly fallback={<div className="flex h-screen items-center justify-center text-display">Loading Neo Kestrel…</div>}>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-display">Loading Neo Kestrel…</div>}>
          <DeadlandsGame />
        </Suspense>
      </ClientOnly>
    </main>
  );
}
