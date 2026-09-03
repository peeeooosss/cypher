"use client";

import Link from "next/link";
import { useState } from "react";
import { formatLabel } from "@/lib/event-types";
import { ArtistScoreboard, type BattleMatchBreakdown, type RosterRound } from "@/components/artist-scoreboard";

type MatchSummary = {
  id: string;
  round: number;
  position: number;
  status: string;
  scoreA: number;
  scoreB: number;
  competitorA: { user: { name: string | null } } | null;
  competitorB: { user: { name: string | null } } | null;
  winner: { userId: string } | null;
  scores: { feedback: string | null; feedbackRed: string | null; feedbackBlue: string | null; scoreA: number; scoreB: number; winnerCorner: string | null }[];
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
  userId,
  regId,
  eventId,
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
  userId: string;
  regId: string;
  eventId: string;
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
                const isA = match.competitorA && match.competitorB
                  ? true
                  : match.competitorB !== null;
                const opponent = isA ? match.competitorB : match.competitorA;
                const myScore = isA ? match.scoreA : match.scoreB;
                const theirScore = isA ? match.scoreB : match.scoreA;
                const won = match.winner?.userId === userId;
                return (
                  <div className="flex items-start justify-between gap-sm text-body-sm" key={match.id}>
                    <div>
                      <p className="font-bold uppercase">
                        Round {match.round} vs {opponent?.user.name ?? "TBD"}
                      </p>
                      <p className="text-ink-muted">
                        Score: {myScore} — {theirScore} {match.status === "COMPLETE" ? (won ? "W" : "L") : ""}
                      </p>
                    </div>
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
