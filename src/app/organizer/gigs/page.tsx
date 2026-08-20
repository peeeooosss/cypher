import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { GigManager } from "@/components/gig-manager";
import { MessagesPanel } from "@/components/messages-panel";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrganizerGigsPage() {
  const user = await requireRole("ORGANIZER");

  const [gigs, unreadMessages] = await Promise.all([
    prisma.gig.findMany({
      where: { organizerId: user.id },
      include: {
        applications: {
          include: {
            artist: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
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
    }),
    prisma.message.count({
      where: {
        conversation: { organizerId: user.id },
        senderId: { not: user.id },
        readAt: null,
      },
    }),
  ]);

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
        <div className="flex items-center justify-between">
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">
            Messages
          </p>
          {unreadMessages > 0 ? (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-xs font-mono text-[0.65rem] font-bold uppercase text-paper">
              {unreadMessages} unread
            </span>
          ) : null}
        </div>
        <div className="mt-lg">
          <MessagesPanel role="ORGANIZER" />
        </div>
      </section>
    </main>
  );
}
