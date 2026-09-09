import Link from "next/link";
import { EventStatus, EventType } from "@/generated/prisma/enums";
import { StatusBadge } from "@/components/status-badge";
import { formatDateShort } from "@/lib/format";
import { EVENT_TYPE_LABELS, formatLabel, isWorkshopType } from "@/lib/event-types";

type ScheduleItemSummary = { id: string; title: string; startTime: Date };
type NoticeSummary = { id: string; title: string; publishedAt: Date };

type EventCardData = {
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

export function EventCard({ event }: { event: EventCardData }) {
  const detailText = excerpt(event.eventDetails ?? event.description, 160);
  const scheduleCount = event._count?.scheduleItems ?? event.scheduleItems?.length ?? 0;
  const noticeCount = event._count?.notices ?? event.notices?.length ?? 0;
  const nextItem = event.scheduleItems?.[0];

  return (
    <div className="group flex flex-col border border-line bg-paper-soft transition-colors hover:border-accent">
      <Link href={`/events/${event.slug}`} className="block flex-1">
        {event.posterUrl ? (
          <div className="relative aspect-[4/3] overflow-hidden border-b border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.posterUrl} alt={`${event.title} poster`} className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="flex items-center gap-sm border-b border-line px-md py-xs">
          <StatusBadge status={event.status} />
          {event.eventType && (
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-accent">
              {EVENT_TYPE_LABELS[event.eventType as EventType] ?? event.eventType}
            </span>
          )}
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
            {formatDateShort(event.startsAt)}
          </span>
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
          {event.googleMapsUrl && (
            <a
              href={event.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-xs inline-flex items-center gap-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-accent hover:underline"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              Get Directions
            </a>
          )}

          {detailText && (
            <p className="mt-md border-l-2 border-accent pl-sm text-body-sm leading-relaxed text-ink-muted whitespace-pre-wrap line-clamp-3">
              {detailText}
            </p>
          )}

          {(event.accommodationAvailable || event.foodAvailable) && (
            <div className="mt-md flex flex-wrap gap-xs">
              {event.accommodationAvailable && (
                <span className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                  Accommodation
                </span>
              )}
              {event.foodAvailable && (
                <span className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                  Food
                </span>
              )}
            </div>
          )}

          {event.categories && event.categories.length > 0 && (
            <div className="mt-md flex flex-wrap gap-xs">
              {event.categories.slice(0, 3).map((cat) => (
                <span key={cat.id} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
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
            const total = event.categories.reduce((s, c) => s + (c.prizePool?.totalAmount ?? 0), 0);
            if (total <= 0) return null;
            return (
              <p className="mt-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-green-600">
                ₹{total.toLocaleString("en-IN")} prize pool
              </p>
            );
          })()}
        </div>
      </Link>
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
    </div>
  );
}