"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { responseError } from "@/lib/client-error";

type CardScore = { score: number; roundFormatId: string };
type CardRegistration = {
  id: string;
  status: string;
  seed: number | null;
  crew: string | null;
  teamName: string | null;
  name: string;
  members: { id: string; name: string; role: string }[];
  dancerScores: CardScore[];
};
type CardRound = {
  id: string;
  order: number;
  type: string;
  label: string | null;
  phaseStatus: string | null;
};
type CardMatch = {
  id: string;
  roundFormatId: string | null;
  round: number;
  position: number;
  status: string;
  redName: string;
  blueName: string;
  redMembers: string[];
  blueMembers: string[];
  winnerId: string | null;
  winnerName: string | null;
};
type CardCategory = {
  categoryId: string;
  name: string;
  format: string | null;
  rounds: CardRound[];
  registrations: CardRegistration[];
  matches: CardMatch[];
};
type CardLeaderboardData = {
  eventId: string;
  title: string;
  status: string;
  categories: CardCategory[];
};

const NUMERIC_PHASES = ["CYPHER", "QUALIFIER"];
const TOP_ROWS = 8;

function phaseHasResults(category: CardCategory, phaseId: string) {
  return (
    category.matches.some((match) => match.roundFormatId === phaseId) ||
    category.registrations.some((reg) => reg.dancerScores.some((score) => score.roundFormatId === phaseId))
  );
}

function pickPhase(category: CardCategory): CardRound | undefined {
  const scored = category.rounds.filter((round) => phaseHasResults(category, round.id));
  const pool = scored.length > 0 ? scored : category.rounds;
  return (
    pool.find((round) => round.phaseStatus === "ACTIVE") ??
    [...pool].reverse().find((round) => round.phaseStatus === "COMPLETE") ??
    pool[pool.length - 1]
  );
}

function pickCategory(data: CardLeaderboardData): CardCategory | undefined {
  return data.categories.find((category) => category.rounds.some((round) => phaseHasResults(category, round.id))) ?? data.categories[0];
}

function displayName(reg: CardRegistration) {
  return reg.teamName ?? reg.name;
}

function RankChip({ rank }: { rank: number }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-[0.75rem] font-bold ${
        rank === 1
          ? "border-accent bg-accent text-paper"
          : rank <= 3
            ? "border-line text-ink"
            : "border-line text-ink-muted"
      }`}
    >
      {rank}
    </span>
  );
}

export function EventCardLeaderboard({ eventId, slug }: { eventId: string; slug: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<CardLeaderboardData | null>(null);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [phaseId, setPhaseId] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/leaderboard`);
      if (!res.ok) {
        setError(await responseError(res, "Unable to load standings"));
        return;
      }
      const json = (await res.json()) as CardLeaderboardData;
      setData(json);
      setError("");
      const category = pickCategory(json);
      if (category) {
        setCategoryId(category.categoryId);
        setPhaseId(pickPhase(category)?.id ?? "");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  }, [eventId]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      void load();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [load]);

  const selectedCategory = data?.categories.find((category) => category.categoryId === categoryId);
  const scoredRounds = selectedCategory
    ? selectedCategory.rounds.filter((round) => phaseHasResults(selectedCategory, round.id))
    : [];
  const selectedPhase = selectedCategory?.rounds.find((round) => round.id === phaseId);
  const isNumeric = selectedPhase != null && NUMERIC_PHASES.includes(selectedPhase.type);

  const ranked = (selectedCategory?.registrations ?? [])
    .map((reg) => {
      const scores = reg.dancerScores.filter((score) => score.roundFormatId === phaseId);
      return { reg, total: scores.reduce((sum, s) => sum + s.score, 0), judges: scores.length };
    })
    .filter((row) => row.judges > 0)
    .sort((a, b) => b.total - a.total || (a.reg.seed ?? 999) - (b.reg.seed ?? 999))
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const phaseMatches = (selectedCategory?.matches ?? []).filter((match) => match.roundFormatId === phaseId);
  const finalRound = phaseMatches.length > 0 ? Math.max(...phaseMatches.map((m) => m.round)) : 0;
  const finalMatches = phaseMatches.filter((match) => match.round === finalRound);
  const champion =
    finalMatches.length === 1 && finalMatches[0].status === "COMPLETE" ? finalMatches[0].winnerName : null;

  const multiCategory = (data?.categories.length ?? 0) > 1;

  return (
    <div ref={ref} className="border-t border-line bg-paper/40 px-md py-md">
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-accent">Final standings</p>
        <Link
          href={`/events/${slug}`}
          className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-accent"
        >
          Full results →
        </Link>
      </div>

      {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}

      {!data && !error ? (
        <p className="mt-sm font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ink-muted">Loading standings…</p>
      ) : null}

      {data && data.categories.length === 0 ? (
        <p className="mt-sm text-body-sm text-ink-muted">No results posted yet.</p>
      ) : null}

      {selectedCategory && data && data.categories.length > 0 ? (
        <>
          {multiCategory ? (
            <div className="mt-sm flex flex-wrap gap-xs">
              {data.categories.map((category) => (
                <button
                  key={category.categoryId}
                  type="button"
                  onClick={() => {
                    setCategoryId(category.categoryId);
                    setPhaseId(pickPhase(category)?.id ?? "");
                  }}
                  className={`border px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] transition-colors ${
                    category.categoryId === categoryId
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-ink-muted hover:border-accent hover:text-ink"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}

          {scoredRounds.length > 1 ? (
            <div className="mt-sm flex flex-wrap gap-xs">
              {scoredRounds.map((round) => (
                <button
                  key={round.id}
                  type="button"
                  onClick={() => setPhaseId(round.id)}
                  className={`border px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] transition-colors ${
                    round.id === phaseId
                      ? "border-line bg-paper-soft text-ink"
                      : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {round.label ?? round.type.replace("_", " ")}
                </button>
              ))}
            </div>
          ) : null}

          {champion ? (
            <p className="mt-sm border border-accent bg-accent/10 px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-accent">
              Champion · {champion}
            </p>
          ) : null}

          {selectedPhase == null ? (
            <p className="mt-sm text-body-sm text-ink-muted">No results posted yet.</p>
          ) : isNumeric ? (
            ranked.length === 0 ? (
              <p className="mt-sm text-body-sm text-ink-muted">No scores yet for this phase.</p>
            ) : (
              <ol className="mt-sm">
                {ranked.slice(0, TOP_ROWS).map((row) => (
                  <li key={row.reg.id} className="flex items-center gap-sm border-b border-line py-sm last:border-b-0">
                    <RankChip rank={row.rank} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-body-sm font-bold uppercase leading-tight">{displayName(row.reg)}</p>
                      <p className="mt-xs break-words font-mono text-[0.6rem] uppercase leading-snug text-ink-muted">
                        {row.reg.members.length > 1
                          ? row.reg.members.map((m) => m.name).join(" · ")
                          : (row.reg.crew ?? "")}
                        {row.reg.seed != null ? `${row.reg.members.length > 1 ? " /" : ""} Seed #${row.reg.seed}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-body-md font-bold text-accent">{row.total}</p>
                      <p className="font-mono text-[0.55rem] uppercase text-ink-muted">{row.judges} J</p>
                    </div>
                  </li>
                ))}
                {ranked.length > TOP_ROWS ? (
                  <li className="py-sm font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                    +{ranked.length - TOP_ROWS} more — full standings on the event page
                  </li>
                ) : null}
              </ol>
            )
          ) : finalMatches.length === 0 ? (
            <p className="mt-sm text-body-sm text-ink-muted">No battles recorded for this phase.</p>
          ) : (
            <div className="mt-sm">
              {finalMatches.map((match) => (
                <div key={match.id} className="border-b border-line py-sm last:border-b-0">
                  <div className="flex items-center justify-between gap-sm">
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                      M{match.position}
                      {finalMatches.length > 1 ? ` · R${match.round}` : ""}
                    </span>
                    {match.winnerName ? (
                      <span className="border border-accent px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-accent">
                        {champion ? "Decided" : "Winner"}: {match.winnerName}
                      </span>
                    ) : (
                      <span className="font-mono text-[0.6rem] uppercase text-ink-muted">{match.status.toLowerCase()}</span>
                    )}
                  </div>
                  <p className="mt-xs text-body-sm uppercase leading-tight">
                    <span className={`break-words ${match.winnerId && match.winnerName === match.redName ? "font-bold text-accent" : "text-ink"}`}>
                      {match.redName}
                    </span>
                    <span className="mx-xs text-ink-muted">vs</span>
                    <span className={`break-words ${match.winnerId && match.winnerName === match.blueName ? "font-bold text-[#2980FF]" : "text-ink"}`}>
                      {match.blueName}
                    </span>
                  </p>
                  {(match.redMembers.length > 0 || match.blueMembers.length > 0) && (
                    <p className="mt-xs break-words font-mono text-[0.55rem] uppercase leading-snug text-ink-muted">
                      {match.redMembers.join(" · ") || "TBD"} vs {match.blueMembers.join(" · ") || "TBD"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
