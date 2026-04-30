// src/main.tsx — standard wiring.
//
// Key rules:
//   1. initDiagnosticLog() runs BEFORE createRoot so startup errors are captured.
//   2. ErrorBoundary wraps <App /> to catch render-phase crashes.
//   3. GlobalErrorDialog is rendered OUTSIDE ErrorBoundary so it survives
//      render crashes and remains usable for unhandled async errors.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'

// RAiD brand fonts. Imported here so vite-plugin-singlefile inlines the
// WOFF2s into dist/index.html — the SP intranet has no external network.
//
//   Outfit (variable, 100–900) — default sans, headings, body
//   Sometype Mono — brand/editorial mono (overlines, captions, labels)
//   Geist Mono     — app-chrome mono (sidebar nav, table heads, breadcrumbs)
import '@fontsource-variable/outfit'
import '@fontsource/sometype-mono/400.css'
import '@fontsource/sometype-mono/500.css'
import '@fontsource/sometype-mono/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'

import App from './App'
import { theme } from './theme'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalErrorDialog from './components/GlobalErrorDialog'
import { init as initDiagnosticLog, log } from './lib/diagnosticLog'

initDiagnosticLog()

// Route all TanStack Query failures through diagnosticLog so they appear in
// the downloaded log file. TanStack Query v5 catches promise rejections
// internally — they never reach window.unhandledrejection — so without these
// handlers, query/mutation errors are silently swallowed in the log.
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      log(
        'error',
        `Query failed [${String(query.queryKey)}]: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      const key = mutation.options.mutationKey ? String(mutation.options.mutationKey) : '(unnamed)';
      log(
        'error',
        `Mutation failed [${key}]: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    },
  }),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        {/* Outside ErrorBoundary — survives render crashes */}
        <GlobalErrorDialog />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
