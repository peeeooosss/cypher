"use client";

export type RosterJudgeScore = {
  judgeName: string;
  score: number;
  feedback: string | null;
  musicality?: number | null;
  foundation?: number | null;
  presentation?: number | null;
  execution?: number | null;
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
  sectionsA?: { musicality: number; foundation: number; presentation: number; execution: number } | null;
  sectionsB?: { musicality: number; foundation: number; presentation: number; execution: number } | null;
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
  const hasRoster = rosterRounds.some((r) => r.scores.length > 0);
  const hasMatches = matches.some((m) => m.scores.length > 0);

  if (!hasRoster && !hasMatches) return null;

  return (
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
                  {round.scores.map((s, i) => {
                    const hasSections =
                      s.musicality != null &&
                      s.foundation != null &&
                      s.presentation != null &&
                      s.execution != null;
                    return (
                      <div key={i} className="border-b border-line pb-xs last:border-b-0">
                        <div className="flex flex-wrap items-center justify-between gap-sm text-body-sm">
                          <span className="font-mono uppercase text-ink-muted">{s.judgeName}</span>
                          <span className="font-bold text-accent">{s.score.toFixed(1)}/20</span>
                        </div>
                        {hasSections ? (
                          <div className="mt-xs flex flex-wrap gap-x-md gap-y-xs font-mono text-[0.65rem] uppercase text-ink-muted">
                            <span>Musicality {s.musicality!.toFixed(1)}</span>
                            <span>Foundation {s.foundation!.toFixed(1)}</span>
                            <span>Presentation {s.presentation!.toFixed(1)}</span>
                            <span>Execution {s.execution!.toFixed(1)}</span>
                          </div>
                        ) : null}
                        {s.feedback ? <p className="mt-xs italic text-ink-muted">&ldquo;{s.feedback}&rdquo;</p> : null}
                      </div>
                    );
                  })}
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
                    const mySections = match.iAmRed ? s.sectionsA : s.sectionsB;
                    const oppSections = match.iAmRed ? s.sectionsB : s.sectionsA;
                    const myScore = match.iAmRed ? s.scoreA : s.scoreB;
                    const oppScore = match.iAmRed ? s.scoreB : s.scoreA;
                    const resultLabel = s.winnerCorner
                      ? (match.iAmRed ? (s.winnerCorner === "RED" ? "You win" : "Opponent") : s.winnerCorner === "BLUE" ? "You win" : "Opponent")
                      : `${(myScore ?? 0).toFixed(1)} — ${(oppScore ?? 0).toFixed(1)}`;
                    return (
                      <div key={i} className="border-b border-line pb-xs last:border-b-0">
                        <p className="flex flex-wrap items-center justify-between gap-sm text-body-sm">
                          <span className="font-mono uppercase text-ink-muted">{s.judgeName}</span>
                          <span className="font-mono uppercase">{resultLabel}</span>
                        </p>
                        {mySections && oppSections ? (
                          <div className="mt-xs flex flex-wrap gap-x-md gap-y-xs font-mono text-[0.65rem] uppercase text-ink-muted">
                            <span>Musicality {mySections.musicality.toFixed(1)}/{oppSections.musicality.toFixed(1)}</span>
                            <span>Foundation {mySections.foundation.toFixed(1)}/{oppSections.foundation.toFixed(1)}</span>
                            <span>Presentation {mySections.presentation.toFixed(1)}/{oppSections.presentation.toFixed(1)}</span>
                            <span>Execution {mySections.execution.toFixed(1)}/{oppSections.execution.toFixed(1)}</span>
                          </div>
                        ) : null}
                        {myFeedback ? <p className="mt-xs italic text-ink-muted">For you: &ldquo;{myFeedback}&rdquo;</p> : null}
                        {opponentFeedback ? <p className="mt-xs italic text-ink-muted">For {match.opponentName}: &ldquo;{opponentFeedback}&rdquo;</p> : null}
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
  );
}
