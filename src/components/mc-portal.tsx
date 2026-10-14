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

type Lane = { corner: string; registrationId: string | null; name: string };
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
type Category = {
  id: string;
  name: string;
  currentPhaseOrder: number | null;
  rounds: Phase[];
  activePhase: Phase | null;
  matches: PortalMatch[];
};
type PortalState = {
  eventTitle: string;
  eventStatus: string;
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

export function McPortal() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<PortalState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [topN, setTopN] = useState<Record<string, string>>({});
  const [runnerPick, setRunnerPick] = useState<Record<string, string>>({});

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

  async function act(url: string, method: string, body: unknown, key: string, done: string) {
    setBusy(key);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast(await responseError(res, "Action failed"), "error");
        return;
      }
      toast(done, "success");
      await load();
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

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
      <main className="mx-auto w-full max-w-6xl px-md py-section">
        <ListSkeleton rows={5} />
      </main>
    );
  }

  if (!state) {
    return (
      <main className="mx-auto w-full max-w-6xl px-md py-section">
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
    <main className="mx-auto w-full max-w-6xl px-md pb-section pt-lg">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <p className="text-body-xs font-bold uppercase tracking-[0.2em] text-accent">{state.portal}</p>
          <h1 className="mt-1 font-display text-display-md uppercase">{state.eventTitle}</h1>
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
        <p role="alert" className="mt-md rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-body-sm text-accent">
          {error}
        </p>
      ) : null}

      <div className="mt-lg space-y-lg">
        {state.categories.map((category) => (
          <section key={category.id} className="rounded-lg border border-line bg-paper-soft p-md sm:p-lg">
            <div className="flex flex-wrap items-start justify-between gap-md">
              <div>
                <h2 className="font-display text-title-md uppercase">{category.name}</h2>
                <div className="mt-2 space-y-1">
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
                      {category.activePhase?.id === r.id ? (
                        <Badge tone="accent">On now</Badge>
                      ) : (
                        <Badge>{r.phaseStatus ?? "PENDING"}</Badge>
                      )}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-sm">
                <Input
                  aria-label={`Top-N for ${category.name}`}
                  value={topN[category.id] ?? ""}
                  onChange={(e) => setTopN((p) => ({ ...p, [category.id]: e.target.value }))}
                  placeholder={`Top ${category.activePhase?.advanceCount ?? "N"}`}
                  inputMode="numeric"
                  className="h-9 w-24 text-center"
                />
                <Button
                  size="sm"
                  disabled={busy === `adv-${category.id}`}
                  onClick={() =>
                    void act(
                      "/api/mc/advance",
                      "POST",
                      {
                        categoryId: category.id,
                        advanceCount: topN[category.id] ? Number(topN[category.id]) : undefined,
                      },
                      `adv-${category.id}`,
                      "Phase advanced",
                    )
                  }
                >
                  {busy === `adv-${category.id}` ? "Working..." : "Advance"}
                </Button>
              </div>
            </div>

            <div className="mt-md space-y-sm">
              {category.matches.length === 0 ? (
                <p className="text-body-sm text-ink-muted">
                  {category.activePhase ? "No matches in this phase yet." : "No active phase."}
                </p>
              ) : null}
              {category.matches.map((match) => (
                <div key={match.id} className="rounded-md border border-line bg-paper p-md">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <div className="flex flex-wrap items-center gap-sm">
                      <p className="font-display text-title-sm uppercase">
                        Round {match.round} · Match {match.position}
                      </p>
                      <Badge
                        tone={
                          match.status === "LIVE" ? "accent" : match.status === "COMPLETE" ? "success" : "neutral"
                        }
                      >
                        {match.status}
                      </Badge>
                      {match.matchSize === 3 ? (
                        <Badge tone="neutral">{match.winnerCount === 2 ? "3-way · 2 winners" : "3-way · 1 winner"}</Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-sm">
                      {match.status === "PENDING" ? (
                        <>
                          {match.matchSize === 3 ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy === `wc-${match.id}`}
                              onClick={() =>
                                void act(
                                  "/api/mc/match",
                                  "PATCH",
                                  { matchId: match.id, winnerCount: match.winnerCount === 2 ? 1 : 2 },
                                  `wc-${match.id}`,
                                  match.winnerCount === 2 ? "Set to 1 winner" : "Set to 2 winners",
                                )
                              }
                            >
                              {match.winnerCount === 2 ? "2 winners" : "1 winner"}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            disabled={busy === `live-${match.id}`}
                            onClick={() =>
                              void act("/api/mc/match", "POST", { matchId: match.id }, `live-${match.id}`, "Match is live")
                            }
                          >
                            Push live
                          </Button>
                        </>
                      ) : null}
                    </div>
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
                        <p className={`font-display text-title-sm uppercase ${cornerColor[lane.corner] ?? ""}`}>
                          {lane.corner} · {lane.name}
                        </p>
                        <p className="mt-1 font-mono text-[0.65rem] uppercase text-ink-muted">
                          Votes: {match.votes[lane.corner as keyof typeof match.votes] ?? 0}
                          {match.winnerId === lane.registrationId ? " · Winner" : ""}
                          {match.runnerUpId === lane.registrationId ? " · Runner-up" : ""}
                        </p>
                        {match.status !== "COMPLETE" ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <button
                              type="button"
                              disabled={!lane.registrationId || busy === `win-${match.id}`}
                              onClick={() =>
                                void act(
                                  "/api/mc/match",
                                  "PUT",
                                  {
                                    matchId: match.id,
                                    winnerId: lane.registrationId,
                                    runnerUpId:
                                      match.matchSize >= 3 && match.winnerCount === 2
                                        ? (runnerPick[match.id] ?? undefined)
                                        : undefined,
                                  },
                                  `win-${match.id}`,
                                  `Winner: ${lane.name}`,
                                )
                              }
                              className="cursor-pointer rounded border border-accent px-2 py-1 font-mono text-[0.6rem] font-bold uppercase text-accent transition-colors hover:bg-accent hover:text-accent-contrast disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Winner
                            </button>
                            {match.matchSize >= 3 && match.winnerCount === 2 ? (
                              <button
                                type="button"
                                disabled={!lane.registrationId}
                                onClick={() =>
                                  setRunnerPick((p) => ({ ...p, [match.id]: lane.registrationId as string }))
                                }
                                className={`cursor-pointer rounded border px-2 py-1 font-mono text-[0.6rem] font-bold uppercase transition-colors ${
                                  runnerPick[match.id] === lane.registrationId
                                    ? "border-success bg-success/15 text-success"
                                    : "border-line-strong text-ink-muted hover:border-success hover:text-success"
                                }`}
                              >
                                Runner-up{runnerPick[match.id] === lane.registrationId ? " ✓" : ""}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
