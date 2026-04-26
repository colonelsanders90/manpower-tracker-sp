// src/hooks/useListPolling.ts
//
// Change-detection polling (lightweight live updates).
//
// Polling full paginated datasets on a fixed interval is expensive once
// spGetAll is involved (N requests per cycle). Two-tier approach instead:
//
//   1. Poll cheaply — one $top=1&$select=Modified&$orderby=Modified desc
//      request per list every 30s.
//   2. Reload expensively — only when the returned Modified timestamp
//      changes, invalidate the main data query so it refetches.
//
// SP updates Modified on every write automatically, so this detects any
// create/update/delete without comparing full datasets.
//
// The main data query should carry `staleTime: 5 * 60_000` so its automatic
// refetches are suppressed and this poller manages freshness. Mutations
// still call qc.invalidateQueries directly for instant local updates.
//
// useRef sentinel — Strict Mode safe:
//   undefined  → not yet initialised; first effect run records baseline and returns
//   null       → list is empty
//   string     → last-known Modified timestamp
// On React 18's simulated double-mount, the ref survives unmount with the
// baseline already set, so the second mount sees prevMod === lastMod and
// correctly skips invalidation.
//
// Testing strategy: do NOT fake-timer-drive refetchInterval — that couples
// tests to TanStack Query internals. Let the initial fetch complete, then
// inject a changed poll result via qc.setQueryData(key, newTimestamp) inside
// act(), and waitFor() the assertion.

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { spGet } from '../lib/sharepoint'

export function useListPolling(listName: string, dataQueryKey: readonly unknown[]) {
  const qc = useQueryClient()

  const { data: lastMod } = useQuery({
    queryKey: [listName, 'lastmod'],
    queryFn: async () => {
      const items = await spGet<{ Modified: string }[]>(
        `/lists/getbytitle('${listName}')/items?$orderby=Modified desc&$top=1&$select=Modified`
      )
      return items[0]?.Modified ?? null
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  })

  const prevMod = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (prevMod.current === undefined) {
      prevMod.current = lastMod
      return
    }
    if (lastMod !== undefined && lastMod !== prevMod.current) {
      void qc.invalidateQueries({ queryKey: dataQueryKey })
      prevMod.current = lastMod
    }
  }, [lastMod, qc, dataQueryKey])
}
