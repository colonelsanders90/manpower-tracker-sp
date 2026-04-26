# Manpower Tracker — SP2013 port

App-specific context. Inherits from the workspace [`../CLAUDE.md`](../CLAUDE.md).

## Source of truth

The data model, hierarchy rules, and movement-tracking semantics are shared with
the Next.js prototype. Do not duplicate them here.

- **Design docs:** `~/Desktop/coding/manpower-tracker/docs/` — read
  `data-model.md`, `hierarchy-rules.md`, `movement-tracking.md`.
- **Live prototype:** Railway deployment of the Next.js version. Use it as the
  reference implementation when the spec is ambiguous.
- **Visual spec:** the Next.js project's RAiD theme — the colour and type
  tokens are mirrored verbatim into `src/theme.ts`.

When the prototype's `docs/` and this repo disagree, `docs/` wins.

## Data model — 4 SP Lists

| List | Maps from | Notes |
|---|---|---|
| `UNITS` | postgres `units` | self-referential lookup `ParentUnit` for the L1 → L2 tree |
| `ROLES` | postgres `roles` | lookup `Unit` → UNITS; `Level` is a Choice (L1/L2/L3); `Status` flags as Yes/No |
| `INDIVIDUALS` | postgres `individuals` | `IsExternal` Yes/No flag for outside-RAiD names |
| `POSTINGS` | postgres `postings` | lookup `Individual` + lookup `Role`; `Status` is Choice (Past/Current/Planned/Candidate) |

Field detail lives in `src/types/{units,roles,individuals,postings}.ts` and is
the source of truth for column shape. Schema changes go in the `## Schema
Changelog` at the bottom of this file with a `SCHEMA_VERSION` bump.

## Site collection

```
SITE_URL: <unknown — fill in when the SP site is provisioned>
SP_API_BASE: <subsite-relative, e.g. /sites/raid/manpower-tracker/_api>
```

Populate `VITE_SP_API_BASE` in `.env.development` and at build time, then update
this section.

## Auth

Windows Auth automatic via the browser. There is no login page.

Admin detection uses `IsSiteAdmin` from `/web/currentuser` (per the user's
decision — simpler than a dedicated `HR Officers` SP group). When that becomes
too coarse, add the group lookup later.

```ts
const user = await spGet<CurrentUser>('/web/currentuser')
const isAdmin = user.IsSiteAdmin === true
```

Non-admins see the same routes as admins minus the create/edit/delete buttons.

## Provisioning

Runs once on first load by an admin. Triggered manually via a `/provision`
route (gated by `IsSiteAdmin`), not auto-run on every cold start. The route:

1. Calls each list's provisioner (sequenced in `provisioning/provisioningSequence.ts`).
2. Each provisioner creates the list, adds columns, calls `applyPermissions`.
3. Writes a `SP_PROVISIONED=true` web property (or a flag in a config list) so
   subsequent loads skip.

No data is seeded. HR enters branches and individuals through the UI.

## Routes

| Path (hash) | Page | Notes |
|---|---|---|
| `/` | Dashboard | Stats + lens cards |
| `/org` | Org structure | Editable inline for admins |
| `/individuals` | List, sortable | Default sort: name A→Z |
| `/individuals/$id` | Detail | Movement timeline, where-next, past |
| `/roles` | Movement watchlist | Default filter: All movement |
| `/roles/$id` | Detail | Incumbent timeline, who-comes-in-next |
| `/admin/postings` | Admin tab | Add / edit / delete postings |
| `/admin/people` | Admin tab | Add / edit / delete individuals |
| `/admin/provision` | Admin only | One-time list provisioning |
| `/login` | — | Not used (Windows Auth) |

## Schema Changelog

| Version | Date | Change |
|---|---|---|
| 1 | 2026-04-26 | Initial provisioning — UNITS, ROLES, INDIVIDUALS, POSTINGS. See per-list type files in `src/types/` for the v1 column shape. Lookups use `RelationshipDeleteBehavior="Restrict"` to mirror the Postgres FK guards. |

`SCHEMA_VERSION = 1` in `src/provisioning/provisioningSequence.ts`. Bump on
any add/remove/rename of a list column.

## Reusable from the Next.js prototype

These ports are pure-logic and copy across with minimal change:

| File | Role |
|---|---|
| `lib/hierarchy.ts` | unit tree builder — pure, no deps |
| Movement signal logic from `app/(authed)/roles/page.tsx` | per-role classification (vacant / ending-soon / incoming / stable) |
| Posting timeline geometry from `components/posting-timeline.tsx` | window math, quarter ticks, bar clipping with chevrons |
| The 4 data-integrity invariants in `app/actions.ts` | single-Current per role, single-head per unit, head-level snap, isVacant sync |

UI-layer code (Tailwind/shadcn) is rewritten in MUI but the structure is one-to-one.

## Status

- [x] Phase 0 — workspace setup, scaffold, dependencies, theme, router stub
- [x] Phase 1 — list types + provisioning sequence + `/admin/provision` route
- [x] Phase 2 — read-only views: dashboard, /org, /individuals (+ detail),
      /roles movement watchlist (+ detail). Mock data layer for dev mode
      (mirrors the Next.js seed; tree-shaken in prod). MUI port of the
      AppShell, OrgChart, PostingTimeline, StatusBadge.
- [ ] Phase 3 — admin auth gating (`useCurrentUser` already exposes
      `IsSiteAdmin`, AppShell already hides Admin · Provision link from
      viewers; remaining work is gating CRUD affordances in Phase 4)
- [ ] Phase 4 — CRUD mutations + 4 invariants
- [ ] Phase 5 — people picker (Autocomplete + getSiteUsers)
- [ ] Phase 6 — diagnostics wiring (already templated)
- [ ] Phase 7 — single-file build + first deploy
