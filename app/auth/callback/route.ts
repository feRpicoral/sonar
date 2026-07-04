import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";

// Only allow redirects to internal paths. Rejects absolute URLs, scheme-relative
// (`//evil.com`), backslash tricks, and userinfo (`@evil.com`) so an attacker
// can't turn the callback into an open redirect via the `next` param.
function safeNextPath(raw: string | null): string {
  const fallback = "/dashboard";
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const errorParam = searchParams.get("error_description") ?? searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
