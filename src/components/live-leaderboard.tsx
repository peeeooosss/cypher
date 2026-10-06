"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { formatLabel } from "@/lib/event-types";
import { responseError } from "@/lib/client-error";

type LeaderboardScore = {
  score: number;
  roundFormatId: string;
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
    winnerCorner: string | null;
    scoreA: number | null;
    scoreB: number | null;
    hasSections: boolean;
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

function preferredRound(rounds: LeaderboardRound[]): LeaderboardRound | undefined {
  return (
    rounds.find((round) => round.phaseStatus === "ACTIVE") ??
    [...rounds].reverse().find((round) => round.phaseStatus === "COMPLETE") ??
    rounds[0]
  );
}

type RankedRowData = {
  reg: LeaderboardRegistration;
  total: number;
  judges: number;
  rank: number;
};

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`w-9 shrink-0 text-center font-mono text-title-md font-bold ${
        rank === 1 ? "text-accent" : rank === 2 ? "text-ink" : "text-ink-muted"
      }`}
    >
      {rank}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 border px-sm py-xs font-mono text-[0.6rem] uppercase ${
        status === "CONFIRMED" ? "border-accent text-accent" : "border-line text-ink-muted"
      }`}
    >
      {status === "CONFIRMED" ? "Advanced" : "Eliminated"}
    </span>
  );
}

function MemberLine({ names, fallback }: { names: string[]; fallback: string }) {
  if (names.length > 1) {
    return <>{names.join(" · ")}</>;
  }
  return <>{fallback}</>;
}

function RankedRow({ row, fallbackLabel }: { row: RankedRowData; fallbackLabel: string }) {
  return (
    <>
      {/* Phones: stacked card so long names wrap in full instead of truncating to "...". */}
      <div className="border-b border-line px-md py-md md:hidden">
        <div className="flex items-start gap-sm">
          <RankBadge rank={row.rank} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-body-md font-bold uppercase leading-tight">
              {row.reg.name}
            </p>
            <p className="mt-xs break-words text-[0.7rem] uppercase leading-snug text-ink-muted">
              <MemberLine names={row.reg.members.map((m) => m.name)} fallback={row.reg.crew ?? fallbackLabel} />
            </p>
            <div className="mt-sm flex flex-wrap items-center gap-sm">
              <StatusBadge status={row.reg.status} />
              {row.reg.seed != null ? (
                <span className="font-mono text-[0.65rem] uppercase text-ink-muted">
                  Seed #{row.reg.seed}
                </span>
              ) : null}
              <span className="font-mono text-[0.65rem] uppercase text-ink-muted">
                {row.judges} judge{row.judges === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <span className="shrink-0 pt-xs font-mono text-title-md font-bold text-accent">
            {row.total}
          </span>
        </div>
      </div>

      {/* Tablet and desktop: single dense row. */}
      <div className="hidden items-center gap-md border-b border-line px-md py-sm md:flex">
        <RankBadge rank={row.rank} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md font-bold uppercase">{row.reg.name}</p>
          <p className="truncate text-[0.7rem] uppercase text-ink-muted">
            <MemberLine names={row.reg.members.map((m) => m.name)} fallback={row.reg.crew ?? fallbackLabel} />
            {row.reg.seed != null ? ` / Seed #${row.reg.seed}` : ""}
          </p>
        </div>
        <StatusBadge status={row.reg.status} />
        <span className="shrink-0 font-mono text-title-md font-bold text-accent">{row.total}</span>
        <span className="hidden w-20 text-right text-xs uppercase text-ink-muted lg:block">
          {row.judges} judge{row.judges === 1 ? "" : "s"}
        </span>
      </div>
    </>
  );
}

type MatchTally = {
  red: number;
  blue: number;
  label: string;
};

function matchTally(match: LeaderboardMatch): MatchTally {
  const redVotes = match.scores.filter((s) => s.winnerCorner === "RED").length;
  const blueVotes = match.scores.filter((s) => s.winnerCorner === "BLUE").length;

  if (redVotes + blueVotes > 0) {
    return { red: redVotes, blue: blueVotes, label: `Votes ${redVotes} : ${blueVotes}` };
  }

  const legacy = match.scores.filter((s) => s.hasSections);
  if (legacy.length > 0) {
    const red = legacy.reduce((sum, s) => sum + (s.scoreA ?? 0), 0);
    const blue = legacy.reduce((sum, s) => sum + (s.scoreB ?? 0), 0);
    return { red, blue, label: `Scored ${red.toFixed(1)} – ${blue.toFixed(1)} (legacy)` };
  }

  return { red: 0, blue: 0, label: "No votes yet" };
}

function MatchStatusChip({ match }: { match: LeaderboardMatch }) {
  const decided = match.status === "COMPLETE" && match.winnerName;
  return (
    <span
      className={`shrink-0 border px-md py-xs font-mono text-[0.7rem] uppercase ${
        decided
          ? "border-accent text-accent"
          : match.status === "LIVE" || match.status === "LOCKED"
            ? "border-line text-ink"
            : "border-line text-ink-muted"
      }`}
    >
      {decided ? `Winner: ${match.winnerName}` : match.status.toLowerCase()}
    </span>
  );
}

function VoteBar({ tally }: { tally: MatchTally }) {
  const total = tally.red + tally.blue;
  if (total === 0) return null;
  const redPct = Math.round((tally.red / total) * 100);
  return (
    <div className="flex h-2 w-full overflow-hidden border border-line" aria-hidden="true">
      <div className="bg-accent" style={{ width: `${redPct}%` }} />
      <div className="flex-1 bg-[#2980FF]" />
    </div>
  );
}

function MatchRow({ match }: { match: LeaderboardMatch }) {
  const tally = matchTally(match);
  const showMembers = match.redMembers.length > 0 || match.blueMembers.length > 0;

  return (
    <>
      {/* Phones: RED and BLUE each get their own wrapping line. */}
      <div className="border-b border-line px-md py-md md:hidden">
        <div className="flex items-center justify-between gap-sm">
          <span className="font-mono text-[0.65rem] uppercase text-ink-muted">
            Round {match.round} / M{match.position}
          </span>
          <MatchStatusChip match={match} />
        </div>

        <div className="mt-sm space-y-xs">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-accent">Red</p>
            <p className="break-words font-display text-body-md uppercase leading-tight text-accent">
              {match.redName}
            </p>
            {match.redMembers.length > 0 ? (
              <p className="break-words text-[0.65rem] uppercase leading-snug text-ink-muted">
                {match.redMembers.join(" · ")}
              </p>
            ) : null}
          </div>
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[#2980FF]">Blue</p>
            <p className="break-words font-display text-body-md uppercase leading-tight text-[#2980FF]">
              {match.blueName}
            </p>
            {match.blueMembers.length > 0 ? (
              <p className="break-words text-[0.65rem] uppercase leading-snug text-ink-muted">
                {match.blueMembers.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-sm space-y-xs">
          <VoteBar tally={tally} />
          <p className="font-mono text-[0.65rem] uppercase text-ink-muted">{tally.label}</p>
        </div>
      </div>

      {/* Tablet and desktop. */}
      <div className="hidden border-b border-line px-md py-md md:block">
        <div className="flex flex-wrap items-center gap-md">
          <span className="w-10 font-mono text-xs uppercase text-ink-muted">
            M{match.position}
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display text-title-sm uppercase text-accent">
              {match.redName}
            </span>
            <span className="mx-sm text-ink-muted">vs</span>
            <span className="font-display text-title-sm uppercase text-[#2980FF]">
              {match.blueName}
            </span>
          </span>
          <span className="shrink-0 font-mono text-[0.7rem] uppercase text-ink-muted">
            {tally.label}
          </span>
          <MatchStatusChip match={match} />
        </div>
        {showMembers ? (
          <p className="mt-xs pl-10 text-[0.7rem] uppercase text-ink-muted">
            {match.redMembers.join(" · ") || "TBD"} vs {match.blueMembers.join(" · ") || "TBD"}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function LiveLeaderboard({
  eventId,
  title,
  compact = false,
  live = true,
  filters,
}: {
  eventId: string;
  title: string;
  compact?: boolean;
  live?: boolean;
  filters?: boolean;
}) {
  const showFilters = filters ?? !compact;
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
            setPhaseId(preferredRound(first.rounds)?.id ?? "");
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
    if (!live) return;
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
  }, [eventId, load, live]);

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
    <section className={compact ? "mt-md" : "mt-section"}>
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div>
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
            {compact ? "Standings" : "Live leaderboard"}
          </p>
          <h2 className="mt-xs font-display text-title-md uppercase">{title}</h2>
        </div>
        {compact ? null : (
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
        )}
      </div>

      {showFilters ? (
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
              setPhaseId(preferredRound(category?.rounds ?? [])?.id ?? "");
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
              setPhaseId(preferredRound(cat?.rounds ?? [])?.id ?? "");
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
      ) : null}

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
          </div>

          {ranked.length === 0 ? (
            <p className="p-lg text-body-sm text-ink-muted">
              No scores yet for this phase. Judges are scoring live.
            </p>
          ) : (
            <div>
              {ranked.map((row) => (
                <RankedRow
                  key={row.reg.id}
                  row={row}
                  fallbackLabel={formatLabel(selectedCategory?.format)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-lg space-y-lg">
          <div className="flex flex-wrap items-center justify-between gap-sm border border-line bg-paper-soft px-md py-sm">
            <p className="font-display text-title-md uppercase">
              {selectedPhase?.label ?? "Battles"}
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
                  {matches.map((m) => (
                    <MatchRow key={m.id} match={m} />
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
