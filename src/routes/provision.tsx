// /admin/provision — one-time list-creation route.
//
// Auth: IsSiteAdmin only. Non-admins get a clear message.
// Visibility: link this from the AppBar or admin sidebar after Phase 3,
// hidden from viewers entirely.
//
// Behaviour: runs the sequence on click, streams per-list status into a list,
// and finishes with a green "Provisioning complete (SCHEMA_VERSION=N)" or a
// red panel with the failed list and error message.

import { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorIcon from "@mui/icons-material/ErrorOutline";
import HourglassIcon from "@mui/icons-material/HourglassEmpty";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { loadJsom } from "@/lib/jsom";
import {
  PROVISIONERS,
  SCHEMA_VERSION,
  runProvisioning,
  type ProvisioningStepResult,
} from "@/provisioning/provisioningSequence";
import {
  SEED_STEP_NAMES,
  runSeed,
  type SeedStepResult,
} from "@/provisioning/seedSequence";

type StepState = "pending" | "running" | "ok" | "skip" | "error";
type StepUi = { name: string; state: StepState; detail?: string };

export function ProvisionPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const [jsomReady, setJsomReady] = useState(false);
  const [jsomError, setJsomError] = useState<string | null>(null);

  const [steps, setSteps] = useState<StepUi[]>(() =>
    PROVISIONERS.map((p) => ({ name: p.name, state: "pending" as StepState })),
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const [seedSteps, setSeedSteps] = useState<StepUi[]>(() =>
    SEED_STEP_NAMES.map((name) => ({ name, state: "pending" as StepState })),
  );
  const [seedRunning, setSeedRunning] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  // Load JSOM scripts lazily — they must NOT be in index.html because
  // MicrosoftAjax.js patches prototypes before React boots. Loading here
  // (after React is already running) is safe.
  useEffect(() => {
    if ((import.meta.env.MODE !== 'production')) {
      // Dev / demo mode — JSOM not available, show a friendly message.
      return;
    }
    loadJsom()
      .then(() => setJsomReady(true))
      .catch((err) => setJsomError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (userLoading) {
    return <Centered><CircularProgress /></Centered>;
  }

  if (!currentUser?.IsSiteAdmin) {
    return (
      <Centered>
        <Alert severity="warning">
          You need Full Control or Design permission on this site to run provisioning.
        </Alert>
      </Centered>
    );
  }

  if ((import.meta.env.MODE !== 'production')) {
    return (
      <Centered>
        <Alert severity="info">
          Provisioning is not available in demo mode — it requires a live SharePoint server.
        </Alert>
      </Centered>
    );
  }

  if (jsomError) {
    return (
      <Centered>
        <Alert severity="error">
          Failed to load SharePoint JSOM scripts: {jsomError}
        </Alert>
      </Centered>
    );
  }

  if (!jsomReady) {
    return <Centered><CircularProgress /><Typography sx={{ ml: 2 }}>Loading SharePoint scripts…</Typography></Centered>;
  }

  async function start() {
    setRunning(true);
    setDone(false);
    setSteps((prev) => prev.map((s) => ({ ...s, state: "pending" })));

    // Mark each as running just before its provisioner fires.
    let i = 0;
    const handleProgress = (r: ProvisioningStepResult) => {
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? r.status === "ok"
              ? { ...s, state: "ok" }
              : { ...s, state: "error", detail: r.error }
            : s,
        ),
      );
      i++;
      // Mark next as running, if any
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i && s.state === "pending"
            ? { ...s, state: "running" }
            : s,
        ),
      );
    };

    // Mark first as running
    setSteps((prev) =>
      prev.map((s, idx) => (idx === 0 ? { ...s, state: "running" } : s)),
    );

    await runProvisioning(handleProgress);
    setRunning(false);
    setDone(true);
  }

  async function startSeed() {
    setSeedRunning(true);
    setSeedDone(false);
    setSeedSteps((prev) => prev.map((s) => ({ ...s, state: "pending" as StepState })));

    let i = 0;
    const handleSeedProgress = (r: SeedStepResult) => {
      setSeedSteps((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? r.status === "ok"
              ? { ...s, state: "ok" }
              : r.status === "skip"
                ? { ...s, state: "skip", detail: r.reason }
                : { ...s, state: "error", detail: r.error }
            : s,
        ),
      );
      i++;
      setSeedSteps((prev) =>
        prev.map((s, idx) =>
          idx === i && s.state === "pending" ? { ...s, state: "running" } : s,
        ),
      );
    };

    setSeedSteps((prev) =>
      prev.map((s, idx) => (idx === 0 ? { ...s, state: "running" } : s)),
    );

    await runSeed(handleSeedProgress);
    setSeedRunning(false);
    setSeedDone(true);
  }

  const allOk = done && steps.every((s) => s.state === "ok");
  const failedAt = steps.find((s) => s.state === "error");

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Manpower · Admin
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.5 }}>
            Provision SharePoint lists
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Creates the four lists (UNITS, ROLES, INDIVIDUALS, POSTINGS) with
            their columns and baseline Contribute permissions for authenticated
            users. Run this once on a fresh SharePoint site.
            <br />
            <strong>Schema version: {SCHEMA_VERSION}</strong>
          </Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <List dense>
            {steps.map((s) => (
              <ListItem key={s.name} sx={{ alignItems: "flex-start" }}>
                <ListItemIcon sx={{ minWidth: 36, pt: 0.5 }}>
                  <StepIcon state={s.state} />
                </ListItemIcon>
                <ListItemText
                  primary={s.name}
                  secondary={s.state === "error" ? s.detail : null}
                  primaryTypographyProps={{
                    sx: { fontFamily: "Sometype Mono, monospace" },
                  }}
                  secondaryTypographyProps={{ color: "error" }}
                />
              </ListItem>
            ))}
          </List>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              disabled={running}
              onClick={start}
            >
              {running
                ? "Provisioning…"
                : done
                  ? "Re-run"
                  : "Run provisioning"}
            </Button>
            {running && <CircularProgress size={28} />}
          </Stack>

          {allOk && (
            <Alert severity="success" sx={{ mt: 3 }}>
              All four lists provisioned. Scroll down to seed the RAiD org structure.
            </Alert>
          )}
          {failedAt && (
            <Alert severity="error" sx={{ mt: 3 }}>
              Provisioning halted at <strong>{failedAt.name}</strong>:{" "}
              {failedAt.detail}. Earlier lists were created successfully — you
              may need to delete and re-create them via SharePoint admin
              before retrying.
            </Alert>
          )}
        </Paper>

        {/* ── Step 2: seed the RAiD org structure ── */}
        <Box>
          <Typography variant="h5" sx={{ mt: 1 }}>
            Seed RAiD structure
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Creates the RAiD root unit and all 11 branches in the UNITS list.
            Run once, immediately after provisioning. Safe to inspect — aborts
            automatically if UNITS already has rows.
          </Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <List dense>
            {seedSteps.map((s) => (
              <ListItem key={s.name} sx={{ alignItems: "flex-start" }}>
                <ListItemIcon sx={{ minWidth: 36, pt: 0.5 }}>
                  <StepIcon state={s.state} />
                </ListItemIcon>
                <ListItemText
                  primary={s.name}
                  secondary={
                    s.state === "error" || s.state === "skip" ? s.detail : null
                  }
                  primaryTypographyProps={{
                    sx: { fontFamily: "Sometype Mono, monospace" },
                  }}
                  secondaryTypographyProps={{
                    color: s.state === "error" ? "error" : "text.secondary",
                  }}
                />
              </ListItem>
            ))}
          </List>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              disabled={seedRunning || !allOk}
              onClick={startSeed}
            >
              {seedRunning
                ? "Seeding…"
                : seedDone
                  ? "Re-run seed"
                  : "Seed RAiD structure"}
            </Button>
            {seedRunning && <CircularProgress size={28} />}
          </Stack>

          {!allOk && (
            <Alert severity="info" sx={{ mt: 3 }}>
              Run provisioning first to create the lists, then seed.
            </Alert>
          )}
          {seedDone && seedSteps.every((s) => s.state === "ok") && (
            <Alert severity="success" sx={{ mt: 3 }}>
              RAiD structure seeded — 1 root unit + 11 branches. Go to{" "}
              <strong>Org Structure</strong> to add roles to each branch.
            </Alert>
          )}
          {seedDone && seedSteps.some((s) => s.state === "skip") && (
            <Alert severity="warning" sx={{ mt: 3 }}>
              Seed skipped — UNITS list already has data.
            </Alert>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "ok") return <CheckCircleIcon fontSize="small" color="success" />;
  if (state === "error") return <ErrorIcon fontSize="small" color="error" />;
  if (state === "running") return <CircularProgress size={16} />;
  if (state === "skip") return <HourglassIcon fontSize="small" color="warning" />;
  return <HourglassIcon fontSize="small" sx={{ color: "text.disabled" }} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
      {children}
    </Box>
  );
}
