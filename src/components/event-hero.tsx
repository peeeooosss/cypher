import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { EventPoster } from "@/components/event-poster";
import { EventCountdown } from "@/components/event-countdown";
import { CopyLinkButton } from "@/components/copy-link-button";
import { formatDate } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/event-types";
import type { EventStatus, EventType } from "@/generated/prisma/enums";

export type EventHeroData = {
  title: string;
  description: string | null;
  status: EventStatus;
  eventType: EventType | null;
  city: string | null;
  state: string | null;
  venue: string | null;
  googleMapsUrl: string | null;
  posterUrl: string | null;
  slug: string;
  startsAt: Date;
  organizerName: string | null;
  studioName: string | null;
  studioLogoUrl: string | null;
  studioSince: string | null;
  registerHref: string | null;
  registerLabel: string;
  resultsHref: string | null;
  resultsLabel: string | null;
  liveHref: string | null;
};

export function EventHero({ event }: { event: EventHeroData }) {
  // EventCountdown hides itself once the start time has passed.
  const showCountdown = event.status === "PUBLISHED";

  return (
    <header className="relative overflow-hidden border-b border-line">
      {event.posterUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.posterUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-50 blur-2xl saturate-150"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-paper/60 via-paper/85 to-paper" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--accent)_0%,transparent_45%)] opacity-20" />
      )}

      <div className="relative mx-auto max-w-7xl px-md py-section md:px-xl">
        <div className="grid items-start gap-xl lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div className="mx-auto w-full max-w-sm lg:mx-0">
            <EventPoster
              posterUrl={event.posterUrl}
              title={event.title}
              fit="contain"
              eager
              className="w-full rounded-lg border border-line shadow-raised"
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-sm">
              <StatusBadge status={event.status} />
              {event.eventType ? (
                <span className="border border-line-strong px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-ink">
                  {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                </span>
              ) : null}
              {[event.city, event.state].filter(Boolean).length > 0 ? (
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                  {[event.city, event.state].filter(Boolean).join(", ")}
                </span>
              ) : null}
            </div>

            <h1 className="mt-md font-display text-display-xl uppercase leading-[1.02] tracking-[-0.01em] md:text-[4rem]">
              {event.title}
            </h1>

            {event.description ? (
              <p className="mt-md max-w-2xl text-body-lg leading-relaxed text-ink-muted">
                {event.description}
              </p>
            ) : null}

            <dl className="mt-lg grid gap-md border-y border-line py-md sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-muted">Date</dt>
                <dd className="mt-xs text-body-md font-bold tabular-nums">{formatDate(event.startsAt)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-muted">Venue</dt>
                <dd className="mt-xs text-body-md font-bold">
                  {event.venue ?? "To be announced"}
                  {event.googleMapsUrl ? (
                    <a
                      href={event.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-sm font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-accent hover:underline"
                    >
                      Directions
                    </a>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-muted">
                  Organized by
                </dt>
                <dd className="mt-xs flex items-center gap-sm">
                  {event.studioLogoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={event.studioLogoUrl}
                      alt="Studio logo"
                      className="h-8 w-8 rounded-full border border-line object-cover"
                    />
                  ) : null}
                  <span className="text-body-md font-bold">
                    {event.studioName ?? event.organizerName ?? "Anonymous"}
                    {event.studioSince ? (
                      <span className="ml-xs font-mono text-[0.65rem] font-normal uppercase text-ink-muted">
                        · Est. {event.studioSince}
                      </span>
                    ) : null}
                  </span>
                </dd>
              </div>
            </dl>

            <div className="mt-lg flex flex-col gap-sm sm:flex-row sm:flex-wrap sm:items-center">
              {event.registerHref ? (
                <Link
                  href={event.registerHref}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-8 text-button-md text-accent-contrast transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  {event.registerLabel}
                </Link>
              ) : null}
              {event.liveHref ? (
                <Link
                  href={event.liveHref}
                  className="inline-flex h-12 items-center justify-center gap-sm rounded-md border border-accent bg-accent/10 px-8 text-button-md text-accent transition-all hover:bg-accent hover:text-paper active:scale-[0.98]"
                >
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-current" />
                  Watch live
                </Link>
              ) : null}
              {event.resultsHref && event.resultsLabel ? (
                <Link
                  href={event.resultsHref}
                  className="inline-flex h-12 items-center justify-center rounded-md border border-line-strong px-8 text-button-md text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  {event.resultsLabel}
                </Link>
              ) : null}
              <CopyLinkButton
                path={`/events/${event.slug}`}
                label="Share"
                copiedLabel="Copied"
                title="Copy link to this event"
                className="inline-flex h-12 items-center justify-center rounded-md px-6 font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink-muted transition-colors hover:text-accent"
              />
            </div>

            {showCountdown ? (
              <div className="mt-lg">
                <EventCountdown startsAt={event.startsAt} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
