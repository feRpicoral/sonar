import * as Sentry from "@sentry/nextjs";

// Next.js 16 loads client-side instrumentation from this file. The old
// sentry.client.config.ts was never picked up, so browser errors went
// unreported despite the rest of the Sentry setup.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
