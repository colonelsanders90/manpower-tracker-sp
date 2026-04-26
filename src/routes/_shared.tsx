// Tiny helpers shared across route components.

import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

const NAVY = "#01219C";

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
      <Stack alignItems="center" spacing={2}>
        <CircularProgress />
        {label && (
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export function ErrorBlock({ error }: { error: Error }) {
  return (
    <Alert severity="error" sx={{ my: 4 }}>
      {error.message}
    </Alert>
  );
}

export function PageHeader({
  overline,
  title,
  blurb,
}: {
  overline: string;
  title: React.ReactNode;
  blurb?: React.ReactNode;
}) {
  return (
    <Box sx={{ borderLeft: `5px solid ${NAVY}`, pl: 2.5, py: 0.5 }}>
      <Typography variant="caption">{overline}</Typography>
      <Typography variant="h4" sx={{ mt: 0.5 }}>
        {title}
      </Typography>
      {blurb && (
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", mt: 0.5, maxWidth: 640 }}
        >
          {blurb}
        </Typography>
      )}
    </Box>
  );
}
