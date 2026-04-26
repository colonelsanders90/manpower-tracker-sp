import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DashboardPage } from "@/routes/dashboard";
import { OrgPage } from "@/routes/org";
import { IndividualsPage } from "@/routes/individuals";
import { IndividualDetailPage } from "@/routes/individualDetail";
import { RolesPage } from "@/routes/roles";
import { RoleDetailPage } from "@/routes/roleDetail";
import { ProvisionPage } from "@/routes/provision";
import { AdminPostingsPage } from "@/routes/adminPostings";
import { AdminPeoplePage } from "@/routes/adminPeople";

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const orgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/org",
  component: OrgPage,
});

const individualsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/individuals",
  component: IndividualsPage,
});

const individualDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/individuals/$id",
  component: IndividualDetailPage,
});

const rolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roles",
  component: RolesPage,
});

const roleDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roles/$id",
  component: RoleDetailPage,
});

const adminPostingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/postings",
  component: AdminPostingsPage,
});

const adminPeopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/people",
  component: AdminPeoplePage,
});

const provisionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/provision",
  component: ProvisionPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  orgRoute,
  individualsRoute,
  individualDetailRoute,
  rolesRoute,
  roleDetailRoute,
  adminPostingsRoute,
  adminPeopleRoute,
  provisionRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
