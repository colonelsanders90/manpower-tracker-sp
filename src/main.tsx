// src/main.tsx — standard wiring.
//
// Key rules:
//   1. initDiagnosticLog() runs BEFORE createRoot so startup errors are captured.
//   2. ErrorBoundary wraps <App /> to catch render-phase crashes.
//   3. GlobalErrorDialog is rendered OUTSIDE ErrorBoundary so it survives
//      render crashes and remains usable for unhandled async errors.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import App from './App'
import { theme } from './theme'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalErrorDialog from './components/GlobalErrorDialog'
import { init as initDiagnosticLog } from './lib/diagnosticLog'

initDiagnosticLog()

const queryClient = new QueryClient()

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
