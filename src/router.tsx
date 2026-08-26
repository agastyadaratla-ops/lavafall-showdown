import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Vite fills BASE_URL from `base`; strip the trailing slash for the router.
  // Empty at the root, and exactOptionalPropertyTypes forbids passing undefined,
  // so the key is only spread in when a real subpath is configured.
  const basepath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

  const router = createRouter({
    routeTree,
    context: { queryClient },
    ...(basepath ? { basepath } : {}),
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
