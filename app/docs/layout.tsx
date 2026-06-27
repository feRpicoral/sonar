import Link from "next/link";

import { DocsNav } from "@/components/docs/docs-nav";
import { DocsToc } from "@/components/docs/docs-toc";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background sticky top-0 z-20 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-primary size-1.5 rounded-full" aria-hidden />
            <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Sonar
            </span>
            <span className="text-muted-foreground/60 text-xs">/</span>
            <span className="text-sm font-semibold">Docs</span>
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[180px_1fr_180px]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <DocsNav />
        </aside>
        <main className="min-w-0">{children}</main>
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <DocsToc />
        </aside>
      </div>
    </div>
  );
}
