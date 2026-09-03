import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { MarketplaceComingSoon } from "@/components/marketplace-coming-soon";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ArtistMarketplacePage() {
  await requireRole("ARTIST");

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <Link
        href="/artist"
        className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
      >
        &larr; Back to dashboard
      </Link>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            Marketplace
          </p>
          <h1 className="font-display text-display-lg uppercase">Find your next gig.</h1>
          <p className="mt-sm text-body-sm text-ink-muted">
            Browse freelance work, send proposals, manage offers and chat with organizers.
          </p>
        </div>
        <SignOutButton />
      </div>

      <MarketplaceComingSoon />
    </main>
  );
}
