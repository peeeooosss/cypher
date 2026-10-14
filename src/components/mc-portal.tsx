"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { responseError } from "@/lib/client-error";

type Lane = { corner: string; registrationId: string | null; name: string; seed: number | null };
type PortalMatch = {
  id: string;
  round: number;
  position: number;
  status: string;
  matchSize: number;
  winnerCount: number;
  winnerId: string | null;
  winnerLocked: boolean;
  runnerUpId: string | null;
  lanes: Lane[];
  votes: { red: number; blue: number; green: number };
};
type Phase = {
  id: string;
  order: number;
  type: string;
  label: string | null;
  advanceCount: number | null;
  matchSize: number;
  phaseStatus: string | null;
};
type Participant = {
  id: string;
  name: string;
  crew: string | null;
  seed: number | null;
  status: string;
};
type Category = {
  id: string;
  name: string;
  currentPhaseOrder: number | null;
  rounds: Phase[];
  activePhase: Phase | null;
  participants: Participant[];
  matches: PortalMatch[];
};
type PortalState = {
  eventTitle: string;
  eventStatus: string;
  eventId: string;
  portal: string;
  label: string;
  role: string;
  categories: Category[];
};

const cornerColor: Record<string, string> = {
  red: "text-accent",
  blue: "text-[#2980FF]",
  green: "text-success",
};

const cornerBorder: Record<string, string> = {
  red: "border-l-accent",
  blue: "border-l-[#2980FF]",
  green: "border-l-success",
};

function matchTone(status: string): "neutral" | "accent" | "success" | "warning" {
  if (status === "LIVE") return "accent";
  if (status === "COMPLETE") return "success";
  if (status === "LOCKED") return "warning";
  return "neutral";
}

function entryTone(status: string): "neutral" | "success" | "warning" {
  if (status === "CONFIRMED") return "success";
  if (status === "WITHDRAWN") return "warning";
  return "neutral";
}

const NO_BATTLE_ROUND = ["CYPHER", "QUALIFIER"];

export function McPortal() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<PortalState | null>(null);
  const [error, setError] = useState("");
  const [categoryQueries, setCategoryQueries] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mc/state", { cache: "no-store" });
      if (res.status === 403) {
        router.replace("/mc");
        return;
      }
      if (!res.ok) {
        setError(await responseError(res, "Failed to load portal"));
        return;
      }
      setState(await res.json());
      setError("");
    } catch {
      setError("Network error. Please try again.");
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mc/state", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) {
          router.replace("/mc");
          return;
        }
        if (!res.ok) {
          setError(await responseError(res, "Failed to load portal"));
          return;
        }
        setState(await res.json());
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Network error. Please try again.");
      });
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001", {
      withCredentials: true,
    });
    const refresh = () => void load();
    socket.on("score_submitted", refresh);
    socket.on("match_live", refresh);
    socket.on("match_complete", refresh);
    socket.on("phase_activated", refresh);
    socket.on("phase_completed", refresh);
    socket.on("bracket_generated", refresh);
    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [load, router]);

  async function signOut() {
    await fetch("/api/mc/session", { method: "DELETE" });
    router.replace("/mc");
  }

  function runningOrderText(): string {
    if (!state) return "";
    const lines = [`${state.portal.toUpperCase()} — ${state.eventTitle}`, "RUNNING ORDER", ""];
    state.categories.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}`);
      c.rounds.forEach((r) => {
        const active = c.activePhase?.id === r.id ? "  [ON NOW]" : "";
        const top = r.advanceCount != null ? `Top ${r.advanceCount}` : "no cut set";
        lines.push(`   - ${r.label ?? r.type} (${r.type}${r.matchSize === 3 ? ", 3-way" : ""}, ${top})${active}`);
      });
    });
    return lines.join("\n");
  }

  async function copyRunningOrder() {
    try {
      await navigator.clipboard.writeText(runningOrderText());
      toast("Running order copied — paste it anywhere", "success");
    } catch {
      toast("Could not copy — select the text manually", "error");
    }
  }

  if (!state && !error) {
    return (
      <main className="mx-auto w-full max-w-7xl px-md py-section md:px-xl">
        <ListSkeleton rows={5} />
      </main>
    );
  }

  if (!state) {
    return (
      <main className="mx-auto w-full max-w-7xl px-md py-section md:px-xl">
        <EmptyState
          title="Portal unreachable"
          description={error || "Could not load the portal."}
          action={<Button onClick={() => void load()}>Retry</Button>}
        />
      </main>
    );
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(runningOrderText())}`;

  return (
    <main className="mx-auto w-full max-w-7xl px-md pb-section pt-lg md:px-xl">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <p className="text-body-xs font-bold uppercase tracking-[0.2em] text-accent">{state.portal}</p>
          <h1 className="mt-1 font-display text-display-md uppercase tracking-wide">{state.eventTitle}</h1>
          <p className="mt-1 text-body-sm text-ink-muted">
            {state.label} · {state.role} · {state.eventStatus}
          </p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Button variant="secondary" size="sm" onClick={() => void copyRunningOrder()}>
            Copy running order
          </Button>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center rounded-md border border-line-strong px-3 text-button-sm text-ink transition-colors hover:border-accent hover:text-accent"
          >
            WhatsApp
          </a>
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Exit
          </Button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-md rounded-lg border border-accent/40 bg-accent/10 px-md py-md text-body-sm break-words text-accent"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-lg space-y-xl">
        {state.categories.map((category) => {
          const needle = (categoryQueries[category.id] ?? "").trim().toLowerCase();
          const visibleParticipants = needle
            ? category.participants.filter((p) =>
                `${p.name} ${p.crew ?? ""} ${p.seed != null ? `seed ${p.seed}` : ""}`
                  .toLowerCase()
                  .includes(needle),
              )
            : category.participants;
          const visibleMatches = needle
            ? category.matches.filter((m) =>
                `${m.lanes.map((lane) => `${lane.name} ${lane.seed ?? ""}`).join(" ")} r${m.round} m${m.position}`
                  .toLowerCase()
                  .includes(needle),
              )
            : category.matches;

          const phaseLine =
            category.currentPhaseOrder != null
              ? `Phase ${(category.currentPhaseOrder ?? 0) + 1} of ${category.rounds.length}: ${
                  category.rounds.find((r) => r.order === category.currentPhaseOrder)?.label ?? "Active"
                }`
              : category.rounds.length > 0 && category.rounds.every((r) => r.phaseStatus === "COMPLETE")
                ? "All phases complete"
                : "Not started";

          const noBattle = NO_BATTLE_ROUND.includes(category.activePhase?.type ?? "");

          return (
            <section key={category.id} className="rounded-lg border border-line bg-paper-soft p-md sm:p-lg">
              <div className="flex flex-wrap items-start justify-between gap-md">
                <div className="min-w-0">
                  <h2 className="font-display text-title-md uppercase tracking-wide">{category.name}</h2>
                  <p className="mt-xs text-body-sm text-ink-muted">{phaseLine}</p>
                </div>
                <Input
                  type="search"
                  aria-label={`Find an artist in ${category.name}`}
                  value={categoryQueries[category.id] ?? ""}
                  onChange={(e) => setCategoryQueries((q) => ({ ...q, [category.id]: e.target.value }))}
                  placeholder="Find an artist…"
                  className="h-9 w-40 sm:w-48"
                />
              </div>

              {category.rounds.length > 0 ? (
                <div className="mt-md">
                  <div className="flex gap-xs">
                    {category.rounds.map((round) => {
                      const done = round.phaseStatus === "COMPLETE" || round.phaseStatus === "ACTIVE";
                      return (
                        <div
                          key={round.id}
                          className={`h-2 flex-1 ${done ? "bg-accent" : "bg-line"}`}
                          title={`${round.label ?? round.type} — ${round.phaseStatus ?? "PENDING"}`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-xs flex text-[0.6rem] font-mono uppercase text-ink-muted">
                    {category.rounds.map((round) => (
                      <span key={round.id} className="flex-1 truncate px-xs">
                        {round.label ?? round.type.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-md space-y-1">
                {category.rounds.map((r) => (
                  <p key={r.id} className="text-body-sm text-ink-muted">
                    <span className={category.activePhase?.id === r.id ? "font-bold text-ink" : ""}>
                      {r.label ?? r.type}
                    </span>{" "}
                    <span className="font-mono text-[0.65rem] uppercase">
                      {r.type}
                      {r.matchSize === 3 ? " · 3-way" : ""}
                      {r.advanceCount != null ? ` · Top ${r.advanceCount}` : ""}
                    </span>{" "}
                    {category.activePhase?.id === r.id ? <Badge tone="accent">On now</Badge> : <Badge>{r.phaseStatus ?? "PENDING"}</Badge>}
                  </p>
                ))}
              </div>

              <div className="mt-lg">
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <p className="text-body-xs font-bold uppercase tracking-[0.2em] text-accent">
                    All artists ({category.participants.length}) · seed order
                  </p>
                  {needle ? (
                    <p className="text-body-xs text-ink-muted">{visibleParticipants.length} matching</p>
                  ) : null}
                </div>
                {category.participants.length === 0 ? (
                  <p className="mt-sm text-body-sm text-ink-muted">No artists registered yet.</p>
                ) : visibleParticipants.length === 0 ? (
                  <p className="mt-sm text-body-sm text-ink-muted">No artists for “{categoryQueries[category.id]}”.</p>
                ) : (
                  <ul className="mt-sm grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleParticipants.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-sm rounded border border-line bg-paper px-2.5 py-1.5"
                      >
                        <span className="w-8 shrink-0 text-right font-mono text-xs text-accent">
                          {p.seed != null ? `#${p.seed}` : "—"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block break-words text-body-sm ${
                              p.status === "WITHDRAWN" ? "text-ink-muted line-through" : "text-ink"
                            }`}
                          >
                            {p.name}
                          </span>
                          {p.crew ? (
                            <span className="block break-words text-[0.65rem] uppercase text-ink-muted">{p.crew}</span>
                          ) : null}
                        </span>
                        <Badge tone={entryTone(p.status)}>{p.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-lg">
                <p className="text-body-xs font-bold uppercase tracking-[0.2em] text-accent">
                  {category.activePhase
                    ? `${category.activePhase.label ?? category.activePhase.type} bracket`
                    : "Bracket"}
                </p>
                {visibleMatches.length === 0 ? (
                  <p className="mt-sm text-body-sm text-ink-muted">
                    {needle
                      ? `No matches for “${categoryQueries[category.id]}”.`
                      : noBattle
                        ? "No battles in this round — call artists from the list above."
                        : category.activePhase
                          ? "No battles in this phase yet."
                          : "No active phase."}
                  </p>
                ) : null}
                {visibleMatches.map((match) => (
                  <div key={match.id} className="mt-sm rounded-md border border-line bg-paper p-md">
                    <div className="flex flex-wrap items-center justify-between gap-sm">
                      <div className="flex flex-wrap items-center gap-sm">
                        <p className="font-display text-title-sm uppercase tracking-wide">
                          Round {match.round} · Match {match.position}
                        </p>
                        <Badge tone={matchTone(match.status)}>{match.status}</Badge>
                        {match.matchSize === 3 ? (
                          <Badge>
                            {match.winnerCount === 2 ? "3-way · 2 winners" : "3-way · 1 winner"}
                          </Badge>
                        ) : null}
                      </div>
                      {match.winnerLocked ? <Badge tone="success">Winner locked</Badge> : null}
                    </div>

                    <div className="mt-md grid gap-sm sm:grid-cols-3">
                      {match.lanes.map((lane) => (
                        <div
                          key={lane.corner}
                          className={`rounded-md border border-l-4 border-line px-3 py-3 ${
                            cornerBorder[lane.corner] ?? ""
                          } ${
                            match.winnerId === lane.registrationId
                              ? "bg-accent/10 ring-1 ring-accent/40"
                              : match.runnerUpId === lane.registrationId
                                ? "bg-success/10 ring-1 ring-success/30"
                                : ""
                          }`}
                        >
                          <p className={`font-mono text-[0.6rem] uppercase ${cornerColor[lane.corner] ?? ""}`}>
                            {lane.corner}
                          </p>
                          <p
                            className={`mt-0.5 break-words font-display text-title-sm uppercase tracking-wide ${
                              match.winnerId === lane.registrationId || match.runnerUpId === lane.registrationId
                                ? "text-ink"
                                : ""
                            }`}
                          >
                            {lane.seed != null ? <span className="text-ink-muted">#{lane.seed} </span> : null}
                            {lane.name}
                          </p>
                          <p className="mt-1 font-mono text-[0.65rem] uppercase text-ink-muted">
                            {match.votes[lane.corner as keyof typeof match.votes] ?? 0} vote
                            {(match.votes[lane.corner as keyof typeof match.votes] ?? 0) === 1 ? "" : "s"}
                            {match.winnerId === lane.registrationId ? " · Winner" : ""}
                            {match.runnerUpId === lane.registrationId ? " · Runner-up" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
