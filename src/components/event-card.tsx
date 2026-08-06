import Link from "next/link";
import { EventStatus } from "@/generated/prisma/enums";
import { StatusBadge } from "@/components/status-badge";
import { formatDateShort } from "@/lib/format";

type EventCardData = {
  id: string;
  title: string;
  slug: string;
  venue: string | null;
  city: string | null;
  startsAt: Date;
  status: EventStatus;
  _count?: { categories: number };
  categories?: { id: string; name: string }[];
};

export function EventCard({ event }: { event: EventCardData }) {
  return (
    <div className="group border border-line bg-paper-soft transition-colors hover:border-accent">
      <Link href={`/events/${event.slug}`} className="block">
        <div className="flex items-center gap-sm border-b border-line px-md py-xs">
          <StatusBadge status={event.status} />
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
            {formatDateShort(event.startsAt)}
          </span>
        </div>
        <div className="px-md py-lg">
          <h2 className="font-display text-title-md uppercase leading-tight transition-colors group-hover:text-accent">
            {event.title}
          </h2>
          {(event.city || event.venue) && (
            <p className="mt-xs text-body-sm text-ink-muted">
              {event.city ?? ""}
              {event.city && event.venue ? " / " : ""}
              {event.venue ?? ""}
            </p>
          )}
          {event.categories && event.categories.length > 0 && (
            <div className="mt-md flex flex-wrap gap-xs">
              {event.categories.slice(0, 3).map((cat) => (
                <span key={cat.id} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                  {cat.name}
                </span>
              ))}
              {event.categories.length > 3 && (
                <span className="font-mono text-[0.6rem] text-ink-muted">
                  +{event.categories.length - 3} more
                </span>
              )}
            </div>
          )}
          {event._count && (
            <p className="mt-md font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
              {event._count.categories} {event._count.categories === 1 ? "category" : "categories"}
            </p>
          )}
        </div>
      </Link>
      {(event.status === EventStatus.PUBLISHED || event.status === EventStatus.LIVE) && (
        <Link
          href={`/events/${event.slug}/register`}
          className="block border-t border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-paper"
        >
          Register for this event
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