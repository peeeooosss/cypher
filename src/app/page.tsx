import Link from "next/link";
import { EventStatus } from "@/generated/prisma/enums";
import { EventCard } from "@/components/event-card";
import { ArtistSlider } from "@/components/artist-slider";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const where = {
    status: { in: [EventStatus.PUBLISHED, EventStatus.LIVE, EventStatus.COMPLETED] },
  };

  const [liveEvents, upcomingEvents, closedEvents] = await Promise.all([
    prisma.event.findMany({
      where: { ...where, status: EventStatus.LIVE },
      select: {
        id: true,
        title: true,
        slug: true,
        venue: true,
        city: true,
        startsAt: true,
        status: true,
        eventType: true,
        posterUrl: true,
        categories: { select: { id: true, name: true }, orderBy: { name: "asc" }, take: 4 },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.event.findMany({
      where: { ...where, status: EventStatus.PUBLISHED },
      select: {
        id: true,
        title: true,
        slug: true,
        venue: true,
        city: true,
        startsAt: true,
        status: true,
        eventType: true,
        posterUrl: true,
        categories: { select: { id: true, name: true }, orderBy: { name: "asc" }, take: 4 },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    prisma.event.findMany({
      where: { ...where, status: EventStatus.COMPLETED },
      select: {
        id: true,
        title: true,
        slug: true,
        venue: true,
        city: true,
        startsAt: true,
        status: true,
        eventType: true,
        posterUrl: true,
        _count: { select: { categories: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <main className="min-h-screen bg-paper">
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-section md:grid-cols-[1fr_0.42fr]">
          <div className="px-md pt-section md:px-xl">
            <p className="font-mono text-center text-body-sm uppercase tracking-[0.18em] text-accent sm:text-left">
              Underground artist network
            </p>
            <h1 className="mt-lg font-display text-center text-display-xl uppercase tracking-[-0.03em] leading-tight text-ink sm:text-left md:max-w-2xl">
              The floor is calling.
            </h1>
            <p className="mt-md text-center text-body-md text-ink-muted sm:text-left sm:max-w-2xl">
              Find the next cypher. Enter the battle. Build your name. CYPHR connects
              dancers, choreographers, DJs, guitarists, drummers, and performers to
              the underground community.
            </p>
            <div className="mt-xl flex flex-wrap justify-center gap-sm sm:justify-start">
              <Link
                href="/events"
                className="border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper transition-opacity hover:opacity-80"
              >
                Browse events
              </Link>
              <Link
                href="/login"
                className="border border-line px-lg py-sm text-button-md font-bold uppercase text-ink transition-colors hover:border-accent"
              >
                Sign in
              </Link>
            </div>
          </div>

          <aside className="flex items-start border-t border-line bg-paper-soft px-md pt-lg md:border-t-0 md:border-l md:px-xl">
            <div className="w-full">
              <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">
                Built for every stage
              </p>
              <ul className="mt-lg space-y-md">
                <li className="border-b border-line pb-sm">
                  <span className="text-accent">01 — </span>Battles & cyphers
                </li>
                <li className="border-b border-line pb-sm">
                  <span className="text-accent">02 — </span>Marketplace
                </li>
                <li className="border-b border-line pb-sm">
                  <span className="text-accent">03 — </span>Live scoring
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* For organizers / For artists */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-center text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted md:text-left">
            Built for the whole scene
          </p>
          <div className="mt-lg grid gap-md md:grid-cols-2">
            <Link
              href="/for-organizers"
              className="group flex flex-col justify-between border border-line bg-paper-soft p-xl transition-colors hover:border-accent"
            >
              <div>
                <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
                  For organizers
                </p>
                <h2 className="mt-md font-display text-display-lg uppercase">
                  Run your event. Hire the best.
                </h2>
                <p className="mt-md max-w-prose text-body-sm leading-relaxed text-ink-muted">
                  Create and market your competition to thousands of artists, take
                  online payments, and hire the exact talent your stage needs.
                </p>
              </div>
              <span className="mt-lg font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted transition-colors group-hover:text-accent">
                What organizers get —
              </span>
            </Link>
            <Link
              href="/for-artists"
              className="group flex flex-col justify-between border border-line bg-paper-soft p-xl transition-colors hover:border-accent"
            >
              <div>
                <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
                  For artists
                </p>
                <h2 className="mt-md font-display text-display-lg uppercase">
                  Compete. Rank. Get hired.
                </h2>
                <p className="mt-md max-w-prose text-body-sm leading-relaxed text-ink-muted">
                  Never miss a competition, register in minutes, climb the live
                  leaderboard, and land paid gigs and freelance work.
                </p>
              </div>
              <span className="mt-lg font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted transition-colors group-hover:text-accent">
                What artists get —
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Artist slider */}
      <ArtistSlider />

      {/* Live now */}
      {liveEvents.length > 0 && (
        <section className="mx-auto max-w-7xl px-md py-lg md:px-xl">
          <div className="flex items-center gap-md border-b border-line pb-sm">
            <span className="h-sm w-sm bg-accent" />
            <h2 className="font-display text-title-md uppercase tracking-[-0.04em] text-accent">Live now</h2>
          </div>
          <div className="mt-md grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {liveEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {liveEvents.map((event) => (
            <div className="mt-lg" key={`${event.id}-board`}>
              <LiveLeaderboard eventId={event.id} title={`${event.title} — Standings`} compact />
            </div>
          ))}
        </section>
      )}

      {/* Upcoming */}
      <section className="mx-auto max-w-7xl px-md py-lg md:px-xl">
        <div className="flex items-center justify-between border-b border-line pb-sm">
          <h2 className="font-display text-title-md uppercase tracking-[-0.04em]">Upcoming</h2>
          <Link href="/events?status=PUBLISHED" className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:text-accent">
            View all
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="mt-md border border-line p-lg text-body-sm text-ink-muted">No upcoming events scheduled yet.</p>
        ) : (
          <div className="mt-md grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Completed */}
      <section className="mx-auto max-w-7xl px-md py-lg md:px-xl">
        <div className="flex items-center justify-between border-b border-line pb-sm">
          <h2 className="font-display text-title-md uppercase tracking-[-0.04em] text-ink-muted">Past events</h2>
          <Link href="/events?status=COMPLETED" className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:text-accent">
            View all
          </Link>
        </div>
        {closedEvents.length === 0 ? (
          <p className="mt-md border border-line p-lg text-body-sm text-ink-muted">No completed events yet.</p>
        ) : (
          <div className="mt-md grid gap-md sm:grid-cols-2 lg:grid-cols-4">
            {closedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}