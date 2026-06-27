"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

export function DocsToc() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let observer: IntersectionObserver | undefined;
    const raf = requestAnimationFrame(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("main h2[id], main h3[id]"));
      setHeadings(
        nodes.map((n) => ({
          id: n.id,
          text: n.textContent ?? "",
          level: n.tagName === "H2" ? 2 : 3,
        })),
      );
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) setActiveId((e.target as HTMLElement).id);
        },
        { rootMargin: "0px 0px -70% 0px" },
      );
      nodes.forEach((n) => observer!.observe(n));
    });
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="space-y-2">
      <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
        On this page
      </p>
      <ul className="space-y-1.5 text-[13px]">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${h.id}`}
              className={cn(
                "block transition-colors",
                activeId === h.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
