"use client";

import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { responseError } from "@/lib/client-error";
import { ScoringSectionGrid } from "@/components/scoring-section-grid";
import { EMPTY_SECTIONS, sectionTotal, type SectionScores } from "@/lib/scoring-sections";

type Competitor = { teamName?: string | null; user: { name: string | null }; members?: { user: { name: string | null; username: string | null } }[] } | null;

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
  teamName?: string | null;
  members?: { user: { name: string | null; username: string | null } }[];
  city: string | null;
  status: string;
  user: { name: string | null; email: string };
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
  const [scores, setScores] = useState<
    Record<string, { sectionsA: SectionScores | null; sectionsB: SectionScores | null }>
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

  function selectSections(matchId: string, key: "sectionsA" | "sectionsB", value: SectionScores) {
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ?? { sectionsA: null, sectionsB: null }),
        [key]: value,
      },
    }));
  }

  async function submitMatchScore(matchId: string) {
    const matchScore = scores[matchId];
    if (!matchScore || !matchScore.sectionsA || !matchScore.sectionsB) return;
    const scoreA = sectionTotal(matchScore.sectionsA);
    const scoreB = sectionTotal(matchScore.sectionsB);
    if (scoreA <= 0 || scoreB <= 0) return;

    setSubmitting((prev) => ({ ...prev, [matchId]: true }));
    setError("");
    try {
      const res = await fetch(`/api/matches/${matchId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreA,
          scoreB,
          sectionsA: {
            musicality: matchScore.sectionsA.MUSICALITY,
            foundation: matchScore.sectionsA.FOUNDATION,
            presentation: matchScore.sectionsA.PRESENTATION,
            execution: matchScore.sectionsA.EXECUTION,
          },
          sectionsB: {
            musicality: matchScore.sectionsB.MUSICALITY,
            foundation: matchScore.sectionsB.FOUNDATION,
            presentation: matchScore.sectionsB.PRESENTATION,
            execution: matchScore.sectionsB.EXECUTION,
          },
          judgeCode: code,
        }),
      });

      if (!res.ok) {
        setError(await responseError(res, "Failed to submit score."));
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
            const matchScore = scores[match.id] ?? { sectionsA: null, sectionsB: null };
            const bothSelected =
              matchScore.sectionsA != null && matchScore.sectionsB != null;
            const isSubmitting = submitting[match.id] ?? false;

             const nameA = match.competitorA?.teamName ?? match.competitorA?.user.name ?? "TBD";
             const nameB = match.competitorB?.teamName ?? match.competitorB?.user.name ?? "TBD";

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
                      <ScoringSectionGrid
                        className="mt-sm"
                        value={matchScore.sectionsA ?? { ...EMPTY_SECTIONS }}
                        onChange={(next) => selectSections(match.id, "sectionsA", next)}
                      />
                    </div>

                    <div className="mt-lg">
                      <p className="text-body-sm font-bold uppercase text-ink-muted">{nameB}</p>
                      <ScoringSectionGrid
                        className="mt-sm"
                        value={matchScore.sectionsB ?? { ...EMPTY_SECTIONS }}
                        onChange={(next) => selectSections(match.id, "sectionsB", next)}
                      />
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
