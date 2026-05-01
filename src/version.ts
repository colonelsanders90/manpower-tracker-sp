// APP_VERSION is injected by Vite at build time (see vite.config.ts → define).
// Format: "<git-short-hash> (<date>)" e.g. "efb06ba (2026-05-01)"
// Falls back to "dev" on the dev server (where __APP_VERSION__ is also injected,
// but will reflect the current HEAD at the time the dev server was started).
//
// Do NOT hard-code a version string here — it will never auto-update.
export const APP_VERSION: string = __APP_VERSION__
