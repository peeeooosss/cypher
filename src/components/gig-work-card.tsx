"use client";

import Link from "next/link";

export function GigWorkCard({ expiresAt }: { expiresAt: Date | null }) {
  const active = expiresAt != null && expiresAt.getTime() > Date.now();

  return (
    <section className="mt-section border border-line bg-paper-soft p-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">
            Gig Work
          </p>
          <p className="mt-sm text-body-sm text-ink-muted">
            {active
              ? `Active until ${expiresAt.toLocaleDateString()} — apply to freelance gigs on the marketplace.`
              : "Pay ₹49 for 3 months to apply to freelance gigs on the marketplace."}
          </p>
        </div>
        {active ? (
          <Link
            href="/artist/gigs"
            className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
          >
            Browse gigs
          </Link>
        ) : (
          <Link
            href="/artist/gig-bill"
            className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
          >
            Enable — ₹49 / 3 mo
          </Link>
        )}
      </div>
    </section>
  );
}
