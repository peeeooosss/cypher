import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { MarketplaceComingSoon } from "@/components/marketplace-coming-soon";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function ArtistGigBillPage() {
  await requireRole("ARTIST");

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <Link
        href="/artist/marketplace"
        className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
      >
        &larr; Back to marketplace
      </Link>

      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Gig work bill</p>
          <h1 className="font-display text-display-lg uppercase">Unlock the marketplace</h1>
          <p className="mt-sm text-body-sm text-ink-muted">Artist marketplace access will be available when the marketplace launches.</p>
        </div>
        <SignOutButton />
      </div>

      <MarketplaceComingSoon />
    </main>
  );
}
