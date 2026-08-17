"use client";

import { useState } from "react";

export type RosterJudgeScore = {
  judgeName: string;
  score: number;
  feedback: string | null;
};

export type RosterRound = {
  order: number;
  type: string;
  label: string | null;
  scores: RosterJudgeScore[];
};

export type BattleJudgeScore = {
  judgeName: string;
  winnerCorner: string | null;
  feedback: string | null;
  feedbackRed: string | null;
  feedbackBlue: string | null;
  scoreA: number;
  scoreB: number;
};

export type BattleMatchBreakdown = {
  id: string;
  round: number;
  status: string;
  opponentName: string;
  iAmRed: boolean;
  scores: BattleJudgeScore[];
};

export function ArtistScoreboard({
  rosterRounds,
  matches,
}: {
  rosterRounds: RosterRound[];
  matches: BattleMatchBreakdown[];
}) {
  const [open, setOpen] = useState(false);

  const hasRoster = rosterRounds.some((r) => r.scores.length > 0);
  const hasMatches = matches.some((m) => m.scores.length > 0);

  if (!hasRoster && !hasMatches) return null;

  return (
    <div className="mt-md border-t border-line pt-md">
      <button
        type="button"
        className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink-muted hover:text-accent"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "− Hide detailed scoreboard" : "+ Detailed scoreboard"}
      </button>

      {open ? (
        <div className="mt-md space-y-md">
          {hasRoster ? (
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
                Judging rounds
              </p>
              {rosterRounds.map((round) =>
                round.scores.length === 0 ? null : (
                  <div key={round.order} className="mt-sm border border-line bg-paper p-md">
                    <p className="font-bold uppercase text-body-sm">
                      {round.label ?? round.type} (round {round.order})
                    </p>
                    <div className="mt-sm space-y-xs">
                      {round.scores.map((s, i) => (
                        <div key={i} className="flex flex-wrap items-center justify-between gap-sm text-body-sm">
                          <span className="font-mono uppercase text-ink-muted">{s.judgeName}</span>
                          <span className="font-bold text-accent">{s.score}</span>
                          {s.feedback ? <span className="basis-full italic text-ink-muted">&ldquo;{s.feedback}&rdquo;</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : null}

          {hasMatches ? (
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
                Battle rounds
              </p>
              {matches.map((match) =>
                match.scores.length === 0 ? null : (
                  <div key={match.id} className="mt-sm border border-line bg-paper p-md">
                    <p className="font-bold uppercase text-body-sm">
                      Round {match.round} vs {match.opponentName}
                    </p>
                    <div className="mt-sm space-y-xs">
                      {match.scores.map((s, i) => {
                        const myFeedback = match.iAmRed ? s.feedbackRed ?? (s.winnerCorner === "BLUE" ? s.feedback : null) : s.feedbackBlue ?? (s.winnerCorner === "RED" ? s.feedback : null);
                        const opponentFeedback = match.iAmRed ? s.feedbackBlue ?? (s.winnerCorner === "RED" ? s.feedback : null) : s.feedbackRed ?? (s.winnerCorner === "BLUE" ? s.feedback : null);
                        return (
                          <div key={i} className="text-body-sm">
                            <p className="flex flex-wrap items-center justify-between gap-sm">
                              <span className="font-mono uppercase text-ink-muted">{s.judgeName}</span>
                              <span className="font-mono uppercase">
                                {s.winnerCorner ? (match.iAmRed ? (s.winnerCorner === "RED" ? "You win" : "Opponent") : s.winnerCorner === "BLUE" ? "You win" : "Opponent") : `${s.scoreA} — ${s.scoreB}`}
                              </span>
                            </p>
                            {myFeedback ? <p className="italic text-ink-muted">For you: &ldquo;{myFeedback}&rdquo;</p> : null}
                            {opponentFeedback ? <p className="italic text-ink-muted">For {match.opponentName}: &ldquo;{opponentFeedback}&rdquo;</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
