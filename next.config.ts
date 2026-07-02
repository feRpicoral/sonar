import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Content-Security-Policy scoped to the app's integrations (Supabase, PostHog,
// Sentry, Stripe). 'unsafe-inline'/'unsafe-eval' stay in script-src because the
// App Router injects inline bootstrap scripts and there is no nonce pipeline
// yet; everything else is locked down. connect-src covers Supabase REST +
// Realtime (wss), PostHog, Sentry ingest, and Stripe.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.ingest.sentry.io https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
].join("; ");

// Baseline security headers applied to every response. SAMEORIGIN (not DENY) so
// the marketing page can still frame its own /marketing screen mocks.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Wrap the config so the Sentry SDK instruments the client bundle and (when
// SENTRY_AUTH_TOKEN / org / project are set in CI) uploads source maps. Without
// this wrapper the client Sentry setup never runs.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
