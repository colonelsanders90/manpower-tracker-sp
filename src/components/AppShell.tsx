// AppShell — the merged navy chrome (top bar + sidebar) per the RAiD design.
// MUI port of the Next.js Sidebar/Topbar pair.

import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import { downloadLog } from "@/lib/diagnosticLog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import logoOnNavy from "@/assets/raid/White_RAiD_onNavy.svg";
import { mockStore } from "@/lib/mockStore";
import { useQueryClient } from "@tanstack/react-query";
import { APP_VERSION } from "@/version";
import { NAVY, ACCENT, MONO } from "@/lib/tokens";

const SIDEBAR_WIDTH = 220;
const APPBAR_HEIGHT = 52;
// 25% ACCENT — used once for the active nav-link highlight.
const ACTIVE_BG = "rgba(0,142,208,0.25)";

const NAV_LINKS: { to: string; label: string; admin?: boolean }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/org", label: "Org Structure" },
  { to: "/individuals", label: "Individuals" },
  { to: "/roles", label: "Roles" },
  { to: "/development", label: "Development" },
  { to: "/admin/postings", label: "Admin · Postings", admin: true },
  { to: "/admin/people", label: "Admin · People", admin: true },
  { to: "/admin/roa-courses", label: "Admin · ROA Courses", admin: true },
  { to: "/admin/provision", label: "Admin · Provision", admin: true },
];

export function AppShell() {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.IsSiteAdmin === true;
  const visible = NAV_LINKS.filter((l) => !l.admin || isAdmin);

  const routerState = useRouterState();
  const path = routerState.location.pathname;

  const qc = useQueryClient();
  const isDev = (import.meta.env.MODE !== 'production');
  function resetMockData() {
    if (!isDev) return;
    if (!confirm("Reset the dev mock store back to the seed data?")) return;
    mockStore.reset();
    qc.invalidateQueries();
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            bgcolor: NAVY,
            color: "white",
            borderRight: "none",
          },
        }}
      >
        <Box
          sx={{
            px: 2.5, py: 2.5,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Box
            component="img"
            src={logoOnNavy}
            alt="RAiD"
            sx={{ height: 36, width: "auto", display: "block" }}
          />
          <Typography
            sx={{
              fontFamily: '"Sometype Mono", monospace',
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.65)",
              mt: 1.5,
            }}
          >
            Manpower Tracker
          </Typography>
        </Box>

        <List sx={{ flex: 1, p: 1.5 }}>
          {visible.map((l) => {
            const active = isActive(path, l.to);
            return (
              <ListItemButton
                key={l.to}
                component={Link}
                to={l.to}
                disableRipple
                sx={{
                  position: "relative",
                  px: 2, py: 1,
                  borderRadius: 0,
                  color: active ? "white" : "rgba(255,255,255,0.7)",
                  bgcolor: active ? ACTIVE_BG : "transparent",
                  "&:hover": {
                    bgcolor: active ? ACTIVE_BG : "rgba(255,255,255,0.07)",
                    color: "white",
                  },
                  "&::before": active
                    ? {
                        content: '""',
                        position: "absolute",
                        left: 0, top: 0, bottom: 0,
                        width: 2,
                        bgcolor: ACCENT,
                      }
                    : undefined,
                }}
              >
                <ListItemText
                  primary={l.label}
                  primaryTypographyProps={{
                    sx: {
                      fontFamily: MONO,
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Box
          sx={{
            px: 2.5, py: 2,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
            fontFamily: MONO,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          {isAdmin ? "● HR Officer" : "Viewer"}
          {isDev && (
            <Box
              component="button"
              type="button"
              onClick={resetMockData}
              sx={{
                display: "block",
                mt: 1,
                bgcolor: "transparent",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "inherit",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                px: 1.25, py: 0.5,
                borderRadius: 0.5,
                cursor: "pointer",
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.6)",
                  color: "white",
                },
              }}
              title="Resets the dev-only mock data store"
            >
              Reset mock data
            </Box>
          )}
        </Box>
      </Drawer>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: NAVY,
            color: "white",
            height: APPBAR_HEIGHT,
            justifyContent: "center",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Toolbar sx={{ minHeight: APPBAR_HEIGHT, px: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                fontFamily: '"Sometype Mono", monospace',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              <span>RA<span style={{ textTransform: "lowercase" }}>i</span>D</span>
              <span>·</span>
              <span>Intranet</span>
              <span>·</span>
              <span style={{ color: "rgba(255,255,255,0.85)" }}>Manpower</span>
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Download diagnostic log">
              <IconButton color="inherit" onClick={downloadLog} size="small">
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Box
              sx={{
                ml: 2,
                color: "rgba(255,255,255,0.6)",
                fontFamily: MONO,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {isAdmin ? "HR Officer · Admin" : "Viewer"}
            </Box>
            <Box
              sx={{
                ml: 2,
                px: 1,
                py: 0.25,
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 0.5,
                color: "rgba(255,255,255,0.4)",
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: "0.08em",
              }}
            >
              {APP_VERSION}
            </Box>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            px: { xs: 2, md: 4 },
            py: { xs: 3, md: 4 },
            // No maxWidth cap — pages grow with the window. Pages that prefer
            // a bounded reading width can wrap their own content in a Box
            // with maxWidth set per-route.
            width: "100%",
            minWidth: 0, // let flex children shrink correctly
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

function isActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}
