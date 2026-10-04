"use client";

import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { responseError } from "@/lib/client-error";
import { ScoringSectionGrid } from "@/components/scoring-section-grid";
import { EMPTY_SECTIONS, sectionTotal, type SectionScores } from "@/lib/scoring-sections";

type Competitor = { teamName?: string | null; user: { name: string | null }; members?: { user: { name: string | null; username: string | null } }[] } | null;

type VoteCorner = "RED" | "BLUE";

type MatchDisplay = {
  id: string;
  round: number;
  position: number;
  status: string;
  scoreA: number;
  scoreB: number;
  competitorA: Competitor;
  competitorB: Competitor;
  scores: { winnerCorner: string | null; judgeSlot: { name: string | null } }[];
};

type RegistrationDisplay = {
  id: string;
  seed: number | null;
  crew: string | null;
  teamName?: string | null;
  members?: { user: { name: string | null; username: string | null } }[];
  city: string | null;
  status: string;
  user: { name: string | null; email: string | null };
  dancerScores: { roundFormatId: string; score: number; judgeSlotId: string; feedback?: string | null; musicality?: number | null; foundation?: number | null; presentation?: number | null; execution?: number | null }[];
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

type DancerScoreInput = {
  score: number;
  feedback?: string;
  sections?: SectionScores;
};

function initialMyScores(
  registrations: RegistrationDisplay[],
  slotId: string,
): Record<string, DancerScoreInput> {
  const result: Record<string, DancerScoreInput> = {};
  for (const reg of registrations) {
    const mine = reg.dancerScores.find((s) => s.judgeSlotId === slotId);
    if (mine) {
      const sections: SectionScores =
        mine.musicality != null && mine.foundation != null && mine.presentation != null && mine.execution != null
          ? { MUSICALITY: mine.musicality, FOUNDATION: mine.foundation, PRESENTATION: mine.presentation, EXECUTION: mine.execution }
          : { ...EMPTY_SECTIONS };
      result[reg.id] = { score: mine.score, feedback: mine.feedback ?? undefined, sections };
    }
  }
  return result;
}

function initialDancerFeedback(
  registrations: RegistrationDisplay[],
  slotId: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const reg of registrations) {
    const mine = reg.dancerScores.find((s) => s.judgeSlotId === slotId);
    if (mine?.feedback) result[reg.id] = mine.feedback;
  }
  return result;
}

export function ScoringInterface({
  code,
  slotId,
  data,
  activeRound: initialActiveRound,
}: {
  code: string;
  slotId: string;
  data: SlotData;
  activeRound: RoundDisplay | null;
}) {
  const [liveMatches, setLiveMatches] = useState(data.category.matches);
  const [registrations, setRegistrations] = useState(data.category.registrations);
  const [rounds, setRounds] = useState(data.category.rounds);
  const [currentPhaseOrder, setCurrentPhaseOrder] = useState(data.category.currentPhaseOrder);
  const [myDancerScores, setMyDancerScores] = useState<
    Record<string, DancerScoreInput>
  >(() => initialMyScores(data.category.registrations, slotId));
  const [connectionStatus, setConnectionStatus] = useState("offline");
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Record<string, VoteCorner>>({});
  const [matchFeedback, setMatchFeedback] = useState<
    Record<string, { red: string; blue: string }>
  >({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [draftScores, setDraftScores] = useState<Record<string, SectionScores | null>>(
    () => Object.fromEntries(data.category.registrations.map((reg) => [reg.id, null])),
  );
  const [dancerFeedback, setDancerFeedback] = useState<Record<string, string>>(() => initialDancerFeedback(data.category.registrations, slotId));
  const [error, setError] = useState("");

  const eventId = data.category.event.id;

  const activeRound = rounds.find((r) => r.order === currentPhaseOrder && r.phaseStatus === "ACTIVE") ?? initialActiveRound ?? null;

  const isRosterMode =
    activeRound != null &&
    ["CYPHER", "QUALIFIER"].includes(activeRound.type) &&
    registrations.length > 0;

  const fetchFullData = useCallback(async () => {
    try {
      const res = await fetch(`/api/judge-slots/${code}`);
      if (!res.ok) {
        setError(await responseError(res, "Failed to refresh scoring data."));
        return;
      }
      const slot = await res.json();
      if (Array.isArray(slot.matches)) setLiveMatches(slot.matches);
      if (slot.category?.rounds) setRounds(slot.category.rounds);
      if (slot.category?.currentPhaseOrder != null) setCurrentPhaseOrder(slot.category.currentPhaseOrder);
      if (slot.category?.registrations) setRegistrations(slot.category.registrations);
      setError("");
    } catch {
      setError("Network error. Please try again.");
    }
  }, [code]);

  // Socket connection
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

    socket.on("dancer:updated", ({ judgeSlotId, registrationId, score, sections, feedback }) => {
      if (judgeSlotId !== slotId) return;
      setMyDancerScores((prev) => ({ ...prev, [registrationId]: { score, feedback: feedback ?? undefined, sections } }));
      if (feedback) setDancerFeedback((prev) => ({ ...prev, [registrationId]: feedback }));
      setDraftScores((prev) => ({ ...prev, [registrationId]: null }));
    });

    socket.on("registration:withdrawn", ({ registrationIds }) => {
      setRegistrations((prev) =>
        prev.map((reg) =>
          registrationIds.includes(reg.id) ? { ...reg, status: "WITHDRAWN" } : reg,
        ),
      );
    });

    socket.on("phase:activated", ({ phaseId, phaseOrder, type, label }) => {
      setRounds((prev) =>
        prev.map((r) =>
          r.id === phaseId ? { ...r, phaseStatus: "ACTIVE", order: phaseOrder, type, label } : r,
        ),
      );
      setCurrentPhaseOrder(phaseOrder);
    });

    socket.on("phase:completed", ({ phaseId }) => {
      setRounds((prev) => prev.map((r) => (r.id === phaseId ? { ...r, phaseStatus: "COMPLETE" } : r)));
    });

    socket.on("bracket:generated", ({ matches }) => {
      if (Array.isArray(matches)) setLiveMatches(matches);
    });

    socket.on("leaderboard:update", () => {
      fetchFullData();
    });

    return () => {
      socket.disconnect();
    };
  }, [code, eventId, slotId, fetchFullData]);

  // Polling fallback when the socket server is unreachable
  useEffect(() => {
    const poll = async () => {
      if (connectionStatus === "live") return;
      await fetchFullData();
    };
    const timer = setInterval(poll, 10000);
    return () => clearInterval(timer);
  }, [code, connectionStatus, fetchFullData]);

  function selectVote(matchId: string, corner: VoteCorner) {
    setVotes((prev) => ({ ...prev, [matchId]: corner }));
  }

  async function submitMatchVote(matchId: string) {
    const winnerCorner = votes[matchId];
    if (!winnerCorner) return;

    const notes = matchFeedback[matchId] ?? { red: "", blue: "" };

    setSubmitting((prev) => ({ ...prev, [matchId]: true }));
    setError("");
    try {
      const res = await fetch(`/api/matches/${matchId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerCorner,
          judgeCode: code,
          feedbackRed: notes.red || undefined,
          feedbackBlue: notes.blue || undefined,
        }),
      });

      if (!res.ok) {
        setError(await responseError(res, "Failed to submit vote."));
        return;
      }
      setSubmittedIds((prev) => new Set(prev).add(matchId));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting((prev) => ({ ...prev, [matchId]: false }));
    }
  }

  async function submitDancerScore(registrationId: string) {
    const sections = draftScores[registrationId];
    if (!sections) return;

    const total = sectionTotal(sections);
    if (total <= 0) return;

    setSubmitting((prev) => ({ ...prev, [registrationId]: true }));
    setError("");
    try {
      const res = await fetch(`/api/judge-slots/${code}/dancer-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId,
          score: total,
          sections: {
            musicality: sections.MUSICALITY,
            foundation: sections.FOUNDATION,
            presentation: sections.PRESENTATION,
            execution: sections.EXECUTION,
          },
          feedback: dancerFeedback[registrationId] || undefined,
        }),
      });

      if (!res.ok) {
        setError(await responseError(res, "Failed to submit score."));
        return;
      }
      setMyDancerScores((prev) => ({
        ...prev,
        [registrationId]: { score: total, sections },
      }));
      setDraftScores((prev) => ({ ...prev, [registrationId]: null }));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting((prev) => ({ ...prev, [registrationId]: false }));
    }
  }

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
      {error ? <p className="mb-lg text-body-sm text-accent">{error}</p> : null}

      {isRosterMode ? (
        <div>
          <div className="mb-lg border border-line p-lg">
            <p className="font-display text-title-md uppercase">
              {activeRound!.type === "CYPHER" ? "Cypher scoring" : "Qualifier scoring"}
            </p>
            <p className="mt-xs text-body-sm text-ink-muted">
              Score each entry across 4 sections (0&ndash;5 each, max 20) as they perform. Scores are summed across judges.
            </p>
          </div>
          <div className="grid gap-md lg:grid-cols-2">
            {registrations
              .filter((r) => r.status !== "WITHDRAWN")
              .map((reg, index) => {
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
                           {reg.teamName ?? reg.user.name ?? "Unnamed"}
                           {reg.members && reg.members.length > 1 ? <span className="ml-sm text-xs text-ink-muted">{reg.members.map((member) => member.user.name ?? member.user.username ?? "Unnamed").join(" · ")}</span> : null}
                        </h3>
                        <p className="mt-xs text-body-sm text-ink-muted">
                          Seed #{reg.seed ?? "—"}
                          {reg.crew ? ` / ${reg.crew}` : ""}
                          {reg.city ? ` / ${reg.city}` : ""}
                        </p>
                      </div>
                      {mine && (
                        <span className="border border-accent bg-accent px-sm py-xs font-mono text-title-md font-bold text-paper">
                          {mine.score.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="mt-lg">
                      <p className="text-body-sm font-bold uppercase text-ink-muted">
                        {mine ? "Update score" : "Score"}
                      </p>
                      <ScoringSectionGrid
                        className="mt-sm"
                        value={draft ?? { ...EMPTY_SECTIONS }}
                        onChange={(next) =>
                          setDraftScores((prev) => ({ ...prev, [reg.id]: next }))
                        }
                      />
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
                      disabled={!draft || isSubmitting || sectionTotal(draft) <= 0}
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
          {registrations.some((r) => r.status === "WITHDRAWN") && (
            <p className="mt-md text-body-sm text-ink-muted">
              {registrations.filter((r) => r.status === "WITHDRAWN").length} entr{registrations.filter((r) => r.status === "WITHDRAWN").length === 1 ? "y" : "ies"} eliminated.
            </p>
          )}
        </div>
      ) : matches.length === 0 ? (
        <p className="border border-line p-lg text-ink-muted">
          No active matches yet. Waiting for the organizer to start the round.
        </p>
      ) : (
        <div className="grid gap-md lg:grid-cols-2">
          {matches.map((match) => {
            const isSubmitted = submittedIds.has(match.id);
            const myVote = votes[match.id] ?? null;
            const isSubmitting = submitting[match.id] ?? false;

             const nameA = match.competitorA?.teamName ?? match.competitorA?.user.name ?? "TBD";
             const nameB = match.competitorB?.teamName ?? match.competitorB?.user.name ?? "TBD";
            const notes = matchFeedback[match.id] ?? { red: "", blue: "" };

            const redVotes = match.scores.filter((s) => s.winnerCorner === "RED").length;
            const blueVotes = match.scores.filter((s) => s.winnerCorner === "BLUE").length;

            return (
              <article
                className={`border border-line bg-paper-soft p-lg ${isSubmitted ? "opacity-70" : ""}`}
                key={match.id}
              >
                <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                  Round {match.round} / Match {match.position} / {match.status}
                </p>

                <div className="mt-lg space-y-sm">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent">Red</p>
                  <p className="break-words font-display text-body-md uppercase leading-tight text-accent">
                    {nameA}
                  </p>
                  <p className="break-words font-mono text-[0.65rem] uppercase text-ink-muted">{match.scoreA}</p>
                </div>

                <div className="mt-md space-y-sm">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#2980FF]">Blue</p>
                  <p className="break-words font-display text-body-md uppercase leading-tight text-[#2980FF]">
                    {nameB}
                  </p>
                  <p className="break-words font-mono text-[0.65rem] uppercase text-ink-muted">{match.scoreB}</p>
                </div>

                <p className="mt-md border-t border-line pt-sm font-mono text-[0.65rem] uppercase text-ink-muted">
                  {redVotes + blueVotes > 0
                    ? `Votes: red ${redVotes} / blue ${blueVotes}`
                    : "No votes yet"}
                </p>

                {isSubmitted ? (
                  <p className="mt-lg border border-accent px-md py-sm text-center font-display text-body-sm uppercase text-accent">
                    Vote recorded{myVote ? `: ${myVote === "RED" ? "Red" : "Blue"}` : ""} — you can
                    change it
                  </p>
                ) : null}

                <div className="mt-lg grid grid-cols-2 gap-sm">
                  <button
                    type="button"
                    className={`border-2 border-accent px-md py-md text-center font-display uppercase ${
                      myVote === "RED" ? "bg-accent text-paper" : "text-accent"
                    }`}
                    onClick={() => selectVote(match.id, "RED")}
                  >
                    Vote red
                  </button>
                  <button
                    type="button"
                    className={`border-2 border-[#2980FF] px-md py-md text-center font-display uppercase ${
                      myVote === "BLUE" ? "bg-[#2980FF] text-paper" : "text-[#2980FF]"
                    }`}
                    onClick={() => selectVote(match.id, "BLUE")}
                  >
                    Vote blue
                  </button>
                </div>

                <div className="mt-md space-y-xs">
                  <input
                    className="w-full border border-line bg-paper px-md py-sm text-body-sm"
                    placeholder={`Feedback for ${nameA} (optional)`}
                    value={notes.red}
                    maxLength={500}
                    onChange={(e) =>
                      setMatchFeedback((prev) => ({
                        ...prev,
                        [match.id]: { ...notes, red: e.target.value },
                      }))
                    }
                  />
                  <input
                    className="w-full border border-line bg-paper px-md py-sm text-body-sm"
                    placeholder={`Feedback for ${nameB} (optional)`}
                    value={notes.blue}
                    maxLength={500}
                    onChange={(e) =>
                      setMatchFeedback((prev) => ({
                        ...prev,
                        [match.id]: { ...notes, blue: e.target.value },
                      }))
                    }
                  />
                </div>

                <button
                  className="mt-lg w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!myVote || isSubmitting}
                  onClick={() => void submitMatchVote(match.id)}
                  type="button"
                >
                  {isSubmitting ? "Submitting..." : isSubmitted ? "Update vote" : "Submit vote"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
