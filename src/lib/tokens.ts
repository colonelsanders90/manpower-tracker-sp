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
// Notes (after user feedback "tables are hard to read", then "white text
// hurts my eyes"):
//   - Header text uses STONE (#DEDCD8) instead of pure white. Reads cleanly
//     against the navy chrome without the harsh bright-white-on-saturated-dark
//     fatigue. Same effect as off-white text in serious dashboards.
//   - Outer + cell borders bumped to 18% / 12% so rows separate clearly.
//   - Faint zebra stripe + navy-tinted hover for scanning.
export const DATAGRID_SX = {
  bgcolor: "background.paper",
  border: "1px solid rgba(0,0,0,0.18)",
  "& .MuiDataGrid-columnHeaders": {
    bgcolor: NAVY,
    color: STONE,
    borderRadius: 0,
    fontFamily: MONO,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: "0.04em",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    color: STONE,
    fontWeight: 600,
  },
  "& .MuiDataGrid-iconSeparator, & .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton": {
    color: STONE,
  },
  "& .MuiDataGrid-columnHeader": {
    borderRight: "1px solid rgba(222,220,216,0.18)",
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
