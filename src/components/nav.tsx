"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/artist/directory", label: "Artists" },
  { href: "/for-organizers", label: "For Organizers" },
  { href: "/for-artists", label: "For Artists" },
  { href: "/about", label: "About Us" },
];

const dashboardLinks: Record<string, { href: string; label: string }[]> = {
  ORGANIZER: [
    { href: "/organizer", label: "Dashboard" },
    { href: "/organizer/gigs", label: "Gigs" },
  ],
  ARTIST: [
    { href: "/artist", label: "Dashboard" },
    { href: "/artist/gigs", label: "Marketplace" },
  ],
  JUDGE: [{ href: "/judge", label: "Portal" }],
  ADMIN: [{ href: "/admin", label: "Admin" }],
};

export function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = session?.user?.role;
  const dashboard = role ? dashboardLinks[role] ?? [] : [];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-md py-md md:px-xl">
        <Link href="/" className="block leading-none" aria-label="CYPHR home">
          <Image
            src="/logo.svg"
            alt="CYPHR"
            width={112}
            height={28}
            priority
            className="block h-7 w-auto"
          />
        </Link>

        <div className="hidden items-center gap-lg md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors hover:text-accent ${
                pathname === link.href ? "text-accent" : "text-ink-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {dashboard.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors hover:text-accent ${
                pathname === link.href ? "text-accent" : "text-ink-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {status === "authenticated" ? (
            <form action="/api/auth/signout" method="POST" className="inline-block">
              <button
                type="submit"
                className="border border-line px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors hover:border-accent hover:text-accent cursor-pointer"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="border border-accent bg-accent px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
            >
              Sign in
            </Link>
          )}
        </div>

        <button
          className="border border-line px-sm py-xs font-mono text-[0.7rem] uppercase md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          type="button"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </nav>

      {menuOpen ? (
        <div className="border-t border-line px-md py-md md:hidden">
          <div className="flex flex-col gap-md">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`font-mono text-[0.75rem] uppercase tracking-[0.15em] ${
                  pathname === link.href ? "text-accent" : "text-ink-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {dashboard.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`font-mono text-[0.75rem] uppercase tracking-[0.15em] ${
                  pathname === link.href ? "text-accent" : "text-ink-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {status === "authenticated" ? (
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="font-mono text-[0.75rem] uppercase tracking-[0.15em] text-ink-muted cursor-pointer"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="border border-accent bg-accent px-md py-xs text-center font-mono text-[0.75rem] uppercase tracking-[0.15em] text-paper"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}