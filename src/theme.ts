import { createTheme } from "@mui/material/styles";

/**
 * RAiD theme — colour and type tokens mirrored from the Next.js prototype's
 * RAiD design system (`colors_and_type.css`). Reused verbatim so the SP
 * version looks identical on screen.
 *
 * Brand palette:
 *   --raid-blue          #008ED0  primary (digital/app)
 *   --raid-blue-deep     #01219C  navy chrome (app bar / sidebar)
 *   --raid-blue-light    #6CCBFF  highlights
 *   --raid-stone         #DEDCD8  page bg
 *   --raid-coral         #F9866B  scalpel accent (one per screen)
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#008ED0", dark: "#01219C", light: "#6CCBFF" },
    secondary: { main: "#01219C" },
    error: { main: "#E24B4A" },
    warning: { main: "#BA7517" },
    success: { main: "#1D9E75" },
    background: {
      default: "#DEDCD8", // stone — never white for app pages
      paper: "#FFFFFF",
    },
    text: {
      primary: "#000000",
      secondary: "#5F5E5A",
      disabled: "#B4B2A9",
    },
    divider: "rgba(0, 0, 0, 0.08)",
  },
  typography: {
    fontFamily:
      '"Outfit", "Outfit Variable", Helvetica, "Trebuchet MS", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.01em" },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontSize: "0.9375rem", lineHeight: 1.6 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.5 },
    caption: {
      fontFamily: '"Sometype Mono", "Courier New", monospace',
      fontSize: "0.6875rem",
      fontWeight: 600,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
    },
  },
  shape: {
    borderRadius: 10, // cards, pills
  },
  components: {
    // SP rule: app chrome (AppBar, Drawer, table heads) has 0 radius
    MuiAppBar: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { borderRadius: 0 } },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 8, textTransform: "none" } },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          // hairline border, no shadow — the RAiD card style
          border: "0.5px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "none",
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#DEDCD8",
        },
      },
    },
  },
});
