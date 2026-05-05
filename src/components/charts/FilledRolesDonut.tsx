// Hand-rolled SVG donut chart for the dashboard's "Filled vs Vacant" stat.
// No chart library — keeps the bundle light and the colours pure RAiD.
// Two layered circles with stroke-dasharray make the ring slices.

import { Box, Paper, Stack, Typography } from "@mui/material";
import { NAVY, ACCENT, CORAL } from "@/lib/tokens";

type Props = {
  filled: number;
  total: number;
};

export function FilledRolesDonut({ filled, total }: Props) {
  const safe = total > 0 ? total : 1;
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const filledLen = (filled / safe) * circumference;
  const vacant = total - filled;

  return (
    <Paper sx={{ p: 3, height: "100%" }}>
      <Typography variant="caption" sx={{ display: "block", mb: 2 }}>
        Filled vs vacant
      </Typography>
      <Stack alignItems="center" spacing={2}>
        <Box sx={{ position: "relative", width: 160, height: 160 }}>
          <svg viewBox="0 0 100 100" style={{ width: 160, height: 160 }}>
            <g transform="rotate(-90 50 50)">
              {/* Background ring — vacancy colour */}
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={total === 0 ? "#E0DEDA" : CORAL}
                strokeWidth="14"
                opacity={total === 0 ? 1 : 0.85}
              />
              {/* Foreground arc — filled */}
              {filled > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth="14"
                  strokeDasharray={`${filledLen} ${circumference}`}
                  strokeLinecap="butt"
                />
              )}
            </g>
            <text
              x="50"
              y="48"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: 22,
                fontWeight: 700,
                fill: NAVY,
                letterSpacing: "-0.02em",
              }}
            >
              {percent}%
            </text>
            <text
              x="50"
              y="64"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: "Geist Mono, monospace",
                fontSize: 6,
                fill: "#5F5E5A",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Filled
            </text>
          </svg>
        </Box>

        <Stack direction="row" gap={3} justifyContent="center">
          <LegendItem color={ACCENT} count={filled} label="Filled" />
          <LegendItem color={CORAL} count={vacant} label="Vacant" />
        </Stack>

        <Typography
          variant="caption"
          sx={{ color: "text.secondary", textTransform: "none", letterSpacing: 0 }}
        >
          {filled} of {total} role{total === 1 ? "" : "s"} have a current
          incumbent
        </Typography>
      </Stack>
    </Paper>
  );
}

function LegendItem({
  color,
  count,
  label,
}: {
  color: string;
  count: number;
  label: string;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: color,
        }}
      />
      <Typography
        sx={{
          fontFamily: "Geist Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.04em",
        }}
      >
        <Box
          component="span"
          sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", mr: 0.75 }}
        >
          {count}
        </Box>
        <Box component="span" sx={{ color: "text.secondary" }}>
          {label}
        </Box>
      </Typography>
    </Stack>
  );
}
