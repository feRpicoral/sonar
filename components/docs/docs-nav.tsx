"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    title: "Getting started",
    items: [{ href: "/docs", label: "Overview" }],
  },
  {
    title: "Reference",
    items: [
      { href: "/docs/authentication", label: "Authentication" },
      { href: "/docs/api-reference", label: "API reference" },
      { href: "/docs/webhooks", label: "Webhooks" },
    ],
  },
];

export function DocsNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section.title} className="space-y-1.5">
          <h4 className="text-muted-foreground px-2.5 text-[10px] font-medium tracking-widest uppercase">
            {section.title}
          </h4>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
