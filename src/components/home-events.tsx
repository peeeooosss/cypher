"use client";

import { useState } from "react";
import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import type { EventCardData } from "@/components/event-card";

type HomeEventsProps = {
  liveEvents: EventCardData[];
  upcomingEvents: EventCardData[];
  closedEvents: EventCardData[];
};

const TABS = [
  { id: "live", label: "Live now" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past events" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function HomeEvents({ liveEvents, upcomingEvents, closedEvents }: HomeEventsProps) {
  const [active, setActive] = useState<TabId>(liveEvents.length > 0 ? "live" : "upcoming");
  const counts: Record<TabId, number> = {
    live: liveEvents.length,
    upcoming: upcomingEvents.length,
    past: closedEvents.length,
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-md py-section md:px-xl">
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">The scene</p>
          <h2 className="mt-md font-display text-display-md uppercase tracking-[-0.03em]">
            Events happening now
          </h2>
        </div>
      </div>

      <div className="mt-lg flex overflow-x-auto gap-1 border-b border-line">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              disabled={counts[tab.id] === 0 && !(tab.id === "upcoming")}
              className={`relative shrink-0 px-lg py-md font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors ${
                isActive ? "text-accent" : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
              <span className="ml-xs text-ink-muted">({counts[tab.id]})</span>
              {isActive && <span className="absolute inset-x-lg bottom-0 h-0.5 bg-accent" />}
            </button>
          );
        })}
      </div>

      {active === "live" && (
        <>
          <div className="mt-lg grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {liveEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {liveEvents.map((event) => (
            <div className="mt-lg" key={`${event.id}-board`}>
              <LiveLeaderboard eventId={event.id} title={`${event.title} — Standings`} compact />
            </div>
          ))}
        </>
      )}

      {active === "upcoming" && (
        upcomingEvents.length === 0 ? (
          <p className="mt-lg border border-line p-lg text-body-sm text-ink-muted">
            No upcoming events scheduled yet.
          </p>
        ) : (
          <div className="mt-lg grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )
      )}

      {active === "past" && (
        closedEvents.length === 0 ? (
          <p className="mt-lg border border-line p-lg text-body-sm text-ink-muted">
            No completed events yet.
          </p>
        ) : (
          <div className="mt-lg grid gap-md sm:grid-cols-2 lg:grid-cols-4">
            {closedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )
      )}

      <div className="mt-lg flex justify-center">
        <Link
          href="/events"
          className="border border-line px-lg py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Browse all events →
        </Link>
      </div>
    </section>
  );
}