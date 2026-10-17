"use client";

import Link from "next/link";
import { useState } from "react";
import { formatLabel } from "@/lib/event-types";
import { ArtistScoreboard, type BattleMatchBreakdown, type RosterRound } from "@/components/artist-scoreboard";

type ScheduleItemSummary = { id: string; title: string; startTime: Date };
type NoticeSummary = { id: string; title: string; publishedAt: Date };

type MatchSummary = {
  id: string;
  round: number;
  position: number;
  status: string;
  redName: string;
  blueName: string;
  winnerName: string | null;
  iAmRed: boolean;
};

export function ArtistEventCard({
  eventTitle,
  categoryName,
  categoryFormat,
  eventSlug,
  isLive,
  entryFee,
  entryCurrency,
  paid,
  paidClaimedAt,
  isOwner,
  regId,
  eventId,
  eventAccommodation,
  eventFood,
  eventScheduleItems,
  eventNotices,
  eventScheduleCount,
  memberCount,
  matches,
  rosterRounds,
  battleMatches,
  wins,
  prizePool,
}: {
  eventTitle: string;
  categoryName: string;
  categoryFormat: string | null;
  eventSlug: string;
  isLive: boolean;
  entryFee: number | null;
  entryCurrency: string | null;
  paid: boolean;
  paidClaimedAt: Date | null;
  isOwner: boolean;
  regId: string;
  eventId: string;
  eventAccommodation: boolean;
  eventFood: boolean;
  eventScheduleItems: ScheduleItemSummary[];
  eventNotices: NoticeSummary[];
  eventScheduleCount: number;
  memberCount: number;
  matches: MatchSummary[];
  rosterRounds: RosterRound[];
  battleMatches: BattleMatchBreakdown[];
  wins: number;
  prizePool: { distribution: unknown; isPaid: boolean } | null;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className="border border-line bg-paper-soft p-lg transition-colors hover:border-accent/40 cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <h3 className="font-display text-title-md uppercase">{eventTitle}</h3>
          <p className="mt-xs text-body-sm text-ink-muted">{categoryName} · {formatLabel(categoryFormat)}</p>
        </div>
        <Link
          href={`/events/${eventSlug}${isLive ? "/live" : ""}`}
          className="border border-accent px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-accent hover:bg-accent hover:text-paper"
          onClick={(e) => e.stopPropagation()}
        >
          {isLive ? "Go live" : "View updates"}
        </Link>
      </div>
      <p className={`mt-xs font-mono text-[0.7rem] uppercase tracking-[0.1em] ${paid ? "text-accent" : "text-ink-muted"}`}>
        {entryFee && entryFee > 0
          ? `${entryCurrency === "INR" ? "₹" : `${entryCurrency} `}${entryFee} — ${paid ? "Paid & confirmed" : paidClaimedAt ? "Registered" : "Wait for verification"}`
          : "Free entry"}
      </p>

      {(eventAccommodation || eventFood) && (
        <div className="mt-md flex flex-wrap gap-xs">
          {eventAccommodation && (
            <span className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">Accommodation</span>
          )}
          {eventFood && (
            <span className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">Food</span>
          )}
        </div>
      )}

      {(eventScheduleCount > 0 || eventNotices.length > 0) && (
        <div className="mt-md space-y-sm">
          {eventScheduleCount > 0 && (
            <p className="flex items-center gap-sm font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {eventScheduleCount} schedule {eventScheduleCount === 1 ? "item" : "items"}
              {eventScheduleItems[0]
                ? ` · Next: ${eventScheduleItems[0].title} — ${new Date(eventScheduleItems[0].startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </p>
          )}
          {eventNotices[0] && (
            <p className="flex items-start gap-sm border border-accent bg-accent/5 px-sm py-sm font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
              <svg className="mt-px h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <span className="line-clamp-2">{eventNotices.length > 1 ? `${eventNotices[0].title} (+${eventNotices.length - 1} more)` : eventNotices[0].title}</span>
            </p>
          )}
        </div>
      )}

      {!expanded ? (
        <div className="mt-md border-t border-line pt-md">
          <div className="flex flex-wrap items-center gap-md text-body-sm">
            {matches.length > 0 ? (
              <span className="text-ink-muted">
                {matches.length} match{matches.length === 1 ? "" : "es"} · {wins} win{wins === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="text-ink-muted">No matches yet.</span>
            )}
            {rosterRounds.some((r) => r.scores.length > 0) && (
              <span className="text-ink-muted">
                {rosterRounds.reduce((sum, r) => sum + r.scores.length, 0)} judge score{rosterRounds.reduce((sum, r) => sum + r.scores.length, 0) === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="mt-sm font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
            Click to view scores & feedback
          </p>
        </div>
      ) : (
        <div className="mt-md space-y-md border-t border-line pt-md" onClick={(e) => e.stopPropagation()}>
          {matches.length > 0 && (
            <div className="space-y-sm">
              {matches.map((match) => {
                const decided = match.winnerName != null;
                const winnerIsRed = decided && match.winnerName === match.redName;
                const won = decided && (match.iAmRed ? winnerIsRed : !winnerIsRed);
                return (
                  <div key={match.id} className="border-b border-line py-sm last:border-b-0">
                    <div className="flex items-center justify-between gap-sm">
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                        Round {match.round}
                      </span>
                      {decided ? (
                        <span className="border border-accent px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-accent">
                          Winner: {match.winnerName}
                        </span>
                      ) : (
                        <span className="font-mono text-[0.6rem] uppercase text-ink-muted">
                          {match.status.toLowerCase()}
                        </span>
                      )}
                    </div>
                    <p className="mt-xs text-body-sm uppercase leading-tight">
                      <span className={`break-words ${winnerIsRed ? "font-bold text-accent" : "text-ink"}`}>
                        {match.redName}
                      </span>
                      <span className="mx-xs text-ink-muted">vs</span>
                      <span className={`break-words ${decided && !winnerIsRed ? "font-bold text-accent" : "text-ink"}`}>
                        {match.blueName}
                      </span>
                    </p>
                    {decided ? (
                      <p className="mt-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                        {won ? "You won" : "You lost"}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          {matches.length === 0 && (
            <p className="text-body-sm text-ink-muted">No matches yet.</p>
          )}
          <ArtistScoreboard rosterRounds={rosterRounds} matches={battleMatches} />
          {!paid && !paidClaimedAt && isOwner ? (
            <Link
              href={`/cart?event=${eventId}&ids=${regId}`}
              className="mt-md inline-block border border-accent bg-accent px-md py-sm font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
              onClick={(e) => e.stopPropagation()}
            >
              {memberCount > 1 ? "Check roster & pay" : "Complete payment"}
            </Link>
          ) : null}
          {wins > 0 && prizePool?.distribution ? (
            <div className="mt-md border-t border-line pt-md font-mono text-[0.7rem] uppercase text-accent">
              {wins} wins — {prizePool.isPaid ? "Prize paid" : "Prize pending"}
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
