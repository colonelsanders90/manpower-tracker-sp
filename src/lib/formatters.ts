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

/**
 * Normalise a date-input value (`<input type="date">` returns "YYYY-MM-DD")
 * to an ISO 8601 string at noon UTC: "YYYY-MM-DDT12:00:00Z".
 *
 * Why noon UTC and not "YYYY-MM-DDT00:00:00Z" or the bare date:
 *   - SP 2013's Date columns interpret bare "YYYY-MM-DD" in the server's
 *     local timezone. If the server runs in any non-UTC zone, midnight
 *     shifts across a day boundary when SP normalises to UTC for storage,
 *     so a date the user typed "5 May" comes back as "4 May".
 *   - Sending noon UTC means no ±12-hour timezone shift can cross a day
 *     boundary. The day part survives every round trip.
 *
 * Pass-through behaviour:
 *   - `null`/empty → null  (so callers can pass user-cleared inputs)
 *   - already-ISO ("2026-05-05T...") → returned unchanged
 *   - anything else → returned unchanged (caller decides)
 */
export function dateInputToISO(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00:00Z`
  return value
}
