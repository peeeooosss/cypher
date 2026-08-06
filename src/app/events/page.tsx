import Link from "next/link";
import { EventStatus } from "@/generated/prisma/enums";
import { EventCard } from "@/components/event-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status } = await searchParams;
  const filter = status ? (status.toUpperCase() as EventStatus) : undefined;

  const where = filter
    ? { status: filter }
    : { status: { in: [EventStatus.PUBLISHED, EventStatus.LIVE, EventStatus.COMPLETED] } };

  const events = await prisma.event.findMany({
    where,
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
    orderBy: [{ status: "asc" }, { startsAt: "asc" }],
  });

  const tabs = [
    { label: "All", href: "/events", active: !filter },
    { label: "Live", href: "/events?status=LIVE", active: filter === EventStatus.LIVE },
    { label: "Upcoming", href: "/events?status=PUBLISHED", active: filter === EventStatus.PUBLISHED },
    { label: "Completed", href: "/events?status=COMPLETED", active: filter === EventStatus.COMPLETED },
  ];

  return (
    <main className="min-h-screen bg-paper">
      <section className="mx-auto max-w-7xl px-md py-section md:px-xl">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Browse</p>
        <h1 className="mt-lg font-display text-display-lg uppercase">Events</h1>
        <p className="mt-md max-w-2xl text-body-md text-ink-muted">
          Find upcoming battles, live cyphers, and past events from the underground community.
        </p>

        <div className="mt-xl flex flex-wrap gap-sm border-b border-line pb-sm">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`border px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors ${
                tab.active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-ink-muted hover:border-accent hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {events.length === 0 ? (
          <div className="mt-lg border border-line p-xl">
            <p className="text-body-md text-ink-muted">No events found for this selection.</p>
            <Link href="/events" className="mt-md inline-block border border-line px-md py-sm text-body-sm uppercase hover:border-accent">
              View all events
            </Link>
          </div>
        ) : (
          <div className="mt-lg grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}