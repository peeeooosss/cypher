export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EventStatus } from "@/generated/prisma/enums";

type PageParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageParams) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug }, select: { title: true } });
  return { title: event ? `${event.title} — Standings` : "Standings" };
}

export default async function EventStandingsPage({ params }: PageParams) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, title: true, status: true, city: true, venue: true },
  });

  if (!event) notFound();

  const isLive = event.status === EventStatus.LIVE;
  const standingsPath = `/events/${slug}/standings`;

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-sm px-md py-lg md:flex-row md:items-end md:px-xl">
          <div>
            <p className="font-mono text-body-sm uppercase text-accent">
              {isLive ? "Live standings" : "Final standings"}
            </p>
            <h1 className="mt-sm font-display text-display-lg uppercase">{event.title}</h1>
            <p className="mt-sm text-body-sm text-ink-muted">
              {[event.city, event.venue].filter(Boolean).join(" / ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <CopyLinkButton
              path={standingsPath}
              label="Copy link"
              copiedLabel="Copied"
              title="Copy this standings link to share"
              className="border border-line px-lg py-sm text-body-sm font-bold uppercase text-ink transition-colors hover:border-accent"
            />
            <Link
              href={`/events/${slug}`}
              className="border border-line px-lg py-sm text-body-sm font-bold uppercase text-ink transition-colors hover:border-accent"
            >
              Event details
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-md py-lg md:px-xl">
        <LiveLeaderboard
          eventId={event.id}
          title={`${event.title} — ${isLive ? "Live standings" : "Final standings"}`}
          live={isLive}
        />
      </div>
    </main>
  );
}
