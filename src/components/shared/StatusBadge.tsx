import { Box } from "@mui/material";
import type { PostingStatus } from "@/types/postings";

const styles: Record<
  PostingStatus,
  { bg: string; color: string; label: string }
> = {
  Past: { bg: "#F1EFE8", color: "#5F5E5A", label: "Past" },
  Current: { bg: "#E1F5EE", color: "#085041", label: "Current" },
  Planned: { bg: "#B5D4F4", color: "#0C447C", label: "Planned" },
  Candidate: { bg: "#FAEEDA", color: "#633806", label: "Candidate" },
};

export function StatusBadge({ status }: { status: PostingStatus }) {
  const s = styles[status];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        bgcolor: s.bg,
        color: s.color,
        fontFamily: '"Sometype Mono", monospace',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        borderRadius: "999px",
        px: 1,
        py: 0.25,
        whiteSpace: "nowrap",
        lineHeight: 1.4,
      }}
    >
      {s.label}
    </Box>
  );
}
