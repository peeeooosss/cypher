"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

type EventOption = { id: string; title: string; status: string };
type Competitor = { teamName?: string | null; user: { name: string | null } } | null;
type Match = {
  id: string;
  round: number;
  position: number;
  status: string;
  scoreA: number;
  scoreB: number;
  competitorA: Competitor;
  competitorB: Competitor;
};

export function JudgePortal({ events }: { events: EventOption[] }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [matches, setMatches] = useState<Match[]>([]);
  const [connection, setConnection] = useState("offline");

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001", {
      withCredentials: true,
    });

    socket.on("connect", () => {
      setConnection("live");
      socket.emit("event:join", { eventId: selectedEventId });
    });
    socket.on("disconnect", () => setConnection("offline"));
    socket.on("event:state", (nextMatches: Match[]) => setMatches(nextMatches));
    socket.on("match:updated", ({ match }: { match: Match }) => {
      setMatches((current) => current.map((item) => (item.id === match.id ? { ...item, ...match } : item)));
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedEventId]);

  function submitScore(match: Match, scoreA: number, scoreB: number) {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001", {
      withCredentials: true,
    });
    socket.on("connect", () => {
      socket.emit("event:join", { eventId: selectedEventId }, () => {
        socket.emit("match:score", { eventId: selectedEventId, matchId: match.id, scoreA, scoreB }, () => socket.disconnect());
      });
    });
  }

  return (
    <section className="mt-section">
      <div className="flex flex-wrap items-center gap-md">
        <select className="border border-line bg-paper px-md py-sm" value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
          {events.length === 0 ? <option value="">No assigned events</option> : null}
          {events.map((event) => <option key={event.id} value={event.id}>{event.title} / {event.status}</option>)}
        </select>
        <span className="font-mono text-[0.7rem] uppercase text-accent">Socket: {connection}</span>
      </div>

      <div className="mt-lg grid gap-md lg:grid-cols-2">
        {matches.length === 0 ? <p className="border border-line p-lg text-ink-muted">No bracket matches are live yet.</p> : null}
        {matches.map((match) => (
          <article className="border border-line bg-paper-soft p-lg" key={match.id}>
            <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Round {match.round} / Match {match.position} / {match.status}</p>
            <div className="mt-lg grid grid-cols-[1fr_auto] gap-sm text-title-md font-bold uppercase">
              <span>{match.competitorA?.teamName ?? match.competitorA?.user.name ?? "Waiting"}</span><span>{match.scoreA}</span>
              <span>{match.competitorB?.teamName ?? match.competitorB?.user.name ?? "Waiting"}</span><span>{match.scoreB}</span>
            </div>
            {match.competitorA && match.competitorB ? (
              <div className="mt-lg flex gap-sm">
                <button className="border border-accent px-md py-sm text-body-sm font-bold uppercase text-accent" onClick={() => submitScore(match, match.scoreA + 1, match.scoreB)} type="button">A scores</button>
                <button className="border border-accent px-md py-sm text-body-sm font-bold uppercase text-accent" onClick={() => submitScore(match, match.scoreA, match.scoreB + 1)} type="button">B scores</button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
