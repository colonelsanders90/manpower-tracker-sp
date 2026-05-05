// src/lib/sharepoint.ts
//
// Canonical SP 2013 REST utility. Copy verbatim into every app's src/lib/.
// Never modify per-app — if a bug is found, fix here and re-copy.

// API base defaults to root. Must be initialised at app startup via setApiBase()
// before any REST calls. _spPageContextInfo is NOT injected on plain .html files
// served from document libraries — use getWebServerRelativeUrl() from jsom.ts instead.
let API = import.meta.env.VITE_SP_API_BASE ?? '/_api'

export function setApiBase(webServerRelativeUrl: string): void {
  API = webServerRelativeUrl.replace(/\/$/, '') + '/_api'
}

const VERBOSE = 'application/json;odata=verbose'

// Digest cache
let cachedDigest: string | null = null
let digestExpiry = 0

async function getDigest(): Promise<string> {
  if (cachedDigest && Date.now() < digestExpiry) return cachedDigest
  const res = await fetch(`${API}/contextinfo`, {
    method: 'POST',
    headers: { Accept: VERBOSE },
    credentials: 'include',
  })
  const data = await res.json()
  cachedDigest = data.d.GetContextWebInformation.FormDigestValue
  digestExpiry = Date.now() + 25 * 60 * 1000 // 25 min
  return cachedDigest!
}

export async function spGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: VERBOSE },
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(`spGet ${path} failed: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return (data.d.results ?? data.d) as T
}

// Follows __next pagination. Use for lists that may exceed 5,000 items.
export async function spGetAll<T>(path: string): Promise<T[]> {
  const results: T[] = []
  let relativePath: string | null = path
  while (relativePath !== null) {
    const res = await fetch(`${API}${relativePath}`, {
      headers: { Accept: VERBOSE },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`spGetAll ${relativePath} failed: ${res.status} ${res.statusText}`)
    const data = await res.json()
    const page = (data.d.results ?? []) as T[]
    results.push(...page)
    const next: string | undefined = data.d.__next
    if (next) {
      const apiIndex = next.indexOf('/_api')
      relativePath = apiIndex !== -1 ? next.slice(apiIndex + 5) : null
    } else {
      relativePath = null
    }
  }
  return results
}

export async function spPost<T>(path: string, body: object): Promise<T> {
  const digest = await getDigest()
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Accept: VERBOSE,
      'Content-Type': VERBOSE,
      'X-RequestDigest': digest,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`spPost ${path} failed: ${res.status} ${res.statusText}${text ? ' — ' + text : ''}`)
  }
  const data = await res.json()
  return (data.d ?? data) as T
}

export async function spUpdate(path: string, body: object): Promise<void> {
  const digest = await getDigest()
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Accept: VERBOSE,
      'Content-Type': VERBOSE,
      'X-RequestDigest': digest,
      'X-HTTP-Method': 'MERGE',
      'If-Match': '*',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`spUpdate ${path} failed: ${res.status} ${res.statusText}${text ? ' — ' + text : ''}`)
  }
}

export async function spDelete(path: string): Promise<void> {
  const digest = await getDigest()
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Accept: VERBOSE,
      'X-RequestDigest': digest,
      'X-HTTP-Method': 'DELETE',
      'If-Match': '*',
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`spDelete ${path} failed: ${res.status} ${res.statusText}${text ? ' — ' + text : ''}`)
  }
}

// Get ListItemEntityTypeFullName for a list (needed in POST __metadata).
// REQUIRED for lists whose names contain underscores or other special chars —
// hardcoded `SP.Data.${listName}ListItem` does not resolve for them
// (SP encodes `_` as `_x005f_` in the EntityType, etc.). Cached after first
// fetch so writes don't pay the round-trip on every call.
const _listItemTypeCache = new Map<string, string>()

export async function getListItemType(listName: string): Promise<string> {
  const cached = _listItemTypeCache.get(listName)
  if (cached) return cached
  const res = await spGet<{ ListItemEntityTypeFullName: string }>(
    `/lists/getbytitle('${listName}')?$select=ListItemEntityTypeFullName`
  )
  _listItemTypeCache.set(listName, res.ListItemEntityTypeFullName)
  return res.ListItemEntityTypeFullName
}

// ── Current User ─────────────────────────────────────────────────────────────

export interface CurrentUser {
  Id: number           // integer user ID in this site collection
  Title: string        // "Full Name, Appointment, Department" (see parseUserTitle)
  LoginName: string    // "i:0#.w|DOMAIN\\username" (Windows Auth claim format)
  Email: string        // may be empty string if not configured in SP profile
  IsSiteAdmin: boolean
  PrincipalType: number // 1 = User
}

export interface UserTitleParts {
  fullName: string
  appointment: string | null  // null if not present in Title
  department: string | null   // null if not present in Title
}

export function parseUserTitle(title: string): UserTitleParts {
  const parts = title.split(',').map(p => p.trim())
  return {
    fullName: parts[0] ?? title,
    appointment: parts[1] ?? null,
    department: parts[2] ?? null,
  }
}
