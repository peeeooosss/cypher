"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

type Competitor = { user: { name: string | null } } | null;

type MatchDisplay = {
  id: string;
  round: number;
  position: number;
  status: string;
  scoreA: number;
  scoreB: number;
  competitorA: Competitor;
  competitorB: Competitor;
  scores: { judgeSlot: { name: string | null } }[];
};

type RegistrationDisplay = {
  id: string;
  seed: number | null;
  crew: string | null;
  city: string | null;
  user: { name: string | null; email: string };
  dancerScores: { roundFormatId: string; score: number; judgeSlotId: string }[];
};

type RoundDisplay = {
  id: string;
  order: number;
  type: string;
  label: string | null;
  phaseStatus: string | null;
};

type SlotData = {
  category: {
    id: string;
    name: string;
    currentPhaseOrder: number | null;
    event: { id: string; title: string };
    rounds: RoundDisplay[];
    registrations: RegistrationDisplay[];
    matches: MatchDisplay[];
  };
};

type DancerScoreInput = { score: number; feedback?: string };

function initialMyScores(
  registrations: RegistrationDisplay[],
  slotId: string,
): Record<string, DancerScoreInput> {
  const result: Record<string, DancerScoreInput> = {};
  for (const reg of registrations) {
    const mine = reg.dancerScores.find((s) => s.judgeSlotId === slotId);
    if (mine) result[reg.id] = { score: mine.score };
  }
  return result;
}

export function ScoringInterface({
  code,
  slotId,
  data,
  activeRound,
}: {
  code: string;
  slotId: string;
  data: SlotData;
  activeRound: RoundDisplay | null;
}) {
  const [liveMatches, setLiveMatches] = useState(data.category.matches);
  const [myDancerScores, setMyDancerScores] = useState<
    Record<string, DancerScoreInput>
  >(() => initialMyScores(data.category.registrations, slotId));
  const [connectionStatus, setConnectionStatus] = useState("offline");
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<
    Record<string, { scoreA: number | null; scoreB: number | null }>
  >({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [draftScores, setDraftScores] = useState<Record<string, number | null>>(
    () => Object.fromEntries(data.category.registrations.map((reg) => [reg.id, null])),
  );
  const [dancerFeedback, setDancerFeedback] = useState<Record<string, string>>({});

  const eventId = data.category.event.id;
  const isRosterMode =
    activeRound != null &&
    ["CYPHER", "QUALIFIER"].includes(activeRound.type) &&
    data.category.registrations.length > 0;

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
    const socket = io(socketUrl, {
      query: { code },
      withCredentials: true,
    });

    socket.on("connect", () => {
      setConnectionStatus("live");
      socket.emit("event:join", { eventId }, (ack: { error?: string }) => {
        if (ack?.error) setConnectionStatus("error");
      });
    });

    socket.on("disconnect", () => setConnectionStatus("offline"));

    socket.on("event:state", (matches) => {
      setLiveMatches(matches);
    });

    socket.on("match:updated", ({ match }) => {
      setLiveMatches((current) =>
        current.map((m) => (m.id === match.id ? { ...m, ...match } : m)),
      );
    });

    socket.on("dancer:updated", ({ judgeSlotId, registrationId, score }) => {
      if (judgeSlotId !== slotId) return;
      setMyDancerScores((prev) => ({ ...prev, [registrationId]: { score } }));
      setDraftScores((prev) => ({ ...prev, [registrationId]: null }));
    });

    return () => {
      socket.disconnect();
    };
  }, [code, eventId, slotId]);

  // Polling fallback when the socket server is unreachable
  useEffect(() => {
    const poll = async () => {
      if (connectionStatus === "live") return;
      const res = await fetch(`/api/judge-slots/${code}`);
      if (res.ok) {
        const slot = await res.json();
        if (Array.isArray(slot.matches)) setLiveMatches(slot.matches);
      }
      const res2 = await fetch(`/api/judge-slots/${code}/dancer-score`);
      if (res2.ok) {
        const myScores = await res2.json();
        const mapped: Record<string, DancerScoreInput> = {};
        for (const s of myScores as { registrationId: string; score: number }[]) {
          mapped[s.registrationId] = { score: s.score };
        }
        setMyDancerScores(mapped);
      }
    };
    const timer = setInterval(poll, 10000);
    return () => clearInterval(timer);
  }, [code, connectionStatus]);

  function selectScore(matchId: string, key: "scoreA" | "scoreB", value: number) {
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ?? { scoreA: null, scoreB: null }),
        [key]: value,
      },
    }));
  }

  async function submitMatchScore(matchId: string) {
    const matchScore = scores[matchId];
    if (!matchScore || matchScore.scoreA === null || matchScore.scoreB === null) return;

    setSubmitting((prev) => ({ ...prev, [matchId]: true }));

    const res = await fetch(`/api/matches/${matchId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scoreA: matchScore.scoreA,
        scoreB: matchScore.scoreB,
        judgeCode: code,
      }),
    });

    if (res.ok) {
      setSubmittedIds((prev) => new Set(prev).add(matchId));
    }

    setSubmitting((prev) => ({ ...prev, [matchId]: false }));
  }

  async function submitDancerScore(registrationId: string) {
    const score = draftScores[registrationId];
    if (score == null) return;

    setSubmitting((prev) => ({ ...prev, [registrationId]: true }));

    const res = await fetch(`/api/judge-slots/${code}/dancer-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registrationId,
        score,
        feedback: dancerFeedback[registrationId] || undefined,
      }),
    });

    if (res.ok) {
      setMyDancerScores((prev) => ({ ...prev, [registrationId]: { score } }));
      setDraftScores((prev) => ({ ...prev, [registrationId]: null }));
    }

    setSubmitting((prev) => ({ ...prev, [registrationId]: false }));
  }

  const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const matches = liveMatches;

  return (
    <section className="mt-section">
      <div className="flex items-center gap-sm mb-lg">
        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">
          {connectionStatus === "live"
            ? "LIVE"
            : connectionStatus === "offline"
              ? "CONNECTING..."
              : "DISCONNECTED"}
        </span>
        <span
          className={`h-2 w-2 rounded-full ${connectionStatus === "live" ? "bg-accent" : "bg-line"}`}
        />
      </div>

      {isRosterMode ? (
        <div>
          <div className="mb-lg border border-line p-lg">
            <p className="font-display text-title-md uppercase">
              {activeRound!.type === "CYPHER" ? "Cypher scoring" : "Qualifier scoring"}
            </p>
            <p className="mt-xs text-body-sm text-ink-muted">
              Score each dancer 0&ndash;10 as they perform. Scores are averaged across judges.
            </p>
          </div>
          <div className="grid gap-md lg:grid-cols-2">
            {data.category.registrations.map((reg, index) => {
              const mine = myDancerScores[reg.id];
              const draft = draftScores[reg.id];
              const isSubmitting = submitting[reg.id] ?? false;

              return (
                <article className="border border-line bg-paper-soft p-lg" key={reg.id}>
                  <div className="flex items-start justify-between gap-sm">
                    <div>
                      <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-xs font-display text-title-md uppercase">
                        {reg.user.name ?? "Unnamed"}
                      </h3>
                      <p className="mt-xs text-body-sm text-ink-muted">
                        Seed #{reg.seed ?? "—"}
                        {reg.crew ? ` / ${reg.crew}` : ""}
                        {reg.city ? ` / ${reg.city}` : ""}
                      </p>
                    </div>
                    {mine && (
                      <span className="border border-accent bg-accent px-sm py-xs font-mono text-title-md font-bold text-paper">
                        {mine.score}
                      </span>
                    )}
                  </div>

                  <div className="mt-lg">
                    <p className="text-body-sm font-bold uppercase text-ink-muted">
                      {mine ? "Update score" : "Select score"}
                    </p>
                    <div className="mt-sm flex flex-wrap gap-xs">
                      {SCORE_OPTIONS.map((n) => (
                        <button
                          className={`border px-sm py-xs text-body-sm font-bold uppercase ${
                            draft === n
                              ? "border-accent bg-accent text-paper"
                              : "border-line text-ink-muted hover:border-ink-muted"
                          }`}
                          disabled={isSubmitting}
                          key={`${reg.id}-${n}`}
                          onClick={() =>
                            setDraftScores((prev) => ({ ...prev, [reg.id]: n }))
                          }
                          type="button"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    className="mt-md w-full border border-line bg-paper px-md py-sm text-body-sm"
                    placeholder="Optional feedback"
                    value={dancerFeedback[reg.id] ?? ""}
                    onChange={(e) =>
                      setDancerFeedback((prev) => ({
                        ...prev,
                        [reg.id]: e.target.value,
                      }))
                    }
                  />

                  <button
                    className="mt-lg w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={draft == null || isSubmitting}
                    onClick={() => submitDancerScore(reg.id)}
                    type="button"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : mine
                        ? "Update score"
                        : "Submit score"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ) : matches.length === 0 ? (
        <p className="border border-line p-lg text-ink-muted">
          No active matches yet. Waiting for the organizer to start the round.
        </p>
      ) : (
        <div className="grid gap-md lg:grid-cols-2">
          {matches.map((match) => {
            const isSubmitted = submittedIds.has(match.id);
            const matchScore = scores[match.id] ?? { scoreA: null, scoreB: null };
            const bothSelected =
              matchScore.scoreA !== null && matchScore.scoreB !== null;
            const isSubmitting = submitting[match.id] ?? false;

            const nameA = match.competitorA?.user.name ?? "TBD";
            const nameB = match.competitorB?.user.name ?? "TBD";

            return (
              <article
                className={`border border-line bg-paper-soft p-lg ${isSubmitted ? "opacity-60" : ""}`}
                key={match.id}
              >
                <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                  Round {match.round} / Match {match.position} / {match.status}
                </p>

                <div className="mt-lg grid grid-cols-[1fr_auto] gap-sm text-title-md font-bold uppercase">
                  <span>{nameA}</span>
                  <span>{match.scoreA}</span>
                  <span>{nameB}</span>
                  <span>{match.scoreB}</span>
                </div>

                {isSubmitted ? (
                  <p className="mt-lg text-body-sm font-bold uppercase text-accent">
                    Score submitted
                  </p>
                ) : (
                  <>
                    <div className="mt-lg">
                      <p className="text-body-sm font-bold uppercase text-ink-muted">{nameA}</p>
                      <div className="mt-sm flex flex-wrap gap-xs">
                        {SCORE_OPTIONS.map((n) => (
                          <button
                            className={`border px-sm py-xs text-body-sm font-bold uppercase ${
                              matchScore.scoreA === n
                                ? "border-accent bg-accent text-paper"
                                : "border-line text-ink-muted hover:border-ink-muted"
                            }`}
                            disabled={isSubmitting}
                            key={`a-${match.id}-${n}`}
                            onClick={() => selectScore(match.id, "scoreA", n)}
                            type="button"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-lg">
                      <p className="text-body-sm font-bold uppercase text-ink-muted">{nameB}</p>
                      <div className="mt-sm flex flex-wrap gap-xs">
                        {SCORE_OPTIONS.map((n) => (
                          <button
                            className={`border px-sm py-xs text-body-sm font-bold uppercase ${
                              matchScore.scoreB === n
                                ? "border-accent bg-accent text-paper"
                                : "border-line text-ink-muted hover:border-ink-muted"
                            }`}
                            disabled={isSubmitting}
                            key={`b-${match.id}-${n}`}
                            onClick={() => selectScore(match.id, "scoreB", n)}
                            type="button"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="mt-xl w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!bothSelected || isSubmitting}
                      onClick={() => submitMatchScore(match.id)}
                      type="button"
                    >
                      {isSubmitting ? "Submitting..." : "Submit score"}
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
