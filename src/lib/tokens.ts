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
// History (user feedback over multiple iterations):
//   1. "tables are hard to read"  → bumped border opacity, added zebra
//   2. "white text hurts my eyes" → header text from #FFF → STONE → 0.62 white
//   3. "don't use stone, use something else, i'm dying" — abandoning the
//      light-on-dark approach entirely. Switched to dark text on a soft
//      neutral header (Notion / Linear / GitHub pattern). Same chrome accent
//      retained as a 3px navy bottom border so the header still reads as
//      brand-aligned, just without the saturated-bg eye-strain.
const HEADER_BG = "#F1EFE8";   // warm off-white, slightly darker than paper
const HEADER_TEXT = "#3F3D38"; // soft near-black
const HEADER_BORDER = NAVY;

export const DATAGRID_SX = {
  bgcolor: "background.paper",
  border: "1px solid rgba(0,0,0,0.18)",
  "& .MuiDataGrid-columnHeaders": {
    bgcolor: HEADER_BG,
    color: HEADER_TEXT,
    borderRadius: 0,
    borderBottom: `2px solid ${HEADER_BORDER}`,
    fontFamily: MONO,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: "0.04em",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    color: HEADER_TEXT,
    fontWeight: 600,
  },
  "& .MuiDataGrid-iconSeparator, & .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton": {
    color: HEADER_TEXT,
  },
  "& .MuiDataGrid-columnHeader": {
    borderRight: "1px solid rgba(0,0,0,0.08)",
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
