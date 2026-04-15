import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createTanStackRouter({
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });

  return router;
};

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useNamingConvention: TanStack Router module augmentation requires this exact interface name
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
