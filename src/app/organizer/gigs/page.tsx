import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { GigManager } from "@/components/gig-manager";
import { MessagesPanel } from "@/components/messages-panel";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrganizerGigsPage() {
  const user = await requireRole("ORGANIZER");

  const gigs = await prisma.gig.findMany({
    where: { organizerId: user.id },
    include: {
      applications: {
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              style: true,
              crew: true,
              city: true,
              experience: true,
              socialHandle: true,
              skills: true,
              minJudgingPricePerDay: true,
              minWorkshopPricePerDay: true,
              gigAvailability: { orderBy: { dateFrom: "asc" } },
            },
          },
          agreement: {
            select: { id: true, status: true, offerAmount: true, paymentStatus: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <Link
        href="/organizer"
        className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
      >
        &larr; Back to console
      </Link>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            Freelance work
          </p>
          <h1 className="font-display text-display-lg uppercase">Hire the floor.</h1>
          <p className="mt-sm text-body-sm text-ink-muted">
            Post gigs and review applications from artists on the marketplace.
          </p>
        </div>
        <SignOutButton />
      </div>

      <GigManager gigs={gigs} />

      <section className="mt-section">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">Messages</p>
        <div className="mt-lg">
          <MessagesPanel />
        </div>
      </section>
    </main>
  );
}
