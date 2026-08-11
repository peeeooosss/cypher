"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/socket-provider";
import { FeedbackSelect } from "@/components/feedback-select";
import type {
  MatchLiveData,
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
  const [winnerCorner, setWinnerCorner] = useState<"red" | "blue" | null>(null);
  const [aggregate, setAggregate] = useState<{
    scoreRed: number;
    scoreBlue: number;
    judgeCount: number;
  } | null>(null);
  const [myPick, setMyPick] = useState<"red" | "blue" | null>(null);
  const [feedback, setFeedback] = useState<{ templateId?: string; custom: string }>({ custom: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "live") return;
    joinEventRoom(eventId, "judge").then((res) => {
      if (!res.ok) setJoinError(res.error ?? "Failed to join event");
    });
  }, [status, joinEventRoom, eventId]);

  useEffect(() => {
    if (!socket) return;

    const onMatchLive = (data: MatchLiveData) => {
      setLiveMatch(data);
      setLocked(false);
      setSubmitted(false);
      setWinnerCorner(null);
      setAggregate(null);
      setMyPick(null);
      setFeedback({ custom: "" });
      setSubmitError(null);
    };

    const onScoreSubmitted = (data: ScoreSubmittedData) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setAggregate({
        scoreRed: data.aggregateRed,
        scoreBlue: data.aggregateBlue,
        judgeCount: data.judgeCount,
      });
      if (data.judgeSlotId === slotId) setSubmitted(true);
    };

    const onScoreLocked = (data: { matchId: string; locked: boolean }) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setLocked(data.locked);
    };

    const onMatchComplete = (data: { matchId: string; winnerCorner: "red" | "blue" }) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setWinnerCorner(data.winnerCorner);
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
  }, [socket, liveMatch?.matchId, slotId]);

  const canSubmit =
    !submitted && !locked && liveMatch != null && myPick != null;

  function pickWinner(corner: "red" | "blue") {
    if (submitted || locked || winnerCorner) return;
    setMyPick(corner);
  }

  function submitVote() {
    if (!socket || !liveMatch || myPick == null) return;
    setSubmitting(true);
    setSubmitError(null);

    socket.emit(
      "submit_score",
      {
        matchId: liveMatch.matchId,
        winnerCorner: myPick,
        feedbackTemplateId: feedback.templateId,
        feedback: feedback.custom || undefined,
      },
      (ack) => {
        setSubmitting(false);
        if (!ack.ok) {
          setSubmitError("Failed to submit decision");
          return;
        }
        setSubmitted(true);
        setAggregate(ack.aggregate);
      },
    );
  }

  const pickMade = myPick != null;
  const defeatedCorner = myPick === "red" ? "blue" : "red";
  const defeatedName = defeatedCorner === "red" ? liveMatch?.red.name : liveMatch?.blue.name;
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

  const winnerBanner =
    winnerCorner === "red" ? (
      <span className="text-accent">RED WINS</span>
    ) : winnerCorner === "blue" ? (
      <span className="text-[#2980FF]">BLUE WINS</span>
    ) : null;

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
          {winnerBanner && (
            <span className="border border-line px-md py-xs font-display text-title-sm uppercase">
              {winnerBanner}
            </span>
          )}
          <div className="flex items-center gap-sm">
            <span className="font-mono text-[0.7rem] uppercase text-ink-muted">{connectionLabel}</span>
            <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-accent" : "bg-line"}`} />
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="grid min-h-[60vh] grid-cols-2">
          {/* RED SIDE */}
          <section
            className={`relative flex flex-col items-center justify-center gap-md border-r border-line bg-paper px-md py-xl text-center ${
              winnerCorner === "blue" ? "opacity-40" : ""
            }`}
          >
            <span className="absolute top-md left-md font-display text-display-xl uppercase text-accent/20">
              Red
            </span>
            <div className="flex h-40 w-40 items-center justify-center border-4 border-accent bg-paper-soft font-display text-display-lg uppercase text-accent">
              {liveMatch.red.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={liveMatch.red.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                liveMatch.red.name.charAt(0) || "?"
              )}
            </div>
            <h2 className="font-display text-display-md uppercase leading-none text-accent">
              {liveMatch.red.name}
            </h2>
            <p className="font-mono text-body-sm uppercase text-ink-muted">
              Seed #{liveMatch.red.seed ?? "—"}
              {liveMatch.red.crew ? ` / ${liveMatch.red.crew}` : ""}
            </p>
            {liveMatch.red.members && liveMatch.red.members.length > 0 ? <p className="max-w-xs text-xs uppercase text-ink-muted">{liveMatch.red.members.join(" · ")}</p> : null}
            <p className="font-display text-display-lg uppercase text-accent">
              {aggregate?.scoreRed ?? 0}
              <span className="font-mono text-body-sm uppercase text-ink-muted"> votes</span>
            </p>

            <button
              type="button"
              className={`mt-md border-2 px-lg py-md font-display text-title-sm font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60 ${
                myPick === "red"
                  ? "border-accent bg-accent text-paper"
                  : "border-accent/50 text-accent hover:bg-accent hover:text-paper"
              }`}
              disabled={submitted || locked || !!winnerCorner}
              onClick={() => pickWinner("red")}
            >
              {myPick === "red" ? "✓ My winner" : "Pick red to win"}
            </button>
          </section>

          {/* BLUE SIDE */}
          <section
            className={`relative flex flex-col items-center justify-center gap-md bg-paper px-md py-xl text-center ${
              winnerCorner === "red" ? "opacity-40" : ""
            }`}
          >
            <span className="absolute top-md right-md font-display text-display-xl uppercase text-[#2980FF]/20">
              Blue
            </span>
            <div className="flex h-40 w-40 items-center justify-center border-4 border-[#2980FF] bg-paper-soft font-display text-display-lg uppercase text-[#2980FF]">
              {liveMatch.blue.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={liveMatch.blue.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                liveMatch.blue.name.charAt(0) || "?"
              )}
            </div>
            <h2 className="font-display text-display-md uppercase leading-none text-[#2980FF]">
              {liveMatch.blue.name}
            </h2>
            <p className="font-mono text-body-sm uppercase text-ink-muted">
              Seed #{liveMatch.blue.seed ?? "—"}
              {liveMatch.blue.crew ? ` / ${liveMatch.blue.crew}` : ""}
            </p>
            {liveMatch.blue.members && liveMatch.blue.members.length > 0 ? <p className="max-w-xs text-xs uppercase text-ink-muted">{liveMatch.blue.members.join(" · ")}</p> : null}
            <p className="font-display text-display-lg uppercase text-[#2980FF]">
              {aggregate?.scoreBlue ?? 0}
              <span className="font-mono text-body-sm uppercase text-ink-muted"> votes</span>
            </p>

            <button
              type="button"
              className={`mt-md border-2 px-lg py-md font-display text-title-sm font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60 ${
                myPick === "blue"
                  ? "border-[#2980FF] bg-[#2980FF] text-paper"
                  : "border-[#2980FF]/50 text-[#2980FF] hover:bg-[#2980FF] hover:text-paper"
              }`}
              disabled={submitted || locked || !!winnerCorner}
              onClick={() => pickWinner("blue")}
            >
              {myPick === "blue" ? "✓ My winner" : "Pick blue to win"}
            </button>
          </section>
        </div>
      </div>

      <footer className="border-t border-line bg-paper-soft px-md py-lg md:px-xl">
        {locked ? (
          <div className="border border-accent bg-accent px-lg py-md text-center font-display text-title-md uppercase text-paper">
            Voting locked by organizer
          </div>
        ) : submitted ? (
          <div className="border border-line px-lg py-md text-center font-display text-title-md uppercase">
            Decision submitted{" "}
            <span className="text-accent">
              {myPick === "red" ? "Red wins" : "Blue wins"}
            </span>
            {feedback.custom || feedback.templateId ? (
              <span className="block font-mono text-[0.7rem] normal-case text-ink-muted">
                 Feedback for {defeatedName ?? "defeated entry"} recorded.
              </span>
            ) : null}
          </div>
        ) : winnerCorner ? (
          <div className="border border-line px-lg py-md text-center font-display text-title-md uppercase">
            Match complete
          </div>
        ) : (
          <div className="grid gap-md md:grid-cols-[1fr_auto_auto]">
            <FeedbackSelect
              code={code}
              label={defeatedName ? `Feedback for ${defeatedName}` : "Feedback"}
              value={feedback}
              onChange={setFeedback}
            />
            <div className="flex items-center gap-md">
              <span className="font-mono text-body-sm uppercase text-ink-muted">
                {aggregate
                  ? `${aggregate.judgeCount} judge${aggregate.judgeCount === 1 ? "" : "s"} · Red ${aggregate.scoreRed} / Blue ${aggregate.scoreBlue}`
                  : "No decisions yet"}
              </span>
              <button
                type="button"
                className="border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSubmit || submitting}
                onClick={submitVote}
              >
                {submitting ? "Submitting..." : pickMade ? "Submit decision" : "Pick a winner"}
              </button>
            </div>
          </div>
        )}
        {submitError && <p className="mt-sm text-center text-body-sm text-accent">{submitError}</p>}
      </footer>
    </main>
  );
}
