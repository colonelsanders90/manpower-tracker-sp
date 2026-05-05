/**
 * Combines a military rank and a name into a single display string.
 * e.g. formatName("COL", "Tan Wei Ming") → "COL Tan Wei Ming"
 *      formatName(null,  "Tan Wei Ming") → "Tan Wei Ming"
 *
 * Always use this function wherever an individual's name is displayed —
 * never embed the rank inside the Title field of the SP list item.
 */
export function formatName(
  rank: string | null | undefined,
  title: string,
): string {
  return rank ? `${rank} ${title}` : title
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/**
 * Render a SharePoint date string as "D MMM YYYY" (e.g. "5 May 2026").
 *
 * SP returns ISO 8601 strings like "2026-05-05T00:00:00Z" for date columns.
 * Calling new Date(iso).toLocaleString() then formatting can shift the
 * displayed day by ±1 in any timezone that's not UTC, AND surfaces an
 * unwanted HH:MM:SS tail with the wrong offset.
 *
 * For calendar-date fields (StartDate, EndDate, DateOfExpertise, course
 * attendance Date, etc.) the user only cares about the calendar day —
 * slicing the first 10 chars of the ISO string gives that day verbatim
 * with zero timezone math.
 *
 * Pass the dash fallback ("—") when the value is null/empty so callers
 * don't need to repeat it.
 */
export function formatDate(
  iso: string | null | undefined,
  fallback = "—",
): string {
  if (!iso) return fallback
  // Accept full ISO ("2026-05-05T00:00:00Z") or already-trimmed ("2026-05-05").
  const ymd = iso.length >= 10 ? iso.slice(0, 10) : iso
  const [y, m, d] = ymd.split("-")
  const month = MONTH_SHORT[Number(m) - 1]
  if (!y || !m || !d || !month) return iso // unparseable — show raw
  return `${Number(d)} ${month} ${y}`
}
