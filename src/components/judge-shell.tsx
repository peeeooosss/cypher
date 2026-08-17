"use client";

import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { ScoringInterface } from "@/components/scoring-interface";
import { SocketProvider } from "@/components/socket-provider";
import { JudgeDashboard } from "@/components/judge-dashboard";
import type { MatchLiveData } from "@/lib/socket/types";

type RoundDisplay = {
  id: string;
  order: number;
  type: string;
  label: string | null;
  phaseStatus: string | null;
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
  dancerScores: { roundFormatId: string; score: number; judgeSlotId: string }[];
};

type MatchDisplay = {
  id: string;
  round: number;
  position: number;
  status: string;
  scoreA: number;
  scoreB: number;
  competitorAId: string | null;
  competitorBId: string | null;
  competitorA: {
    teamName?: string | null;
    crew: string | null;
    seed: number | null;
    user: { name: string | null; avatarUrl?: string | null };
    members?: { user: { name: string | null; username: string | null } }[];
  } | null;
  competitorB: {
    teamName?: string | null;
    crew: string | null;
    seed: number | null;
    user: { name: string | null; avatarUrl?: string | null };
    members?: { user: { name: string | null; username: string | null } }[];
  } | null;
  scores: { judgeSlot: { name: string | null } }[];
};

type EnrichedSlot = {
  id: string;
  code: string;
  name: string | null;
  categoryId: string;
  eventId: string;
  isActive: boolean;
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

function buildInitialLiveMatch(match: MatchDisplay): MatchLiveData {
  return {
    matchId: match.id,
    round: match.round,
    position: match.position,
    red: {
      id: match.competitorAId ?? "",
      name: match.competitorA?.teamName ?? match.competitorA?.user.name ?? "TBD",
      crew: match.competitorA?.crew ?? null,
      seed: match.competitorA?.seed ?? null,
      avatar: match.competitorA?.user.avatarUrl ?? null,
      members: match.competitorA?.members?.map((m) => m.user.name ?? m.user.username ?? "Unnamed"),
    },
    blue: {
      id: match.competitorBId ?? "",
      name: match.competitorB?.teamName ?? match.competitorB?.user.name ?? "TBD",
      crew: match.competitorB?.crew ?? null,
      seed: match.competitorB?.seed ?? null,
      avatar: match.competitorB?.user.avatarUrl ?? null,
      members: match.competitorB?.members?.map((m) => m.user.name ?? m.user.username ?? "Unnamed"),
    },
    timeLimitMs: 60000,
    status: "LIVE",
  };
}

export function JudgeShell({ code, slotData: initialSlotData }: { code: string; slotData: EnrichedSlot }) {
  const slotId = initialSlotData.id;
  const eventId = initialSlotData.eventId;

  const [rounds, setRounds] = useState(initialSlotData.category.rounds);
  const [currentPhaseOrder, setCurrentPhaseOrder] = useState(initialSlotData.category.currentPhaseOrder);
  const [registrations, setRegistrations] = useState(initialSlotData.category.registrations);
  const [matches, setMatches] = useState(initialSlotData.category.matches);

  const fetchSlot = useCallback(async () => {
    try {
      const res = await fetch(`/api/judge-slots/${code}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: EnrichedSlot = await res.json();
      setRounds(data.category.rounds);
      setCurrentPhaseOrder(data.category.currentPhaseOrder);
      setRegistrations(data.category.registrations);
      setMatches(data.category.matches);
    } catch {
      // ignore — will retry next interval
    }
  }, [code]);

  // Poll every 5 seconds
  useEffect(() => {
    const id = setInterval(fetchSlot, 5000);
    return () => clearInterval(id);
  }, [fetchSlot]);

  // Socket listener for phase changes
  useEffect(() => {
    const socket = io({ path: "/api/socketio", transports: ["websocket"] });

    socket.on("phase:activated", () => fetchSlot());
    socket.on("phase:completed", () => fetchSlot());

    return () => { socket.disconnect(); };
  }, [fetchSlot]);

  const activeRound = rounds.find((r) => r.phaseStatus === "ACTIVE") ?? null;
  const isRosterRound = activeRound != null && ["CYPHER", "QUALIFIER"].includes(activeRound.type);
  const liveMatch = matches.find((m) => m.status === "LIVE") ?? null;

  const enrichedSlotData = {
    ...initialSlotData,
    category: {
      ...initialSlotData.category,
      rounds,
      currentPhaseOrder,
      registrations,
      matches,
    },
  };

  return (
    <main className="min-h-screen bg-paper">
      {isRosterRound ? (
        <div className="px-md py-section md:px-xl">
          <p className="font-mono text-body-sm uppercase text-accent">Judge portal</p>
          <h1 className="mt-lg font-display text-display-lg uppercase">
            Judging: {initialSlotData.category.name}
          </h1>
          <p className="mt-sm text-body-sm text-ink-muted">{initialSlotData.category.event.title}</p>
          <p className="mt-sm font-mono text-body-sm uppercase text-ink-muted">
            {activeRound ? `Phase ${activeRound.order}: ${activeRound.label ?? activeRound.type}` : "No active phase yet"}
          </p>
          <ScoringInterface
            code={code}
            slotId={slotId}
            data={enrichedSlotData}
            activeRound={activeRound}
          />
        </div>
      ) : (
        <SocketProvider code={code}>
          <JudgeDashboard
            code={code}
            slotId={slotId}
            eventId={eventId}
            categoryName={initialSlotData.category.name}
            eventTitle={initialSlotData.category.event.title}
            roundLabel={activeRound?.label ?? activeRound?.type ?? null}
            initialLiveMatch={liveMatch ? buildInitialLiveMatch(liveMatch) : null}
          />
        </SocketProvider>
      )}
    </main>
  );
}
