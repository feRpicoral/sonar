import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen w-full place-items-center px-6 py-12">
      <div className="w-full max-w-sm space-y-10">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 transition hover:opacity-80"
        >
          <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden />
          <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Sonar
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
