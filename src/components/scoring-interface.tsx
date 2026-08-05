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

type SlotData = {
  category: {
    id: string;
    name: string;
    event: { id: string; title: string };
    matches: MatchDisplay[];
  };
};

export function ScoringInterface({ code, data }: { code: string; data: SlotData }) {
  const [liveMatches, setLiveMatches] = useState(data.category.matches);
  const [connectionStatus, setConnectionStatus] = useState("offline");
  const matches = liveMatches;
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Record<string, { scoreA: number | null; scoreB: number | null }>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
    const socket = io(socketUrl, {
      query: { code },
      withCredentials: true,
    });

    socket.on("connect", () => {
      setConnectionStatus("live");
      socket.emit("event:join", { eventId: data.category.event.id }, (ack: { error?: string }) => {
        if (ack?.error) setConnectionStatus("error");
      });
    });

    socket.on("disconnect", () => setConnectionStatus("offline"));

    socket.on("event:state", (matches) => {
      setLiveMatches(matches);
    });

    socket.on("match:updated", ({ match }) => {
      setLiveMatches((current) => current.map((m) => (m.id === match.id ? { ...m, ...match } : m)));
    });

    return () => { socket.disconnect(); };
  }, [code, data.category.event.id]);

  function selectScore(matchId: string, key: "scoreA" | "scoreB", value: number) {
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ?? { scoreA: null, scoreB: null }),
        [key]: value,
      },
    }));
  }

  async function submitScore(matchId: string) {
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

  const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <section className="mt-section">
      <div className="flex items-center gap-sm mb-lg">
        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">
          {connectionStatus === "live" ? "LIVE" : connectionStatus === "offline" ? "CONNECTING..." : "DISCONNECTED"}
        </span>
        <span className={`h-2 w-2 rounded-full ${connectionStatus === "live" ? "bg-accent" : "bg-line"}`} />
      </div>
      {matches.length === 0 ? (
        <p className="border border-line p-lg text-ink-muted">No matches available yet.</p>
      ) : (
        <div className="grid gap-md lg:grid-cols-2">
          {matches.map((match) => {
            const isSubmitted = submittedIds.has(match.id);
            const matchScore = scores[match.id] ?? { scoreA: null, scoreB: null };
            const bothSelected = matchScore.scoreA !== null && matchScore.scoreB !== null;
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
                  <p className="mt-lg text-body-sm font-bold uppercase text-accent">Score submitted</p>
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
                            key={`a-${n}`}
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
                            key={`b-${n}`}
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
                      onClick={() => submitScore(match.id)}
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
