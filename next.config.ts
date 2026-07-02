import type { NextConfig } from "next";

// Baseline security headers applied to every response. No CSP yet - a correct
// policy for Supabase / PostHog / Sentry / Resend needs its own pass; these are
// the safe, high-value headers that don't risk breaking third-party scripts.
// SAMEORIGIN (not DENY) so the marketing page can still frame its own /marketing
// screen mocks.
const securityHeaders = [
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

export default nextConfig;
