// MUI port of the Next.js posting timeline. Same geometry, same behaviours:
// fixed ±2y window, year + quarter ticks, NOW marker, clipped bars with
// chevrons for postings extending beyond the window, "Earlier / Later"
// strips for postings entirely outside the window, dateless Candidate strip.

import { Box, Stack, Typography, Tooltip } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "./StatusBadge";
import {
  computeWindow,
  pctBetween,
  categorisePostings,
  STATUS_BAR_COLOR,
  STATUS_BAR_TEXT,
} from "@/lib/timeline";
import type { PostingListItem } from "@/types/postings";
import type { RoleListItem } from "@/types/roles";

type Mode = "individual" | "role";

export function PostingTimeline({
  postings,
  mode,
  roles,
}: {
  postings: PostingListItem[];
  mode: Mode;
  roles: RoleListItem[];
}) {
  if (postings.length === 0) {
    return (
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          fontStyle: "italic",
          py: 4,
          textAlign: "center",
          fontFamily: '"Sometype Mono", monospace',
        }}
      >
        No postings recorded.
      </Typography>
    );
  }

  const today = new Date();
  const win = computeWindow(today);
  const tenureById = new Map(
    roles.map((r) => [r.Id, r.StandardTenureMonths]),
  );
  const items = categorisePostings(postings, win, today, tenureById);

  const earlier = items.filter((i) => i.kind === "earlier");
  const later = items.filter((i) => i.kind === "later");
  const visible = items.filter(
    (i) => i.kind === "in-window" || i.kind === "dateless",
  );

  return (
    <Stack spacing={1.5}>
      {earlier.length > 0 && (
        <OutOfWindowList
          label={`Earlier postings (${earlier.length})`}
          items={earlier.map((e) => e.posting)}
          mode={mode}
        />
      )}

      <Box sx={{ position: "relative", height: 20 }}>
        {win.yearTicks.map((t) => {
          const pct = pctBetween(t.date, win.start, win.end);
          return (
            <Box
              key={t.year}
              sx={{
                position: "absolute",
                top: 0,
                left: `${pct}%`,
                transform: "translateX(-50%)",
                fontFamily: '"Geist Mono", monospace',
                fontWeight: 500,
                fontSize: 11,
              }}
            >
              {t.year}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ position: "relative" }}>
        {win.quarterTicks.map((d, i) => {
          const pct = pctBetween(d, win.start, win.end);
          return (
            <Box
              key={i}
              aria-hidden
              sx={{
                position: "absolute",
                top: 0, bottom: 0,
                left: `${pct}%`,
                borderLeft: "1px dotted rgba(0,0,0,0.15)",
                pointerEvents: "none",
              }}
            />
          );
        })}
        {win.yearTicks.map((t) => {
          const pct = pctBetween(t.date, win.start, win.end);
          return (
            <Box
              key={`y-${t.year}`}
              aria-hidden
              sx={{
                position: "absolute",
                top: 0, bottom: 0,
                left: `${pct}%`,
                borderLeft: "1px solid rgba(0,0,0,0.15)",
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* NOW marker */}
        <Box
          aria-label="Today"
          sx={{
            position: "absolute",
            top: 0, bottom: 0,
            left: `${win.todayPct}%`,
            width: "1px",
            bgcolor: "#F9866B",
            zIndex: 10,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: `${win.todayPct}%`,
            transform: "translate(-50%, -100%)",
            pb: 0.5,
            fontFamily: '"Geist Mono", monospace',
            fontSize: 9,
            color: "#F9866B",
            zIndex: 10,
          }}
        >
          NOW
        </Box>

        <Stack spacing={1} sx={{ position: "relative", pt: 1 }}>
          {visible.map((item) => {
            const p = item.posting;

            const role = roles.find((r) => r.Id === p.RoleId);
            const unitName =
              role?.Unit?.Title ??
              role?.ExternalUnit ??
              "External";

            const label =
              mode === "individual"
                ? `${role?.Title ?? "Role"} · ${unitName}`
                : p.Individual.Title;
            const linkProps =
              mode === "individual"
                ? { to: "/roles/$id" as const, params: { id: String(p.RoleId) } }
                : {
                    to: "/individuals/$id" as const,
                    params: { id: String(p.IndividualId) },
                  };

            if (item.kind === "dateless") {
              return (
                <Box
                  key={p.Id}
                  sx={{
                    position: "relative",
                    height: 28,
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1,
                      borderRadius: 1,
                      bgcolor: "#FAEEDA",
                      border: "1px dashed #BA7517",
                      fontSize: 12,
                    }}
                  >
                    <StatusBadge status={p.Status} />
                    <Link
                      {...linkProps}
                      style={{
                        color: "#633806",
                        fontWeight: 500,
                        textDecoration: "none",
                      }}
                    >
                      {label}
                    </Link>
                    <Box
                      sx={{
                        fontFamily: '"Sometype Mono", monospace',
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        opacity: 0.7,
                      }}
                    >
                      Dates TBD
                    </Box>
                  </Box>
                </Box>
              );
            }

            const { start, end, startsBeforeWindow, endsAfterWindow } = item;
            const clippedStart = startsBeforeWindow ? win.start : start;
            const clippedEnd = endsAfterWindow ? win.end : end;
            const leftPct = pctBetween(clippedStart, win.start, win.end);
            const rightPct = pctBetween(clippedEnd, win.start, win.end);
            const widthPct = Math.max(rightPct - leftPct, 1.5);

            return (
              <Box
                key={p.Id}
                sx={{ position: "relative", height: 28 }}
              >
                <Tooltip
                  title={`${p.Status}: ${p.StartDate ?? "?"} → ${p.EndDate ?? "?"}`}
                  placement="top"
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      px: 1,
                      bgcolor: STATUS_BAR_COLOR[p.Status],
                      color: STATUS_BAR_TEXT[p.Status],
                      fontSize: 12,
                      overflow: "hidden",
                      borderTopLeftRadius: startsBeforeWindow ? 0 : 6,
                      borderBottomLeftRadius: startsBeforeWindow ? 0 : 6,
                      borderTopRightRadius: endsAfterWindow ? 0 : 6,
                      borderBottomRightRadius: endsAfterWindow ? 0 : 6,
                    }}
                  >
                    {startsBeforeWindow && (
                      <Box component="span" sx={{ fontWeight: 700, flexShrink: 0 }}>
                        «
                      </Box>
                    )}
                    <Link
                      {...linkProps}
                      style={{
                        color: "inherit",
                        fontWeight: 500,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {label}
                    </Link>
                    {endsAfterWindow && (
                      <Box
                        component="span"
                        sx={{ fontWeight: 700, flexShrink: 0, ml: "auto" }}
                      >
                        »
                      </Box>
                    )}
                  </Box>
                </Tooltip>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {later.length > 0 && (
        <OutOfWindowList
          label={`Later postings (${later.length})`}
          items={later.map((l) => l.posting)}
          mode={mode}
        />
      )}
    </Stack>
  );
}

function OutOfWindowList({
  label,
  items,
  mode,
}: {
  label: string;
  items: PostingListItem[];
  mode: Mode;
}) {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      alignItems="center"
      gap={1.5}
      sx={{
        bgcolor: "rgba(0,0,0,0.02)",
        px: 1, py: 0.75,
        borderRadius: 1,
        fontSize: 12,
      }}
    >
      <Typography variant="caption">{label}</Typography>
      {items.map((p) => {
        const linkProps =
          mode === "individual"
            ? { to: "/roles/$id" as const, params: { id: String(p.RoleId) } }
            : {
                to: "/individuals/$id" as const,
                params: { id: String(p.IndividualId) },
              };
        const text =
          mode === "individual" ? p.Role.Title : p.Individual.Title;
        return (
          <Stack
            key={p.Id}
            direction="row"
            alignItems="baseline"
            spacing={0.75}
          >
            <StatusBadge status={p.Status} />
            <Link {...linkProps} style={{ textDecoration: "none", color: "inherit" }}>
              {text}
            </Link>
            <Box
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10,
                color: "text.secondary",
              }}
            >
              {p.StartDate ?? "?"} → {p.EndDate ?? "?"}
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}
