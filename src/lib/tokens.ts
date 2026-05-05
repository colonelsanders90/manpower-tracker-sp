// Flat brand-token re-exports — the values used inside `sx={{}}` blocks
// across the app. The same hexes live in theme.ts (the MUI palette);
// keep both files in sync if any value changes.

export const NAVY = "#01219C";   // primary chrome / nav / table headers
export const ACCENT = "#008ED0"; // links, primary actions
export const CORAL = "#F9866B";  // scalpel accent — one per screen
export const STONE = "#DEDCD8";  // page background

// App-chrome mono (sidebar, breadcrumbs, table headers, badges).
// Distinct from caption's Sometype Mono — that's already a typography variant.
export const MONO = '"Geist Mono", monospace';

// Reusable DataGrid sx — currently identical across the 4 list pages.
// Imported as `sx={DATAGRID_SX}` on every DataGrid in the routes folder.
//
// Contrast notes (after user feedback "tables are hard to read"):
//   - outer + cell borders bumped from 8% → 18% so rows separate clearly
//   - zebra striping on odd rows (very subtle stone tint)
//   - hover background to make row scanning easier
//   - bolder cell text on the primary text colour
export const DATAGRID_SX = {
  bgcolor: "background.paper",
  border: "1px solid rgba(0,0,0,0.18)",
  "& .MuiDataGrid-columnHeaders": {
    bgcolor: NAVY,
    color: "white",
    borderRadius: 0,
    fontFamily: MONO,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: "0.04em",
  },
  "& .MuiDataGrid-columnHeader": {
    borderRight: "1px solid rgba(255,255,255,0.18)",
  },
  "& .MuiDataGrid-cell": {
    alignItems: "flex-start",
    py: 1.25,
    fontSize: 14,
    color: "text.primary",
    borderColor: "rgba(0,0,0,0.12)",
  },
  "& .MuiDataGrid-row": {
    "&:nth-of-type(odd)": {
      bgcolor: "rgba(0,0,0,0.018)", // very faint zebra
    },
    "&:hover": {
      bgcolor: "rgba(1,33,156,0.06) !important", // navy-tinted hover
    },
  },
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid rgba(0,0,0,0.18)",
  },
} as const;
