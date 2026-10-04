"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/socket-provider";
import { FeedbackSelect } from "@/components/feedback-select";
import { responseError } from "@/lib/client-error";
import type {
  MatchCompleteData,
  MatchLiveData,
  ScoreLockedData,
  ScoreSubmittedData,
} from "@/lib/socket/types";

export type JudgeDashboardProps = {
  code: string;
  slotId: string;
  eventId: string;
  categoryName: string;
  eventTitle: string;
  roundLabel: string | null;
  initialLiveMatch: MatchLiveData | null;
};

type VoteCorner = "RED" | "BLUE";

type Tally = {
  red: number;
  blue: number;
  judgeCount: number;
};

const EMPTY_TALLY: Tally = { red: 0, blue: 0, judgeCount: 0 };

function VoteButton({
  corner,
  name,
  selected,
  disabled,
  onSelect,
}: {
  corner: VoteCorner;
  name: string;
  selected: boolean;
  disabled: boolean;
  onSelect: (corner: VoteCorner) => void;
}) {
  const isRed = corner === "RED";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(corner)}
      className={[
        "w-full border-2 px-md py-lg text-center font-display uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        isRed ? "border-accent" : "border-[#2980FF]",
        selected
          ? isRed
            ? "bg-accent text-paper"
            : "bg-[#2980FF] text-paper"
          : isRed
            ? "bg-transparent text-accent hover:bg-accent/10"
            : "bg-transparent text-[#2980FF] hover:bg-[#2980FF]/10",
      ].join(" ")}
    >
      <span className="block text-button-md leading-tight">Vote {corner === "RED" ? "red" : "blue"}</span>
      <span className="mt-xs block break-words text-body-sm font-bold normal-case">
        {name}
      </span>
      {selected ? (
        <span className="mt-sm block font-mono text-[0.65rem] uppercase tracking-[0.15em]">
          Your vote
        </span>
      ) : null}
    </button>
  );
}

function TallyReadout({ tally }: { tally: Tally }) {
  const total = tally.red + tally.blue;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-md">
        <span className="font-mono text-body-sm uppercase text-accent">Red {tally.red}</span>
        <span className="font-mono text-body-sm uppercase text-[#2980FF]">Blue {tally.blue}</span>
      </div>
      <div className="mt-xs flex h-2 w-full overflow-hidden border border-line" aria-hidden="true">
        <div
          className="bg-accent"
          style={{ width: `${total === 0 ? 0 : Math.round((tally.red / total) * 100)}%` }}
        />
        <div className="flex-1 bg-[#2980FF]" />
      </div>
      <p className="mt-xs font-mono text-[0.65rem] uppercase text-ink-muted">
        {tally.judgeCount === 0
          ? "No votes yet"
          : `${tally.judgeCount} judge${tally.judgeCount === 1 ? "" : "s"} voted`}
      </p>
    </div>
  );
}

function CompetitorHeader({
  corner,
  name,
  crew,
  seed,
  avatar,
  members,
}: {
  corner: VoteCorner;
  name: string;
  crew: string | null;
  seed: number | null;
  avatar: string | null;
  members?: string[];
}) {
  const isRed = corner === "RED";
  const tone = isRed ? "border-accent text-accent" : "border-[#2980FF] text-[#2980FF]";
  return (
    <div className="flex items-start gap-md">
      <div className={`flex h-16 w-16 shrink-0 items-center justify-center border-2 bg-paper-soft font-display ${tone}`}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          name.charAt(0) || "?"
        )}
      </div>
      <div className="min-w-0">
        <h2 className={`break-words font-display text-body-md uppercase leading-tight ${tone}`}>
          {name}
        </h2>
        <p className="mt-xs break-words font-mono text-body-sm uppercase text-ink-muted">
          Seed #{seed ?? "—"}
          {crew ? ` / ${crew}` : ""}
        </p>
        {members && members.length > 0 ? (
          <p className="mt-xs break-words text-xs uppercase leading-snug text-ink-muted">
            {members.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function JudgeDashboard({
  code,
  slotId,
  eventId,
  categoryName,
  eventTitle,
  roundLabel,
  initialLiveMatch,
}: JudgeDashboardProps) {
  const { socket, status, joinEventRoom } = useSocket();

  const [liveMatch, setLiveMatch] = useState<MatchLiveData | null>(initialLiveMatch);
  const [locked, setLocked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [vote, setVote] = useState<VoteCorner | null>(null);
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const [feedback, setFeedback] = useState<{
    red: { templateId?: string; custom: string };
    blue: { templateId?: string; custom: string };
  }>({ red: { custom: "" }, blue: { custom: "" } });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const submitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLiveMatchId = initialLiveMatch?.matchId ?? null;

  const fetchMyBallot = useCallback(
    (matchId: string) => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/matches/${matchId}/score?judgeCode=${encodeURIComponent(code)}`,
            { cache: "no-store" },
          );
          if (!res.ok) return;
          // Shares the `getMatchDecisionAggregate` shape with the POST response,
          // so keys stay scoreRed/scoreBlue here rather than red/blue.
          const data = (await res.json()) as {
            status: string;
            aggregate?: { scoreRed?: number; scoreBlue?: number; judgeCount?: number };
            myVote: VoteCorner | null;
            myFeedbackRed: string | null;
            myFeedbackBlue: string | null;
          };
          setTally({
            red: data.aggregate?.scoreRed ?? 0,
            blue: data.aggregate?.scoreBlue ?? 0,
            judgeCount: data.aggregate?.judgeCount ?? 0,
          });
          if (data.myVote) {
            setVote(data.myVote);
            setSubmitted(true);
          }
          if (data.myFeedbackRed || data.myFeedbackBlue) {
            setFeedback({
              red: { custom: data.myFeedbackRed ?? "" },
              blue: { custom: data.myFeedbackBlue ?? "" },
            });
          }
        } catch {
          // non-fatal: the socket keeps the tally live
        }
      })();
    },
    [code],
  );

  useEffect(() => {
    if (status !== "live") return;
    joinEventRoom(eventId, "judge").then((res) => {
      if (!res.ok) setJoinError(res.error ?? "Failed to join event");
    });
  }, [status, joinEventRoom, eventId]);

  // Seed the ballot when the screen loads with an already-live match.
  useEffect(() => {
    if (initialLiveMatchId) fetchMyBallot(initialLiveMatchId);
  }, [initialLiveMatchId, fetchMyBallot]);

  useEffect(() => {
    if (!socket) return;

    const onMatchLive = (data: MatchLiveData) => {
      setLiveMatch(data);
      setLocked(false);
      setSubmitted(false);
      setVote(null);
      setTally(EMPTY_TALLY);
      setFeedback({ red: { custom: "" }, blue: { custom: "" } });
      setSubmitError(null);
      fetchMyBallot(data.matchId);
    };

    const onScoreSubmitted = (data: ScoreSubmittedData) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setTally({ red: data.aggregateRed, blue: data.aggregateBlue, judgeCount: data.judgeCount });
      if (data.judgeSlotId === slotId) {
        setSubmitted(true);
        if (data.winnerCorner) setVote(data.winnerCorner);
      }
    };

    const onScoreLocked = (data: ScoreLockedData) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setLocked(data.locked);
    };

    const onMatchComplete = (_data: MatchCompleteData) => {
      if (_data.matchId !== liveMatch?.matchId) return;
      setLocked(false);
    };

    socket.on("match_live", onMatchLive);
    socket.on("score_submitted", onScoreSubmitted);
    socket.on("score_locked", onScoreLocked);
    socket.on("match_complete", onMatchComplete);

    return () => {
      socket.off("match_live", onMatchLive);
      socket.off("score_submitted", onScoreSubmitted);
      socket.off("score_locked", onScoreLocked);
      socket.off("match_complete", onMatchComplete);
    };
  }, [socket, liveMatch?.matchId, slotId, fetchMyBallot]);

  const canSubmit = vote != null && !locked;

  function submitVote() {
    if (!liveMatch || !vote || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/matches/${liveMatch.matchId}/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winnerCorner: vote,
            judgeCode: code,
            feedbackRed: feedback.red.custom || undefined,
            feedbackBlue: feedback.blue.custom || undefined,
            feedbackTemplateIdRed: feedback.red.templateId,
            feedbackTemplateIdBlue: feedback.blue.templateId,
          }),
        });

        if (!response.ok) {
          setSubmitError(await responseError(response, "Failed to submit vote"));
          return;
        }

        const result = (await response.json()) as {
          aggregate?: { scoreRed: number; scoreBlue: number; judgeCount: number };
        };
        setSubmitted(true);
        if (result.aggregate) {
          setTally({
            red: result.aggregate.scoreRed,
            blue: result.aggregate.scoreBlue,
            judgeCount: result.aggregate.judgeCount,
          });
        }
      } catch {
        setSubmitError("Network error. Please try again.");
      } finally {
        if (submitTimeout.current) {
          clearTimeout(submitTimeout.current);
          submitTimeout.current = null;
        }
        setSubmitting(false);
      }
    })();

    submitTimeout.current = setTimeout(() => {
      setSubmitting(false);
      setSubmitError("Server did not respond. Please try again.");
    }, 15000);
  }

  const connectionLabel =
    status === "live" ? "LIVE" : status === "offline" ? "OFFLINE" : "CONNECTING...";

  if (!liveMatch) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-md py-section text-center">
        <p className="font-mono text-body-sm uppercase text-accent">{categoryName}</p>
        <h1 className="mt-lg font-display text-display-lg uppercase">{eventTitle}</h1>
        <p className="mt-sm text-body-sm text-ink-muted">{roundLabel ?? "Battle"}</p>
        <div className="mt-xl flex items-center gap-sm">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">{connectionLabel}</span>
          <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-accent" : "bg-line"}`} />
        </div>
        <div className="mt-xl border border-line px-lg py-md text-body-sm uppercase">
          Waiting for the organizer to push the next match live.
        </div>
        {joinError && <p className="mt-sm text-body-sm text-accent">{joinError}</p>}
      </main>
    );
  }

  const votedLabel = vote === "RED" ? "Red" : "Blue";

  return (
    <main className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-md border-b border-line px-md py-sm md:px-xl">
        <div>
          <p className="font-mono text-[0.7rem] uppercase text-accent">
            {categoryName} / Round {liveMatch.round} / Match {liveMatch.position}
          </p>
          <h1 className="font-display text-title-md uppercase">{eventTitle}</h1>
        </div>
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-sm">
            <span className="font-mono text-[0.7rem] uppercase text-ink-muted">{connectionLabel}</span>
            <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-accent" : "bg-line"}`} />
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="border-b border-line bg-paper-soft px-md py-sm md:px-xl">
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
            No marking in battles — pick the winner and leave feedback for both artists.
          </p>
        </div>

        <div className="grid min-h-[50vh] lg:grid-cols-2">
          <section className="flex flex-col gap-md border-b border-line px-md py-lg lg:border-b-0 lg:border-r md:px-xl">
            <CompetitorHeader
              corner="RED"
              name={liveMatch.red.name}
              crew={liveMatch.red.crew}
              seed={liveMatch.red.seed}
              avatar={liveMatch.red.avatar}
              members={liveMatch.red.members}
            />
            <VoteButton
              corner="RED"
              name={liveMatch.red.name}
              selected={vote === "RED"}
              disabled={locked}
              onSelect={setVote}
            />
          </section>

          <section className="flex flex-col gap-md px-md py-lg md:px-xl">
            <CompetitorHeader
              corner="BLUE"
              name={liveMatch.blue.name}
              crew={liveMatch.blue.crew}
              seed={liveMatch.blue.seed}
              avatar={liveMatch.blue.avatar}
              members={liveMatch.blue.members}
            />
            <VoteButton
              corner="BLUE"
              name={liveMatch.blue.name}
              selected={vote === "BLUE"}
              disabled={locked}
              onSelect={setVote}
            />
          </section>
        </div>
      </div>

      <footer className="border-t border-line bg-paper-soft px-md py-lg md:px-xl">
        {locked ? (
          <div className="border border-accent bg-accent px-lg py-md text-center font-display text-title-md uppercase text-paper">
            Voting locked by organizer
          </div>
        ) : (
          <>
            <div className="grid gap-md md:grid-cols-2">
              <FeedbackSelect
                code={code}
                label={`Feedback for ${liveMatch.red.name} (optional)`}
                value={feedback.red}
                onChange={(next) => setFeedback((prev) => ({ ...prev, red: next }))}
              />
              <FeedbackSelect
                code={code}
                label={`Feedback for ${liveMatch.blue.name} (optional)`}
                value={feedback.blue}
                onChange={(next) => setFeedback((prev) => ({ ...prev, blue: next }))}
              />
            </div>

            <div className="mt-lg grid gap-md md:grid-cols-[1fr_auto] md:items-end">
              <TallyReadout tally={tally} />
              <div className="flex flex-col items-stretch gap-sm md:items-end">
                <button
                  type="button"
                  className="w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                  disabled={!canSubmit || submitting}
                  onClick={submitVote}
                >
                  {submitting
                    ? "Submitting..."
                    : submitted && vote
                      ? "Update vote"
                      : "Submit vote"}
                </button>
                {submitted && vote ? (
                  <p className="font-mono text-[0.65rem] uppercase text-ink-muted">
                    Your vote: {votedLabel}. Voting stays open until the organizer locks it.
                  </p>
                ) : vote == null ? (
                  <p className="font-mono text-[0.65rem] uppercase text-ink-muted">
                    Pick red or blue to submit your vote
                  </p>
                ) : null}
              </div>
            </div>
          </>
        )}
        {submitError && <p className="mt-sm text-center text-body-sm text-accent">{submitError}</p>}
      </footer>
    </main>
  );
}