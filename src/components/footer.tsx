"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/for-organizers", label: "For Organizers" },
  { href: "/for-artists", label: "For Artists" },
  { href: "/about", label: "About Us" },
];

export function Footer() {
  const pathname = usePathname();

  if (pathname === "/judge" || pathname.startsWith("/judge/")) {
    return null;
  }

  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
        <div className="border-b border-line pb-section">
          <Link href="/" className="inline-block leading-none" aria-label="CYPHR home">
            <Image
              src="/logo.svg"
              alt="CYPHR"
              width={160}
              height={40}
              className="block h-10 w-auto"
            />
          </Link>
          <p className="mt-md max-w-4xl font-display text-body-md uppercase leading-relaxed tracking-[0.02em] text-ink-muted">
            The underground artist and performance platform. Battles, cyphers, live
            scoring, and the marketplace — one home for the floor.
          </p>
        </div>

        <div className="mt-section grid gap-lg md:grid-cols-2">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
              Explore
            </p>
            <ul className="mt-md space-y-sm">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-mono text-body-sm uppercase tracking-[0.15em] text-ink-muted transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted">
              Contact
            </p>
            <ul className="mt-md space-y-sm text-body-sm">
              <li>
                <a
                  href="mailto:piyushbhuyan001@gmail.com"
                  className="text-ink-muted transition-colors hover:text-accent"
                >
                  piyushbhuyan001@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/919864854481"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-muted transition-colors hover:text-accent"
                >
                  WhatsApp — +91 98648 54481
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-sm px-md py-lg md:flex-row md:px-xl">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-ink-muted">
            © {new Date().getFullYear()} CYPHR. All rights reserved.
          </p>
          <a
            href="https://tryauraai.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-ink-muted transition-colors hover:text-accent"
          >
            Powered by <span className="text-accent">AURA AI</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
