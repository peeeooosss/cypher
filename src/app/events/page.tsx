import Link from "next/link";
import { EventStatus, EventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { EventCard } from "@/components/event-card";
import { StateFilter } from "@/components/state-filter";
import { prisma } from "@/lib/prisma";
import { INDIAN_STATES } from "@/lib/states";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; type?: string; state?: string }>;

type TypeFilter = {
  label: string;
  key: string;
  eventType?: EventType | EventType[];
};

const TYPE_FILTERS: TypeFilter[] = [
  { label: "All", key: "" },
  { label: "Battles", key: "battles", eventType: EventType.UNDERGROUND_BATTLE },
  { label: "Competitions", key: "competitions", eventType: [EventType.DANCE_COMPETITION, EventType.MUSIC_COMPETITION] },
  { label: "Workshops", key: "workshops", eventType: EventType.WORKSHOP },
];

function buildHref(base: Record<string, string | undefined>, overrides: Record<string, string | undefined>): string {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/events?${qs}` : "/events";
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status, type, state } = await searchParams;

  const statusFilter = status ? (status.toUpperCase() as EventStatus) : undefined;
  const typeFilter = TYPE_FILTERS.find((t) => t.key === type);
  const stateFilter = state && INDIAN_STATES.includes(state as (typeof INDIAN_STATES)[number]) ? state : undefined;

  const eventTypeFilter = typeFilter?.eventType
    ? Array.isArray(typeFilter.eventType)
      ? { in: typeFilter.eventType }
      : typeFilter.eventType
    : undefined;

  const where: Prisma.EventWhereInput = {
    status: statusFilter
      ? statusFilter
      : { in: [EventStatus.PUBLISHED, EventStatus.LIVE, EventStatus.COMPLETED] },
    ...(eventTypeFilter ? { eventType: eventTypeFilter } : {}),
    ...(stateFilter ? { state: { equals: stateFilter, mode: "insensitive" } } : {}),
  };

  const events = await prisma.event.findMany({
    where,
    select: {
      id: true,
      title: true,
      slug: true,
      venue: true,
      city: true,
      state: true,
      startsAt: true,
      status: true,
      eventType: true,
      posterUrl: true,
      categories: {
        select: { id: true, name: true, prizePool: { select: { totalAmount: true, currency: true } } },
        orderBy: { name: "asc" },
        take: 4,
      },
    },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }],
  });

  const tabs = [
    { label: "All", href: buildHref({ status: "", type, state }, { status: "" }), active: !statusFilter },
    { label: "Live", href: buildHref({ status, type, state }, { status: EventStatus.LIVE }), active: statusFilter === EventStatus.LIVE },
    { label: "Upcoming", href: buildHref({ status, type, state }, { status: EventStatus.PUBLISHED }), active: statusFilter === EventStatus.PUBLISHED },
    { label: "Completed", href: buildHref({ status, type, state }, { status: EventStatus.COMPLETED }), active: statusFilter === EventStatus.COMPLETED },
  ];

  const current = { status, type, state };

  return (
    <main className="min-h-screen bg-paper">
      <section className="mx-auto max-w-7xl px-md py-section md:px-xl">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Browse</p>
        <h1 className="mt-lg font-display text-display-lg uppercase">Events</h1>
        <p className="mt-md max-w-2xl text-body-md text-ink-muted">
          Find battles, competitions, and workshops from the underground community.
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

        <div className="mt-md flex flex-wrap items-center gap-sm">
          <div className="flex flex-wrap gap-sm">
            {TYPE_FILTERS.map((filter) => (
              <Link
                key={filter.key}
                href={buildHref(current, { type: filter.key })}
                className={`border px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors ${
                  type === filter.key
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-ink-muted hover:border-accent hover:text-ink"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
          <StateFilter current={state ?? ""} status={status} type={type} />
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
