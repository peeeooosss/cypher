import Link from "next/link";
import { EventStatus } from "@/generated/prisma/enums";
import { EventCard } from "@/components/event-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const where = {
    status: { in: [EventStatus.PUBLISHED, EventStatus.LIVE, EventStatus.COMPLETED] },
  };

  const [liveEvents, upcomingEvents, closedEvents] = await Promise.all([
    prisma.event.findMany({
      where: { ...where, status: EventStatus.LIVE },
      include: { categories: { select: { id: true, name: true }, orderBy: { name: "asc" }, take: 4 } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.event.findMany({
      where: { ...where, status: EventStatus.PUBLISHED },
      include: { categories: { select: { id: true, name: true }, orderBy: { name: "asc" }, take: 4 } },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    prisma.event.findMany({
      where: { ...where, status: EventStatus.COMPLETED },
      include: { _count: { select: { categories: true } } },
      orderBy: { startsAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <main className="min-h-screen bg-paper">
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[1fr_0.42fr]">
          <div className="flex flex-col justify-between px-md py-section md:border-r md:border-line md:px-xl">
            <div>
              <p className="mb-lg font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
                Underground dance network
              </p>
              <h1 className="max-w-5xl font-display text-display-xl uppercase text-ink">
                The floor is
                <br />
                <span className="text-accent">calling.</span>
              </h1>
            </div>

            <div className="mt-section max-w-xl">
              <p className="text-body-md text-ink-muted">
                Find the next cypher. Enter the battle. Build your name. CallOut connects
                artists, organizers, judges, and the people who keep the floor alive.
              </p>
              <div className="mt-xl flex flex-wrap gap-sm">
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
          </div>

          <aside className="flex flex-col justify-end bg-paper-soft px-md py-xl md:px-lg">
            <div className="border-t border-line pt-md">
              <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">
                Built for the circle
              </p>
              <ul className="mt-lg space-y-md font-display text-title-md uppercase">
                <li className="flex items-baseline justify-between border-b border-line pb-sm">
                  <span className="text-accent">01</span>
                  <span>Battle</span>
                </li>
                <li className="flex items-baseline justify-between border-b border-line pb-sm">
                  <span className="text-accent">02</span>
                  <span>Market</span>
                </li>
                <li className="flex items-baseline justify-between border-b border-line pb-sm">
                  <span className="text-accent">03</span>
                  <span>Live score</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

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

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-sm px-md py-lg md:flex-row md:px-xl">
          <p className="font-display text-[0.8rem] uppercase tracking-[-0.05em]">
            Call<span className="text-accent">/</span>Out
          </p>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-ink-muted">
            Underground dance battle platform
          </p>
        </div>
      </footer>
    </main>
  );
}