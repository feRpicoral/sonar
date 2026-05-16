"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/settings/members", label: "Members" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/api-keys", label: "API keys" },
  { href: "/settings/webhooks", label: "Webhooks" },
  { href: "/settings/audit-log", label: "Activity" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
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
        );
      })}
    </nav>
  );
}
