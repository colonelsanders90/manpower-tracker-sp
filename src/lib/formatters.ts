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
