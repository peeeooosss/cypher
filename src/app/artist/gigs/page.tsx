import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { GigsMarketplace } from "@/components/gig-marketplace";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ArtistGigsPage() {
  const user = await requireRole("ARTIST");

  const [gigs, applications] = await Promise.all([
    prisma.gig.findMany({
      where: { status: "OPEN" },
      include: { organizer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gigApplication.findMany({
      where: { artistId: user.id },
      include: {
        gig: {
          select: {
            id: true,
            title: true,
            budget: true,
            currency: true,
            location: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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
            Freelance work posted by organizers — filter by the skills you know.
          </p>
        </div>
        <SignOutButton />
      </div>

      <GigsMarketplace gigs={gigs} applications={applications} />
    </main>
  );
}
