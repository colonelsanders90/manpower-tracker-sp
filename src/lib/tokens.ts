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
export const DATAGRID_SX = {
  bgcolor: "background.paper",
  borderColor: "rgba(0,0,0,0.08)",
  "& .MuiDataGrid-columnHeaders": {
    bgcolor: NAVY,
    color: "white",
    borderRadius: 0,
    fontFamily: MONO,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: "0.04em",
  },
  "& .MuiDataGrid-cell": {
    alignItems: "flex-start",
    py: 1.25,
    fontSize: 14,
  },
} as const;
