import Link from "next/link";
import { EventStatus, EventType } from "@/generated/prisma/enums";
import { StatusBadge } from "@/components/status-badge";
import { EventCardLeaderboard } from "@/components/event-card-leaderboard";
import { EventPoster } from "@/components/event-poster";
import { formatDateShort } from "@/lib/format";
import { EVENT_TYPE_LABELS, formatLabel, isWorkshopType } from "@/lib/event-types";

type ScheduleItemSummary = { id: string; title: string; startTime: Date };
type NoticeSummary = { id: string; title: string; publishedAt: Date };

export type EventCardData = {
  id: string;
  title: string;
  slug: string;
  venue: string | null;
  city: string | null;
  state?: string | null;
  startsAt: Date;
  status: EventStatus;
  eventType?: string | null;
  posterUrl?: string | null;
  googleMapsUrl?: string | null;
  showPublicLeaderboard?: boolean;
  description?: string | null;
  eventDetails?: string | null;
  accommodationAvailable?: boolean;
  foodAvailable?: boolean;
  scheduleItems?: ScheduleItemSummary[];
  notices?: NoticeSummary[];
  _count?: { categories: number; scheduleItems?: number; notices?: number };
  categories?: { id: string; name: string; format?: string | null; prizePool?: { totalAmount: number; currency: string } | null }[];
};

function excerpt(text: string | null | undefined, max = 180): string | null {
  if (!text) return null;
  const cleaned = text.trim();
  if (!cleaned) return null;
  return cleaned.length > max ? `${cleaned.slice(0, max).trimEnd()}…` : cleaned;
}

export function EventCard({ event, isSignedIn = false }: { event: EventCardData; isSignedIn?: boolean }) {
  const detailText = excerpt(event.eventDetails ?? event.description, 160);
  const scheduleCount = event._count?.scheduleItems ?? event.scheduleItems?.length ?? 0;
  const noticeCount = event._count?.notices ?? event.notices?.length ?? 0;
  const nextItem = event.scheduleItems?.[0];
  const isCompleted = event.status === EventStatus.COMPLETED;

  const isLive = event.status === EventStatus.LIVE;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-line bg-paper-soft shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-raised">
      <Link href={`/events/${event.slug}`} className="block flex-1">
        <div className="relative border-b border-line">
          <EventPoster
            posterUrl={event.posterUrl}
            title={event.title}
            fit="cover"
            className="aspect-[4/5] w-full"
            imgClassName="transition-transform duration-300 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-sm bg-gradient-to-b from-black/55 to-transparent p-sm">
            <StatusBadge status={event.status} />
            {isLive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.15em] text-white">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white" />
                Live
              </span>
            ) : null}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-sm bg-gradient-to-t from-black/60 to-transparent p-sm">
            <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-white drop-shadow">
              {formatDateShort(event.startsAt)}
            </span>
            {event.eventType ? (
              <span className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.15em] text-white/90 drop-shadow">
                {EVENT_TYPE_LABELS[event.eventType as EventType] ?? event.eventType}
              </span>
            ) : null}
          </div>
        </div>
        <div className="px-md py-lg">
          <h2 className="font-display text-title-md uppercase leading-tight transition-colors group-hover:text-accent">
            {event.title}
          </h2>
          {(event.city || event.state || event.venue) && (
            <p className="mt-xs text-body-sm text-ink-muted">
              {[event.city, event.state, event.venue].filter(Boolean).join(" / ")}
            </p>
          )}

          {detailText && (
            <p className="mt-md border-l-2 border-accent pl-sm text-body-sm leading-relaxed text-ink-muted whitespace-pre-wrap line-clamp-3">
              {detailText}
            </p>
          )}

          {(event.accommodationAvailable || event.foodAvailable) && (
            <div className="mt-md flex flex-wrap gap-xs">
              {event.accommodationAvailable && (
                <span className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted transition-colors group-hover:border-accent/40">
                  Accommodation
                </span>
              )}
              {event.foodAvailable && (
                <span className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted transition-colors group-hover:border-accent/40">
                  Food
                </span>
              )}
            </div>
          )}

          {event.categories && event.categories.length > 0 && (
            <div className="mt-md flex flex-wrap gap-xs">
              {event.categories.slice(0, 3).map((cat) => (
                <span key={cat.id} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted transition-colors group-hover:border-accent/40">
                  {cat.name}{cat.format ? ` · ${formatLabel(cat.format)}` : ""}
                </span>
              ))}
              {event.categories.length > 3 && (
                <span className="font-mono text-[0.6rem] text-ink-muted">
                  +{event.categories.length - 3} more
                </span>
              )}
            </div>
          )}

          {scheduleCount > 0 && (
            <p className="mt-md flex items-center gap-sm font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {scheduleCount} schedule {scheduleCount === 1 ? "item" : "items"}
              {nextItem
                ? ` · Next: ${nextItem.title} — ${new Date(nextItem.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </p>
          )}

          {event.notices && event.notices.length > 0 && (
            <p className="mt-sm flex items-start gap-sm border border-accent bg-accent/5 px-sm py-sm font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
              <svg className="mt-px h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <span className="line-clamp-2">{noticeCount > 1 ? `${event.notices[0].title} (+${noticeCount - 1} more)` : event.notices[0].title}</span>
            </p>
          )}

          {event._count && (
            <p className="mt-md font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
              {event._count.categories} {event._count.categories === 1 ? "category" : "categories"}
            </p>
          )}
          {event.categories && (() => {
            let total = event.categories.reduce((s, c) => s + (c.prizePool?.totalAmount ?? 0), 0);
            if (event.slug === "born-to-dance") total = 100000;
            if (total <= 0) return null;
            return (
              <p className="mt-md inline-block border border-accent/30 bg-accent/10 px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-accent">
                ₹{total.toLocaleString("en-IN")} prize pool
              </p>
            );
          })()}
                    {!isSignedIn && (event.status === EventStatus.PUBLISHED || event.status === EventStatus.LIVE) && (
            <Link
              href={`/login?callbackUrl=/events/${event.slug}/register`}
              className="mt-md block border border-accent bg-accent/10 px-md py-sm text-center font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent hover:text-paper"
            >
              Sign in as Artist to Register
            </Link>
          )}
        </div>
      </Link>
      {event.googleMapsUrl && (
        <a
          href={event.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-xs border-t border-line px-md py-sm font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-accent transition-colors hover:bg-accent/10"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          Get Directions
        </a>
      )}
      {(event.status === EventStatus.PUBLISHED || event.status === EventStatus.LIVE) && (
        <Link
          href={`/events/${event.slug}/register`}
          className="block border-t border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-paper"
        >
          {isWorkshopType(event.eventType) ? "Join this workshop" : "Register for this event"}
        </Link>
      )}
      {event.status === EventStatus.LIVE && (
        <Link
          href={`/events/${event.slug}/live`}
          className="block border-t border-line bg-accent px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
        >
          View live scores
        </Link>
      )}
      {isCompleted && <EventCardLeaderboard eventId={event.id} slug={event.slug} />}
    </div>
  );
}