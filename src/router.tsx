import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { Box, Typography } from "@mui/material";

/**
 * Hash history is mandatory — see CLAUDE.md "TanStack Router must use hash
 * history" quirk. SP intercepts clean paths and 404s.
 */
const rootRoute = createRootRoute({
  component: () => (
    <Box sx={{ p: 3 }}>
      <Outlet />
    </Box>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <Box>
      <Typography variant="h4">RAiD Manpower Tracker</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        SP2013 port — scaffolding stage. Phase 1 (list provisioning) not yet
        wired. See workspace CLAUDE.md for the build plan.
      </Typography>
    </Box>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
