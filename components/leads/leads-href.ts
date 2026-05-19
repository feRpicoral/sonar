/**
 * Build a /leads href that preserves the current search params and applies
 * a set of updates. Pass `null` for any key to clear it.
 */
export function buildLeadsHref(
  params: URLSearchParams,
  updates: Record<string, string | null>,
): string {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  const q = next.toString();
  return q ? `/leads?${q}` : "/leads";
}
