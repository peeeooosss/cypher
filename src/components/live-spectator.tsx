"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/socket-provider";
import type { MatchLiveData, ScoreSubmittedData } from "@/lib/socket/types";

export function LiveSpectator({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const { socket, status, joinEventRoom } = useSocket();

  const [liveMatch, setLiveMatch] = useState<MatchLiveData | null>(null);
  const [scores, setScores] = useState({ red: 0, blue: 0 });
  const [judgeCount, setJudgeCount] = useState(0);
  const [winnerCorner, setWinnerCorner] = useState<"red" | "blue" | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (status !== "live") return;
    joinEventRoom(eventId, "viewer");
  }, [status, joinEventRoom, eventId]);

  useEffect(() => {
    if (!socket) return;

    const onMatchLive = (data: MatchLiveData) => {
      setLiveMatch(data);
      setScores({ red: 0, blue: 0 });
      setJudgeCount(0);
      setWinnerCorner(null);
      setLocked(false);
    };
    const onScore = (data: ScoreSubmittedData) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setScores({ red: data.aggregateRed, blue: data.aggregateBlue });
      setJudgeCount(data.judgeCount);
    };
    const onComplete = (data: { matchId: string; winnerCorner: "red" | "blue" }) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setWinnerCorner(data.winnerCorner);
    };
    const onLocked = (data: { matchId: string; locked: boolean }) => {
      if (data.matchId !== liveMatch?.matchId) return;
      setLocked(data.locked);
    };

    socket.on("match_live", onMatchLive);
    socket.on("score_submitted", onScore);
    socket.on("match_complete", onComplete);
    socket.on("score_locked", onLocked);

    return () => {
      socket.off("match_live", onMatchLive);
      socket.off("score_submitted", onScore);
      socket.off("match_complete", onComplete);
      socket.off("score_locked", onLocked);
    };
  }, [socket, liveMatch?.matchId]);

  const connectionLabel =
    status === "live" ? "LIVE" : status === "offline" ? "OFFLINE" : "CONNECTING...";

  if (!liveMatch) {
    return (
      <section className="flex min-h-[40vh] flex-col items-center justify-center border border-line text-center">
        <p className="font-mono text-body-sm uppercase text-accent">{eventTitle}</p>
        <h2 className="mt-md font-display text-display-md uppercase">No live battle</h2>
        <p className="mt-sm text-body-sm text-ink-muted">
          Waiting for the organizer to push the next match live.
        </p>
        <div className="mt-lg flex items-center gap-sm">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">{connectionLabel}</span>
          <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-accent" : "bg-line"}`} />
        </div>
      </section>
    );
  }

  const redWins = winnerCorner === "red";
  const blueWins = winnerCorner === "blue";

  return (
    <section className="border border-line">
      <div className="flex flex-wrap items-center justify-between gap-md border-b border-line px-md py-sm">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
          Live battle / Round {liveMatch.round} / Match {liveMatch.position}
        </p>
        <div className="flex items-center gap-sm">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">{connectionLabel}</span>
          <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-accent" : "bg-line"}`} />
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className={`flex flex-col items-center gap-sm px-md py-xl text-center ${blueWins ? "opacity-40" : ""}`}>
          <span className="font-display text-body-sm uppercase text-accent">Red</span>
          <h3 className="font-display text-display-lg uppercase leading-none text-accent">
            {liveMatch.red.name}
          </h3>
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
            Seed #{liveMatch.red.seed ?? "—"}
            {liveMatch.red.crew ? ` / ${liveMatch.red.crew}` : ""}
          </p>
          {liveMatch.red.members && liveMatch.red.members.length > 0 ? <p className="max-w-xs text-xs uppercase text-ink-muted">{liveMatch.red.members.join(" · ")}</p> : null}
          <p className="font-display text-display-xl uppercase text-accent">{scores.red}</p>
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
            {judgeCount > 0 ? `${scores.red} judge vote${scores.red === 1 ? "" : "s"}` : "no votes"}
          </p>
        </div>
        <div className={`flex flex-col items-center gap-sm border-l border-line px-md py-xl text-center ${redWins ? "opacity-40" : ""}`}>
          <span className="font-display text-body-sm uppercase text-[#2980FF]">Blue</span>
          <h3 className="font-display text-display-lg uppercase leading-none text-[#2980FF]">
            {liveMatch.blue.name}
          </h3>
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
            Seed #{liveMatch.blue.seed ?? "—"}
            {liveMatch.blue.crew ? ` / ${liveMatch.blue.crew}` : ""}
          </p>
          {liveMatch.blue.members && liveMatch.blue.members.length > 0 ? <p className="max-w-xs text-xs uppercase text-ink-muted">{liveMatch.blue.members.join(" · ")}</p> : null}
          <p className="font-display text-display-xl uppercase text-[#2980FF]">{scores.blue}</p>
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
            {judgeCount > 0 ? `${scores.blue} judge vote${scores.blue === 1 ? "" : "s"}` : "no votes"}
          </p>
        </div>
      </div>

      <div className="border-t border-line px-md py-sm text-center font-mono text-[0.7rem] uppercase text-ink-muted">
        {winnerCorner
          ? `${winnerCorner === "red" ? "Red" : "Blue"} wins`
          : locked
            ? "Voting locked"
            : `${judgeCount} judge${judgeCount === 1 ? "" : "s"} decided`}
      </div>
    </section>
  );
}
