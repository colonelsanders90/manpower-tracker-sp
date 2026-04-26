import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Link,
} from "@tanstack/react-router";
import { Box, Stack, Typography } from "@mui/material";
import { ProvisionPage } from "@/routes/provision";

/**
 * Hash history is mandatory — see workspace CLAUDE.md "TanStack Router must
 * use hash history" quirk. SP intercepts clean paths and 404s otherwise.
 *
 * Routes added so far:
 *   /                  Placeholder dashboard (Phase 2 will fill in)
 *   /admin/provision   Phase 1 — one-time list provisioning, IsSiteAdmin only
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
    <Stack spacing={2}>
      <Typography variant="h4">RAiD Manpower Tracker</Typography>
      <Typography variant="body2" color="text.secondary">
        SP2013 port — scaffolding stage. Phase 1 (list provisioning) wired.
      </Typography>
      <Typography variant="body2">
        First-run admin task:{" "}
        <Link to="/admin/provision">create the SharePoint lists</Link>.
      </Typography>
    </Stack>
  ),
});

const provisionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/provision",
  component: ProvisionPage,
});

const routeTree = rootRoute.addChildren([indexRoute, provisionRoute]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
