// src/App.tsx — standard init pattern.
//
// In dev (Vite mock mode), skip JSOM entirely — `ready` starts `true`.
// In prod, resolve the web's server-relative URL via JSOM, hand it to
// sharepoint.ts so REST calls target the same subsite, then render.
//
// The startup error branch MUST show a Download Diagnostic Log button —
// an <Alert> alone is not enough in the air-gapped environment.

import { useState, useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import {
  Alert, Box, Button, CircularProgress, Paper, Typography,
} from '@mui/material'
import { setApiBase } from './lib/sharepoint'
import { getWebServerRelativeUrl } from './lib/jsom'
import { log, downloadLog } from './lib/diagnosticLog'
import { router } from './router'

type StartupState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

export default function App() {
  const [startup, setStartup] = useState<StartupState>(
    import.meta.env.DEV ? { phase: 'ready' } : { phase: 'loading' }
  )

  useEffect(() => {
    if (import.meta.env.DEV) return
    getWebServerRelativeUrl()
      .then(url => {
        setApiBase(url)
        setStartup({ phase: 'ready' })
      })
      .catch(err => {
        const message = err instanceof Error ? err.message : String(err)
        log('error', `Startup failed: ${message}`, err instanceof Error ? err.stack : undefined)
        setStartup({ phase: 'error', message })
      })
  }, [])

  if (startup.phase === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (startup.phase === 'error') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" p={4}>
        <Paper sx={{ p: 4, maxWidth: 560, width: '100%', borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom color="error">Startup Failed</Typography>
          <Alert severity="error" sx={{ mb: 2 }}>{startup.message}</Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Download the diagnostic log and send it to your administrator.
          </Typography>
          <Box display="flex" gap={1.5}>
            <Button variant="contained" onClick={downloadLog}>Download Diagnostic Log</Button>
            <Button variant="outlined" onClick={() => window.location.reload()}>Retry</Button>
          </Box>
        </Paper>
      </Box>
    )
  }

  return <RouterProvider router={router} />
}
