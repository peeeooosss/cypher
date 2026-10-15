export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SocketProvider } from "@/components/socket-provider";
import { LiveSpectator } from "@/components/live-spectator";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { canViewLeaderboard } from "@/lib/leaderboard-access";

type PageParams = { params: Promise<{ slug: string }> };

export default async function EventLivePage({ params }: PageParams) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, title: true, status: true, city: true, venue: true, showPublicLeaderboard: true, organizerId: true },
  });

  if (!event) notFound();

  const allowed = await canViewLeaderboard(event.id, event);

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-sm px-md py-lg md:flex-row md:items-end md:px-xl">
          <div>
            <p className="font-mono text-body-sm uppercase text-accent">Live scores</p>
            <h1 className="mt-sm font-display text-display-lg uppercase">{event.title}</h1>
            <p className="mt-sm text-body-sm text-ink-muted">
              {event.city ?? ""}
              {event.city && event.venue ? " / " : ""}
              {event.venue ?? ""}
            </p>
          </div>
          <Link
            href={`/events/${slug}`}
            className="border border-line px-lg py-sm text-body-sm font-bold uppercase text-ink transition-colors hover:border-accent"
          >
            Event details
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-lg px-md py-lg md:px-xl">
        {!allowed ? (
          <div className="border border-line bg-paper-soft p-lg text-center">
            <p className="font-display text-title-md uppercase">Results paused</p>
            <p className="mt-sm text-body-sm text-ink-muted">
              The organizer has hidden live results for now. Registered artists can still see their
              own scores on their dashboard.
            </p>
          </div>
        ) : (
          <>
            <SocketProvider>
              <LiveSpectator eventId={event.id} eventTitle={event.title} />
            </SocketProvider>
            <LiveLeaderboard eventId={event.id} title="Standings" />
          </>
        )}
      </div>
    </main>
  );
}
