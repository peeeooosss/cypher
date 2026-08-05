"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

type LeaderboardDancer = {
  rank: number;
  registrationId: string;
  name: string;
  seed: number | null;
  crew: string | null;
  dancerTotal: number;
  matchScore: number;
  total: number;
  judgeVotes: number;
  matches: number;
};

type LeaderboardCategory = {
  categoryId: string;
  name: string;
  currentPhaseOrder: number | null;
  activeRound: { id: string; type: string; label: string | null } | null;
  dancers: LeaderboardDancer[];
};

type LeaderboardData = {
  eventId: string;
  title: string;
  status: string;
  categories: LeaderboardCategory[];
};

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
  const [connectionStatus, setConnectionStatus] = useState("offline");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/leaderboard`);
        if (res.ok) {
          setData(await res.json());
          setError("");
        } else {
          setError("Unable to load leaderboard");
        }
      } catch {
        setError("Unable to load leaderboard");
      }
    };
    void load();
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
      const res = await fetch(`/api/events/${eventId}/leaderboard`);
      if (res.ok) setData(await res.json());
    };

    socket.on("dancer:updated", () => void refresh());
    socket.on("match:updated", () => void refresh());
    socket.on("event:state", () => void refresh());

    return () => {
      socket.disconnect();
    };
  }, [eventId]);

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

  const hasScores = data.categories.some((c) =>
    c.dancers.some((d) => d.judgeVotes > 0 || d.matches > 0),
  );

  return (
    <section className="mt-section">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div>
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Live leaderboard</p>
          <h2 className="mt-xs font-display text-title-md uppercase">{title}</h2>
        </div>
        <span className="flex items-center gap-sm font-mono text-[0.7rem] uppercase">
          {connectionStatus === "live" ? "LIVE" : "SYNCING..."}
          <span
            className={`h-2 w-2 rounded-full ${connectionStatus === "live" ? "bg-accent" : "bg-line"}`}
          />
        </span>
      </div>

      {!hasScores ? (
        <p className="mt-lg border border-line p-lg text-body-sm text-ink-muted">
          No scores yet. Judges are warming up &mdash; standings will appear live as rounds start.
        </p>
      ) : (
        <div className={`mt-lg ${compact ? "" : "space-y-xl"}`}>
          {data.categories.map((category) => {
            const scored = category.dancers.filter((d) => d.judgeVotes > 0 || d.matches > 0);
            const podium = scored.slice(0, 3);
            const rest = scored.slice(3);

            return (
              <div key={category.categoryId} className="border border-line">
                <div className="flex flex-wrap items-center justify-between gap-sm border-b border-line bg-paper-soft px-md py-sm">
                  <p className="font-display text-title-md uppercase">{category.name}</p>
                  <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                    {category.activeRound?.label ?? "Round not started"}
                  </p>
                </div>

                {scored.length === 0 ? (
                  <p className="p-lg text-body-sm text-ink-muted">No scores yet for this category.</p>
                ) : (
                  <div>
                    {podium.map((d) => (
                      <div
                        key={d.registrationId}
                        className="flex items-center gap-md border-b border-line px-md py-sm"
                      >
                        <span
                          className={`w-10 shrink-0 text-center font-mono text-display-lg font-bold ${
                            d.rank === 1 ? "text-accent" : d.rank === 2 ? "text-ink" : "text-ink-muted"
                          }`}
                        >
                          {d.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-md font-bold uppercase">{d.name}</p>
                          <p className="text-[0.7rem] uppercase text-ink-muted">
                            {d.crew ?? "Solo"}
                            {d.seed != null ? ` / Seed #${d.seed}` : ""}
                          </p>
                        </div>
                        <span className="font-mono text-title-md font-bold text-accent">{d.total}</span>
                      </div>
                    ))}

                    {rest.map((d) => (
                      <div
                        key={d.registrationId}
                        className="flex items-center gap-md border-b border-line px-md py-xs"
                      >
                        <span className="w-10 shrink-0 text-center font-mono text-body-sm text-ink-muted">
                          {d.rank}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-body-sm uppercase">{d.name}</p>
                        <span className="font-mono text-body-sm text-accent">{d.total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
