"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/socket-provider";
import { FeedbackSelect } from "@/components/feedback-select";
import { ScoringSectionGrid } from "@/components/scoring-section-grid";
import { EMPTY_SECTIONS, MAX_TOTAL, sectionTotal, type SectionScores } from "@/lib/scoring-sections";
import type {
  MatchLiveData,
  ScoreSubmittedData,
  SectionScoresInput,
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
  const [redSections, setRedSections] = useState<SectionScores>({ ...EMPTY_SECTIONS });
  const [blueSections, setBlueSections] = useState<SectionScores>({ ...EMPTY_SECTIONS });
  const [aggregate, setAggregate] = useState<{
    scoreRed: number;
    scoreBlue: number;
    judgeCount: number;
    redSections?: SectionScoresInput;
    blueSections?: SectionScoresInput;
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    red: { templateId?: string; custom: string };
    blue: { templateId?: string; custom: string };
  }>({ red: { custom: "" }, blue: { custom: "" } });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [redTouched, setRedTouched] = useState(false);
  const [blueTouched, setBlueTouched] = useState(false);
  const submitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setRedSections({ ...EMPTY_SECTIONS });
      setBlueSections({ ...EMPTY_SECTIONS });
      setRedTouched(false);
      setBlueTouched(false);
      setAggregate(null);
      setFeedback({ red: { custom: "" }, blue: { custom: "" } });
      setSubmitError(null);
    };

    const onScoreSubmitted = (data: ScoreSubmittedData) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setAggregate({
        scoreRed: data.aggregateRed,
        scoreBlue: data.aggregateBlue,
        judgeCount: data.judgeCount,
        redSections: data.redSections,
        blueSections: data.blueSections,
      });
      if (data.judgeSlotId === slotId) setSubmitted(true);
    };

    const onScoreLocked = (data: { matchId: string; locked: boolean }) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setLocked(data.locked);
    };

    const onMatchComplete = (data: { matchId: string; winnerCorner: "red" | "blue" }) => {
      if (data.matchId !== liveMatch?.matchId) return;
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

  const redTotal = sectionTotal(redSections);
  const blueTotal = sectionTotal(blueSections);
  const canSubmit =
    !submitted && !locked && liveMatch != null &&
    redTouched && blueTouched;

  function submitVote() {
    if (!socket || !liveMatch || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    socket.emit(
      "submit_score",
      {
        matchId: liveMatch.matchId,
        scoreRedSections: {
          musicality: redSections.MUSICALITY,
          foundation: redSections.FOUNDATION,
          presentation: redSections.PRESENTATION,
          execution: redSections.EXECUTION,
        },
        scoreBlueSections: {
          musicality: blueSections.MUSICALITY,
          foundation: blueSections.FOUNDATION,
          presentation: blueSections.PRESENTATION,
          execution: blueSections.EXECUTION,
        },
        feedbackRed: feedback.red.custom || undefined,
        feedbackBlue: feedback.blue.custom || undefined,
        feedbackTemplateIdRed: feedback.red.templateId,
        feedbackTemplateIdBlue: feedback.blue.templateId,
      },
      (ack) => {
        if (submitTimeout.current) { clearTimeout(submitTimeout.current); submitTimeout.current = null; }
        setSubmitting(false);
        if (!ack.ok) {
          const msg = (ack as { error?: string }).error
            ?? (ack as { message?: string }).message
            ?? "Failed to submit score";
          setSubmitError(msg);
          return;
        }
        setSubmitted(true);
        if (ack.aggregate) setAggregate(ack.aggregate);
      },
    );

    submitTimeout.current = setTimeout(() => {
      setSubmitting(false);
      setSubmitError("Server did not respond. Please try again.");
    }, 10000);
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
        <div className="grid min-h-[60vh] lg:grid-cols-2">
          {/* RED SIDE */}
          <section className="flex flex-col gap-md border-b border-line bg-paper px-md pb-xl pt-lg lg:border-b-0 lg:border-r md:px-xl">
            <div className="flex items-center gap-md">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-accent bg-paper-soft font-display text-accent">
                {liveMatch.red.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={liveMatch.red.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  liveMatch.red.name.charAt(0) || "?"
                )}
              </div>
              <div>
                <h2 className="font-display text-display-md uppercase leading-none text-accent">
                  {liveMatch.red.name}
                </h2>
                <p className="mt-xs font-mono text-body-sm uppercase text-ink-muted">
                  Seed #{liveMatch.red.seed ?? "—"}
                  {liveMatch.red.crew ? ` / ${liveMatch.red.crew}` : ""}
                </p>
                {liveMatch.red.members && liveMatch.red.members.length > 0 ? (
                  <p className="mt-xs text-xs uppercase text-ink-muted">{liveMatch.red.members.join(" · ")}</p>
                ) : null}
              </div>
            </div>

            {submitted ? (
              <p className="border border-accent bg-accent px-lg py-md text-center font-display text-title-md uppercase text-paper">
                Score submitted
              </p>
            ) : (
              <ScoringSectionGrid value={redSections} onChange={(next) => { setRedSections(next); setRedTouched(true); }} />
            )}
          </section>

          {/* BLUE SIDE */}
          <section className="flex flex-col gap-md bg-paper px-md pb-xl pt-lg md:px-xl">
            <div className="flex items-center gap-md">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-[#2980FF] bg-paper-soft font-display text-[#2980FF]">
                {liveMatch.blue.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={liveMatch.blue.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  liveMatch.blue.name.charAt(0) || "?"
                )}
              </div>
              <div>
                <h2 className="font-display text-display-md uppercase leading-none text-[#2980FF]">
                  {liveMatch.blue.name}
                </h2>
                <p className="mt-xs font-mono text-body-sm uppercase text-ink-muted">
                  Seed #{liveMatch.blue.seed ?? "—"}
                  {liveMatch.blue.crew ? ` / ${liveMatch.blue.crew}` : ""}
                </p>
                {liveMatch.blue.members && liveMatch.blue.members.length > 0 ? (
                  <p className="mt-xs text-xs uppercase text-ink-muted">{liveMatch.blue.members.join(" · ")}</p>
                ) : null}
              </div>
            </div>

            {submitted ? (
              <div className="border border-line px-lg py-md text-center font-display text-title-md uppercase">
                <span className="text-[#2980FF]">{blueTotal.toFixed(1)}/{MAX_TOTAL}</span>
              </div>
            ) : (
              <ScoringSectionGrid value={blueSections} onChange={(next) => { setBlueSections(next); setBlueTouched(true); }} />
            )}
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
              {redTotal.toFixed(1)} — {blueTotal.toFixed(1)}
            </span>
            {feedback.red.custom || feedback.red.templateId || feedback.blue.custom || feedback.blue.templateId ? (
              <span className="block font-mono text-[0.7rem] normal-case text-ink-muted">
                Feedback recorded.
              </span>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-md md:grid-cols-[1fr_1fr_auto]">
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
            <div className="flex items-center gap-md">
              <div className="text-right">
                <p className="font-mono text-body-sm uppercase text-ink-muted">
                  Red {redTotal.toFixed(1)} · Blue {blueTotal.toFixed(1)}
                </p>
                <p className="font-mono text-[0.65rem] uppercase text-ink-muted">
                  {aggregate
                    ? `${aggregate.judgeCount} judge${aggregate.judgeCount === 1 ? "" : "s"}`
                    : "No scores yet"}
                </p>
              </div>
              <button
                type="button"
                className="border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSubmit || submitting}
                onClick={submitVote}
              >
                {submitting ? "Submitting..." : "Submit score"}
              </button>
              {!canSubmit && !submitted && !locked && (!redTouched || !blueTouched) ? (
                <p className="w-full text-center font-mono text-[0.65rem] uppercase text-ink-muted">
                  {!redTouched && !blueTouched
                    ? "Score both competitors to submit"
                    : !redTouched
                      ? `Score ${liveMatch.red.name} to submit`
                      : `Score ${liveMatch.blue.name} to submit`}
                </p>
              ) : null}
            </div>
          </div>
        )}
        {submitError && <p className="mt-sm text-center text-body-sm text-accent">{submitError}</p>}
      </footer>
    </main>
  );
}
