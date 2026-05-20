"use client";

import { createBrowserClient } from "@supabase/ssr";

// Next inlines NEXT_PUBLIC_* by statically rewriting literal `process.env.FOO`
// references in client bundles. Dynamic `process.env[name]` defeats that
// rewrite, so the values would be undefined at runtime in the browser.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createBrowserSupabase() {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. See .env.example.");
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. See .env.example.");
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
