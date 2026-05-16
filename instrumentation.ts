// Next.js instrumentation file — runs once per worker on cold start.
// Loads runtime-specific Sentry config. If SENTRY_DSN is unset (dev / preview
// without observability keys) the SDK initializes in a no-op mode and never
// errors at runtime.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (
  ...args: Parameters<NonNullable<typeof import("@sentry/nextjs").captureRequestError>>
) => {
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(...args);
};
