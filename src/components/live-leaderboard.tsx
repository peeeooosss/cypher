"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { formatLabel } from "@/lib/event-types";
import { responseError } from "@/lib/client-error";

type LeaderboardScore = {
  score: number;
  roundFormatId: string;
  musicality?: number | null;
  foundation?: number | null;
  presentation?: number | null;
  execution?: number | null;
  judgeName: string;
};
type LeaderboardRegistration = {
  id: string;
  status: string;
  seed: number | null;
  crew: string | null;
  teamName: string | null;
  name: string;
  members: { id: string; name: string; role: string }[];
  dancerScores: LeaderboardScore[];
};
type LeaderboardRound = {
  id: string;
  order: number;
  type: string;
  label: string | null;
  phaseStatus: string | null;
};
type LeaderboardMatch = {
  id: string;
  roundFormatId: string | null;
  round: number;
  position: number;
  status: string;
  redName: string;
  blueName: string;
  winnerId: string | null;
  winnerName: string | null;
  redMembers: string[];
  blueMembers: string[];
  scores: {
    judgeName: string;
    winnerCorner: string | null;
    scoreA: number | null;
    scoreB: number | null;
    sectionsA: { musicality: number; foundation: number; presentation: number; execution: number } | null;
    sectionsB: { musicality: number; foundation: number; presentation: number; execution: number } | null;
  }[];
};
type LeaderboardCategory = {
  categoryId: string;
  name: string;
  format: string | null;
  minMembers: number;
  maxMembers: number;
  currentPhaseOrder: number | null;
  rounds: LeaderboardRound[];
  registrations: LeaderboardRegistration[];
  matches: LeaderboardMatch[];
};
type LeaderboardData = {
  eventId: string;
  title: string;
  status: string;
  categories: LeaderboardCategory[];
};

const NUMERIC_PHASES = ["CYPHER", "QUALIFIER"];

export function LiveLeaderboard({
  eventId,
  title,
  compact = false,
}: {
  eventId: string;
  title: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("offline");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/leaderboard`);
      if (!res.ok) {
        setError(await responseError(res, "Unable to load leaderboard"));
        return;
      }
      const json = (await res.json()) as LeaderboardData;
      setData(json);
      setError("");
    } catch {
      setError("Network error. Please try again.");
    }
  }, [eventId]);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/leaderboard`);
        if (res.ok) {
          const json = (await res.json()) as LeaderboardData;
          setData(json);
          setError("");
          if (json.categories.length > 0) {
            const first = json.categories[0];
            setCategoryId(first.categoryId);
            setFormatFilter(first.format ?? "SOLO");
            const active = first.rounds.find((r) => r.phaseStatus === "ACTIVE") ?? first.rounds[0];
            setPhaseId(active?.id ?? "");
          }
        } else {
          setError(await responseError(res, "Unable to load leaderboard"));
        }
      } catch {
        setError("Network error. Please try again.");
      }
    };
    void loadInitial();
  }, [eventId]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
    const socket = io(socketUrl);

    socket.on("connect", () => {
      setConnectionStatus("live");
      socket.emit("event:join", { eventId }, (ack: { error?: string }) => {
        if (ack?.error) setConnectionStatus("error");
      });
    });

    socket.on("disconnect", () => setConnectionStatus("offline"));

    const refresh = async () => {
      await load();
    };

    socket.on("dancer:updated", () => void refresh());
    socket.on("match:updated", () => void refresh());
    socket.on("event:state", () => void refresh());
    socket.on("leaderboard:update", () => void refresh());
    socket.on("score_submitted", () => void refresh());
    socket.on("score_locked", () => void refresh());
    socket.on("match_live", () => void refresh());
    socket.on("match_complete", () => void refresh());

    return () => {
      socket.disconnect();
    };
  }, [eventId, load]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (error) {
    return (
      <section className="border border-line p-lg text-body-sm text-ink-muted">
        {error}
      </section>
    );
  }

  if (!data) {
    return (
      <section className="border border-line p-lg text-body-sm text-ink-muted">
        Loading leaderboard...
      </section>
    );
  }

  const selectedCategory = data.categories.find((c) => c.categoryId === categoryId);
  const selectedPhase = selectedCategory?.rounds.find((r) => r.id === phaseId);
  const isNumeric = selectedPhase != null && NUMERIC_PHASES.includes(selectedPhase.type);

  const ranked = (selectedCategory?.registrations ?? [])
    .map((reg) => {
      const phaseScores = reg.dancerScores.filter((s) => s.roundFormatId === phaseId);
      return {
        reg,
        total: phaseScores.reduce((sum, s) => sum + s.score, 0),
        judges: phaseScores.length,
      };
    })
    .filter((r) => r.judges > 0)
    .sort((a, b) => b.total - a.total || (a.reg.seed ?? 999) - (b.reg.seed ?? 999))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const selectedMatches = selectedCategory
    ? selectedCategory.matches.filter((match) => match.roundFormatId === phaseId)
    : [];
  const matchRounds = selectedMatches.length > 0
    ? [...new Set(selectedMatches.map((m) => m.round))].sort((a, b) => a - b)
    : [];
  const availableFormats = [...new Set(data.categories.map((category) => category.format ?? "SOLO"))];

  return (
    <section className="mt-section">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div>
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Live leaderboard</p>
          <h2 className="mt-xs font-display text-title-md uppercase">{title}</h2>
        </div>
        <span className="flex items-center gap-md">
          <button
            className="border border-line px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
            disabled={refreshing}
            onClick={() => void handleRefresh()}
            type="button"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <span className="flex items-center gap-sm font-mono text-[0.7rem] uppercase">
            {connectionStatus === "live" ? "LIVE" : "SYNCING..."}
            <span
              className={`h-2 w-2 rounded-full ${connectionStatus === "live" ? "bg-accent" : "bg-line"}`}
            />
          </span>
        </span>
      </div>

      <div className="mt-md flex flex-wrap gap-md">
        <label className="flex flex-col gap-xs">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Format</span>
          <select
            className="border border-line bg-paper px-md py-sm text-body-sm"
            value={formatFilter}
            onChange={(e) => {
              const format = e.target.value;
              const category = data.categories.find((item) => (item.format ?? "SOLO") === format);
              setFormatFilter(format);
              setCategoryId(category?.categoryId ?? "");
              const active = category?.rounds.find((r) => r.phaseStatus === "ACTIVE") ?? category?.rounds[0];
              setPhaseId(active?.id ?? "");
            }}
          >
            {availableFormats.map((format) => <option key={format} value={format}>{formatLabel(format)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-xs">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Category</span>
          <select
            className="border border-line bg-paper px-md py-sm text-body-sm"
            value={categoryId}
            onChange={(e) => {
               const id = e.target.value;
               const cat = data.categories.find((c) => c.categoryId === id);
               setCategoryId(id);
               setFormatFilter(cat?.format ?? "SOLO");
              const active = cat?.rounds.find((r) => r.phaseStatus === "ACTIVE") ?? cat?.rounds[0];
              setPhaseId(active?.id ?? "");
            }}
          >
            {data.categories.map((c) => (
              <option key={c.categoryId} value={c.categoryId}>
                {c.name} · {formatLabel(c.format)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-xs">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Phase</span>
          <select
            className="border border-line bg-paper px-md py-sm text-body-sm"
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
          >
            {(selectedCategory?.rounds ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.label ?? r.type.replace("_", " ")}
                {r.phaseStatus === "ACTIVE" ? " (active)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!selectedCategory ? (
        <p className="mt-lg border border-line p-lg text-body-sm text-ink-muted">
          No categories yet.
        </p>
      ) : isNumeric ? (
        <div className="mt-lg border border-line">
          <div className="flex flex-wrap items-center justify-between gap-sm border-b border-line bg-paper-soft px-md py-sm">
            <p className="font-display text-title-md uppercase">
              {selectedPhase?.type === "CYPHER" ? "Cypher result" : selectedPhase?.type === "QUALIFIER" ? "Qualifier result" : selectedPhase?.label ?? "Scoring round"}
            </p>
            <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
              Section scores · summed across judges
            </p>
          </div>

          {ranked.length === 0 ? (
            <p className="p-lg text-body-sm text-ink-muted">
              No scores yet for this phase. Judges are scoring live.
            </p>
          ) : (
            <div className={compact ? "" : ""}>
              {ranked.map((row) => (
                <div
                  key={row.reg.id}
                  className="flex items-center gap-md border-b border-line px-md py-sm"
                >
                  <span
                    className={`w-10 shrink-0 text-center font-mono text-display-lg font-bold ${
                      row.rank === 1 ? "text-accent" : row.rank === 2 ? "text-ink" : "text-ink-muted"
                    }`}
                  >
                    {row.rank}
                  </span>
                   <div className="min-w-0 flex-1">
                     <p className="truncate text-body-md font-bold uppercase">{row.reg.name}</p>
                      <p className="text-[0.7rem] uppercase text-ink-muted">
                        {row.reg.members.length > 1 ? row.reg.members.map((member) => member.name).join(" · ") : (row.reg.crew ?? formatLabel(selectedCategory?.format))}
                       {row.reg.seed != null ? ` / Seed #${row.reg.seed}` : ""}
                     </p>
                   </div>
                   <span className={`border px-sm py-xs font-mono text-[0.6rem] uppercase ${row.reg.status === "CONFIRMED" ? "border-accent text-accent" : "border-line text-ink-muted"}`}>
                     {row.reg.status === "CONFIRMED" ? "Advanced" : "Eliminated"}
                   </span>
                  <span className="font-mono text-title-md font-bold text-accent">{row.total}</span>
                  <span className="w-20 text-right text-xs uppercase text-ink-muted">
                    {row.judges} judge{row.judges === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-line">
            <div className="bg-paper-soft px-md py-sm">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-muted">
                Per-judge breakdown
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem]">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[0.6rem] uppercase text-ink-muted">
                    <th className="px-md py-sm">Entry</th>
                    <th className="px-md py-sm">Judge</th>
                    <th className="px-md py-sm text-right">Musicality</th>
                    <th className="px-md py-sm text-right">Foundation</th>
                    <th className="px-md py-sm text-right">Presentation</th>
                    <th className="px-md py-sm text-right">Execution</th>
                    <th className="px-md py-sm text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCategory.registrations
                    .filter((reg) => reg.status !== "WITHDRAWN")
                    .flatMap((reg) => {
                      const phaseScores = reg.dancerScores.filter((s) => s.roundFormatId === phaseId);
                      if (phaseScores.length === 0) return [];
                      return phaseScores.map((s) => ({
                        regName: reg.name,
                        score: s,
                      }));
                    })
                    .sort((a, b) => b.score.score - a.score.score)
                    .map((row, i) => (
                      <tr key={i} className="border-b border-line">
                        <td className="px-md py-sm text-body-sm font-bold uppercase">{row.regName}</td>
                        <td className="px-md py-sm text-body-sm text-ink-muted">{row.score.judgeName}</td>
                        <td className="px-md py-sm text-right font-mono text-body-sm">{row.score.musicality?.toFixed(1) ?? "—"}</td>
                        <td className="px-md py-sm text-right font-mono text-body-sm">{row.score.foundation?.toFixed(1) ?? "—"}</td>
                        <td className="px-md py-sm text-right font-mono text-body-sm">{row.score.presentation?.toFixed(1) ?? "—"}</td>
                        <td className="px-md py-sm text-right font-mono text-body-sm">{row.score.execution?.toFixed(1) ?? "—"}</td>
                        <td className="px-md py-sm text-right font-mono text-body-sm font-bold text-accent">{row.score.score.toFixed(1)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-lg space-y-lg">
          <div className="flex flex-wrap items-center justify-between gap-sm border border-line bg-paper-soft px-md py-sm">
            <p className="font-display text-title-md uppercase">
              {selectedPhase?.label ?? "Battles"}
            </p>
            <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
              Section scores · summed across judges
            </p>
          </div>

          {matchRounds.length === 0 ? (
            <p className="border border-line p-lg text-body-sm text-ink-muted">
              No battle matches yet for this phase.
            </p>
          ) : (
            matchRounds.map((round) => {
              const matches = selectedMatches
                .filter((m) => m.round === round)
                .sort((a, b) => a.position - b.position);
              return (
                <div key={round} className="border border-line">
                  <div className="border-b border-line bg-paper-soft px-md py-sm">
                    <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                      Bracket round {round}
                    </p>
                  </div>
                  {matches.map((m) => {
                    const redVotes = m.scores.filter((s) => s.winnerCorner === "RED").length;
                    const blueVotes = m.scores.filter((s) => s.winnerCorner === "BLUE").length;
                    const hasSections = m.scores.some((s) => s.sectionsA != null || s.sectionsB != null);
                    const redTotal = m.scores.reduce((sum, s) => sum + (s.scoreA ?? 0), 0);
                    const blueTotal = m.scores.reduce((sum, s) => sum + (s.scoreB ?? 0), 0);
                    const scoreLine = hasSections
                      ? `Red ${redTotal.toFixed(1)} · Blue ${blueTotal.toFixed(1)}`
                      : m.scores.some((score) => score.winnerCorner)
                        ? `Red ${redVotes} · Blue ${blueVotes}`
                        : "Direct decision";
                    const decided = m.status === "COMPLETE" && m.winnerName;
                    return (
                      <div key={m.id} className="border-b border-line px-md py-md">
                        <div className="flex flex-wrap items-center gap-md">
                          <span className="w-10 font-mono text-xs uppercase text-ink-muted">
                            M{m.position}
                          </span>
                           <span className="flex-1">
                            <span className="font-display text-title-sm uppercase text-accent">
                              {m.redName}
                           </span>
                            <span className="mx-sm text-ink-muted">vs</span>
                            <span className="font-display text-title-sm uppercase text-[#2980FF]">
                              {m.blueName}
                            </span>
                          </span>
                           <span className="font-mono text-[0.7rem] uppercase text-ink-muted">
                             {scoreLine}
                           </span>
                          <span
                            className={`border px-md py-xs font-mono text-[0.7rem] uppercase ${
                              decided
                                ? "border-accent text-accent"
                                : m.status === "LIVE" || m.status === "LOCKED"
                                  ? "border-line text-ink"
                                  : "border-line text-ink-muted"
                            }`}
                          >
                            {decided ? `Winner: ${m.winnerName}` : m.status.toLowerCase()}
                          </span>
                         </div>
                         {(m.redMembers.length > 0 || m.blueMembers.length > 0) && (
                           <p className="mt-xs pl-10 text-[0.7rem] uppercase text-ink-muted">{m.redMembers.join(" · ") || "TBD"} vs {m.blueMembers.join(" · ") || "TBD"}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
