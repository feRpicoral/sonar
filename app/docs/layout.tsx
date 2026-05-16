import Link from "next/link";

import { DocsNav } from "@/components/docs/docs-nav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden />
            <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Sonar
            </span>
            <span className="text-muted-foreground font-mono text-xs">/ docs</span>
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-10 lg:grid-cols-[200px_1fr]">
        <aside>
          <DocsNav />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
