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
import { DevelopmentPage } from "@/routes/development";
import { AdminRoaCoursesPage } from "@/routes/adminRoaCourses";
import { DTCOPage } from "@/routes/dtco";
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

// Filter param lets dashboard stat cards deep-link to a pre-selected filter.
// "planned" | "candidate" | "all" — anything else is silently dropped.
const individualsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/individuals",
  validateSearch: (search: Record<string, unknown>): { filter?: "planned" | "candidate" | "all" } => {
    const f = search.filter;
    if (f === "planned" || f === "candidate" || f === "all") return { filter: f };
    return {};
  },
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

// Development tab — profile filter via search param ("MDES" | "EOS" | "DXO")
const developmentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/development",
  validateSearch: (search: Record<string, unknown>): { profile?: "MDES" | "EOS" | "DXO" } => {
    const p = search.profile;
    if (p === "MDES" || p === "EOS" || p === "DXO") return { profile: p };
    return {};
  },
  component: DevelopmentPage,
});

const adminRoaCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/roa-courses",
  component: AdminRoaCoursesPage,
});

const dtcoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dtco",
  component: DTCOPage,
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
  developmentRoute,
  dtcoRoute,
  adminRoaCoursesRoute,
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
