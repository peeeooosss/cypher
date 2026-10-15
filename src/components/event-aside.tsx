import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { CopyLinkButton } from "@/components/copy-link-button";
import { formatDate } from "@/lib/format";
import type { EventStatus } from "@/generated/prisma/enums";

export type EventAsideData = {
  status: EventStatus;
  slug: string;
  startsAt: Date;
  venue: string | null;
  city: string | null;
  registrationDeadline: Date | string | null;
  categoryCount: number;
  totalPrize: number;
  registeredText: string | null;
  registerHref: string | null;
  registerLabel: string;
  standingsHref: string | null;
  liveHref: string | null;
};

export function EventAside({ event }: { event: EventAsideData }) {
  return (
    <aside className="h-fit space-y-md lg:sticky lg:top-16">
      <div className="rounded-lg border border-line bg-paper-soft p-lg shadow-card">
        <div className="flex items-center justify-between gap-sm">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted">Status</p>
          <StatusBadge status={event.status} />
        </div>
        {event.totalPrize > 0 ? (
          <div className="mt-md border-t border-line pt-md">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted">
              Total prize pool
            </p>
            <p className="mt-xs font-display text-display-md tabular-nums text-accent">
              ₹{event.totalPrize.toLocaleString("en-IN")}
            </p>
          </div>
        ) : null}
        <div className="mt-md space-y-sm border-t border-line pt-md text-body-sm">
          <div className="flex justify-between gap-md">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">Date</span>
            <span className="text-right font-bold tabular-nums">{formatDate(event.startsAt)}</span>
          </div>
          {event.venue ? (
            <div className="flex justify-between gap-md">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">Venue</span>
              <span className="text-right font-bold">{event.venue}</span>
            </div>
          ) : null}
          {event.registrationDeadline ? (
            <div className="flex justify-between gap-md">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                Entries close
              </span>
              <span className="text-right font-bold tabular-nums">
                {new Date(event.registrationDeadline).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between gap-md">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
              Categories
            </span>
            <span className="text-right font-bold tabular-nums">{event.categoryCount}</span>
          </div>
        </div>
      </div>

      {event.registerHref ? (
        <div className="rounded-lg border border-accent/50 bg-accent/10 p-lg text-center">
          <p className="font-display text-title-md uppercase text-accent">Lock your spot</p>
          {event.registeredText ? (
            <p className="mt-xs text-body-sm text-ink-muted">{event.registeredText}</p>
          ) : null}
          <Link
            href={event.registerHref}
            className="mt-md block rounded-md bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-85"
          >
            {event.registerLabel}
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-sm">
        {event.liveHref ? (
          <Link
            href={event.liveHref}
            className="flex-1 rounded-md border border-accent px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent hover:text-paper"
          >
            View live
          </Link>
        ) : null}
        {event.standingsHref ? (
          <Link
            href={event.standingsHref}
            className="flex-1 rounded-md border border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Results
          </Link>
        ) : null}
        <CopyLinkButton
          path={`/events/${event.slug}`}
          label="Share"
          copiedLabel="Copied"
          title="Copy link to this event"
          className="flex-1 rounded-md border border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-accent hover:text-accent"
        />
      </div>
    </aside>
  );
}
