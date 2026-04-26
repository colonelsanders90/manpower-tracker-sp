import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { reportCriticalError, downloadLog } from "@/lib/diagnosticLog";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportCriticalError(error.message, error.stack ?? info.componentStack ?? "");
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          bgcolor: "background.default",
        }}
      >
        <Paper sx={{ maxWidth: 540, width: "100%", p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Something went wrong</Typography>
            <Alert severity="error">{this.state.error.message}</Alert>
            <Typography variant="body2" color="text.secondary">
              The page can&apos;t render. Download the diagnostic log and send
              it to the RAiD team.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={downloadLog}>
                Download log
              </Button>
              <Button onClick={() => window.location.reload()}>
                Reload
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }
}
