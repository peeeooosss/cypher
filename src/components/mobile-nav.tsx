"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/artist/directory", label: "Artists" },
];

const dashboardHref: Record<string, string> = {
  ORGANIZER: "/organizer",
  ARTIST: "/artist",
  JUDGE: "/judge",
  ADMIN: "/admin",
};

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const fourth = role
    ? { href: dashboardHref[role] ?? "/", label: "Console" }
    : { href: "/login", label: "Join" };

  if (pathname === "/judge" || pathname.startsWith("/judge/")) return null;

  const items = [...tabs, fourth];

  return (
    <>
      <div aria-hidden className="h-[60px] md:hidden" />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-wider transition-colors ${
                active ? "text-accent" : "text-ink-muted"
              }`}
            >
              <span
                aria-hidden
                className={`h-1 w-8 rounded-full ${active ? "bg-accent" : "bg-transparent"}`}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
      </nav>
    </>
  );
}
