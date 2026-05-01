// AdPersonPicker — search-as-you-type against the SP People Picker web service.
// Uses searchUsers() from jsom.ts (which uses ClientPeoplePickerWebServiceInterface
// per the workspace CLAUDE.md quirk note). Calls onPick when a result is chosen.
//
// Hidden in dev mode (JSOM is unavailable). When rendered in prod, sits above
// the manual-entry fields in IndividualFormDialog.

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { isPeoplePickerAvailable, searchUsers, type PrincipalResult } from "@/lib/jsom";
import { log } from "@/lib/diagnosticLog";

type Props = {
  onPick: (user: { name: string; email: string | null; loginName: string }) => void;
};

const DEBOUNCE_MS = 300;

export function AdPersonPicker({ onPick }: Props) {
  // Poll for the people-picker namespace rather than checking once at render.
  // clientpeoplepicker.js does async internal setup after its script tag fires
  // its load event, so the namespace may not be ready the instant React mounts.
  const [ready, setReady] = useState(() => isPeoplePickerAvailable());
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PrincipalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => {
      if (isPeoplePickerAvailable()) setReady(true);
    }, 200);
    // Give up after 10 s — show nothing rather than spin forever
    const timeout = setTimeout(() => clearInterval(interval), 10_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [ready]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!ready) {
    // Dev / mock mode, or picker namespace not yet available
    return null;
  }

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setOptions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await searchUsers(value, 25);
        setOptions(results);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log("error", `AD picker search failed: ${message}`);
        setError(message);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  return (
    <Box>
      <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
        Pick from Active Directory
      </Typography>
      <Autocomplete
        freeSolo
        options={options}
        loading={loading}
        filterOptions={(o) => o /* server-side filter via searchUsers */}
        getOptionLabel={(o) =>
          typeof o === "string" ? o : `${o.displayText} (${o.description})`
        }
        onInputChange={(_, v) => handleInputChange(v)}
        onChange={(_, v) => {
          if (typeof v === "string" || !v) return;
          onPick({
            name: v.displayText,
            email: v.description?.includes("@") ? v.description : null,
            loginName: v.key,
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Type at least 2 characters…"
            value={query}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={16} sx={{ mr: 1 }} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      {error && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {error}. Use the manual fields below.
        </Alert>
      )}
    </Box>
  );
}
