# Manpower Tracker — SharePoint 2013 React app

The SP2013 port of the RAiD Manpower Tracker. Sibling to the Next.js
prototype at `~/Desktop/coding/manpower-tracker/web/`. Same data model,
same workflows, served as a single self-contained `index.html` from a
SharePoint document library on the air-gapped intranet.

## How it relates

| | Where | Purpose |
|---|---|---|
| Next.js prototype | `~/Desktop/coding/manpower-tracker/web/` | Lives on Railway. Used during the SP build for fast iteration; will be sunset once the SP version is live. |
| **SP2013 app (this)** | `~/Desktop/coding/sp-apps/manpower-tracker/` | The deployment target. Single-file React app served from a SharePoint doc library. |
| Shared docs | `~/Desktop/coding/manpower-tracker/docs/` | Source of truth for the data model and movement-tracking semantics. |
| Workspace skill | `~/Desktop/coding/sp-apps/CLAUDE.md` | SP2013 React conventions — REST, JSOM, MUI, list permissions, quirks. Loads automatically when Claude Code runs in this folder. |

---

## Run locally

```bash
cd ~/Desktop/coding/sp-apps/manpower-tracker
npm install
npm run dev
```

Open http://localhost:5173.

In dev mode the app uses an **in-memory mock store** seeded with 9
branches, 9 individuals, and a realistic spread of postings. The
mock-current-user is flagged as site admin, so every CRUD button is
visible. Mutations modify the mock store and trigger TanStack Query
refetches, so the UI updates immediately.

The sidebar has a **Reset mock data** button (visible only in dev) that
restores the seed without a page reload.

JSOM-dependent features (provisioning, the AD People Picker on
`+ Add individual`) are gracefully no-op'd in dev — they're only
exercisable on a real SharePoint server.

## Build a deployable artefact

```bash
npm run build
```

Produces `dist/index.html` (~1.4 MB; ~600 KB gzipped). All JS, CSS,
fonts, and SVG logos are inlined as data URIs so the file is fully
self-contained and works on the air-gapped intranet.

`dist/index.html` is the **only artefact you upload**.

## Deploy to SharePoint 2013

One-time setup per site (covered in detail by the workspace
[`../CLAUDE.md`](../CLAUDE.md)):

1. **Create the destination doc library.** Anywhere under your subsite,
   e.g. `Site Assets / manpower-tracker /`. Set `Read` permission for
   the AD group of authenticated users — they need at least read on
   the library to open the page.
2. **Upload `dist/index.html`** to that library.
3. **First admin visit** — open the file URL, e.g.
   `https://<tenant>/sites/raid/SiteAssets/manpower-tracker/index.html`,
   then go to `#/admin/provision`. Click **Run provisioning**. The four
   SP lists (UNITS, ROLES, INDIVIDUALS, POSTINGS) get created with
   columns and Contribute permissions.
4. **Configure list permissions** if you want fine-grained CRUD
   restrictions. Default after provisioning: any authenticated user
   has Contribute on every list. To restrict editing to HR officers,
   edit each list's permissions and remove Contribute from the
   authenticated-users group, then grant Contribute to an `HR Officers`
   SP group only. The app's UI already hides edit/delete buttons from
   non-`IsSiteAdmin` users; the SP list permission is the real
   security boundary.
5. **First user visit** — every authenticated user lands on the
   dashboard via Windows Auth + smart-card cert. Site admins see all
   admin links; viewers see only the read-only routes.

For redeploys: `npm run build` again, replace `index.html` in the
library. Schema changes need `SCHEMA_VERSION` bumped in
`provisioningSequence.ts` and either a re-run of provisioning or a
manual column add through SP admin.

## Project structure

```
src/
  lib/
    sharepoint.ts        SP REST helpers (verbatim from _templates/)
    jsom.ts              SP JSOM helpers (verbatim from _templates/)
    diagnosticLog.ts     Three-layer error capture; downloadLog()
    dataAccess.ts        Single seam: dev → mockStore, prod → SP REST
    mockStore.ts         In-memory mutable store for dev mode
    mockData.ts          Initial seed mirroring the Next.js prototype
    invariants.ts        The four data-integrity invariants (pure)
    hierarchy.ts         buildUnitTree (port from Next.js)
    movement.ts          Movement-signal classification (port)
    timeline.ts          Posting-timeline geometry (port)
  types/                 SP list-item shapes (read + write)
  hooks/
    useUnits / useRoles / useIndividuals / usePostings
    useCurrentUser
    useMutations         13 CRUD mutation hooks
    useListPolling       (templated; not yet wired)
  components/
    AppShell             Navy sidebar + topbar
    OrgChart             Read-only AND editable; mode picked per render
    PostingTimeline      ±2y window, year+quarter ticks, clipped bars
    StatusBadge
    AdPersonPicker       JSOM-gated AD search (no-op in dev)
    ConfirmDialog        useConfirm() hook
    dialogs/
      UnitFormDialog
      RoleFormDialog
      PostingFormDialog
      IndividualFormDialog
  routes/
    dashboard / org / individuals / individualDetail
    roles / roleDetail
    adminPostings / adminPeople / provision
  provisioning/
    applyPermissions     (verbatim from _templates/)
    provisioningSequence Four-list provisioner with SCHEMA_VERSION
  router.tsx             Hash-history TanStack Router
  theme.ts               MUI theme — RAiD palette + type
  main.tsx               Provider stack + font imports (verbatim)
  App.tsx                Init pattern (verbatim from _templates/)
index.html               JSOM script tags in dependency order
vite.config.ts           Vite + vite-plugin-singlefile
tsconfig.json            strict + path alias @/*
CLAUDE.md                App-specific spec; data model, schemas, status
```

## Status

Phases 0–4 + 5–7 complete. See [CLAUDE.md](./CLAUDE.md) for the per-
phase log.
