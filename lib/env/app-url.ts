/**
 * Public-facing base URL for the running deployment. Read at build time for
 * static pages (docs) and at request time for server actions. Falls back to
 * localhost for `next dev` when the env var isn't set.
 */
export function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Canonical base URL for the v1 REST API. */
export function getApiBaseUrl(): string {
  return `${getAppUrl()}/api/v1`;
}
