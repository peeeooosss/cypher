export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ScoringInterface } from "@/components/scoring-interface";
import { SocketProvider } from "@/components/socket-provider";
import { JudgeDashboard } from "@/components/judge-dashboard";
import type { MatchLiveData } from "@/lib/socket/types";

type PageParams = { params: Promise<{ code: string }> };

export default async function JudgeCodePage({ params }: PageParams) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();

  const slot = await prisma.judgeSlot.findUnique({
    where: { code: normalizedCode },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          currentPhaseOrder: true,
          event: { select: { id: true, title: true } },
          rounds: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              type: true,
              label: true,
              phaseStatus: true,
            },
          },
            registrations: {
            where: { status: "CONFIRMED" },
            include: {
              user: { select: { name: true, email: true, avatarUrl: true } },
              members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } },
              dancerScores: {
                select: { roundFormatId: true, score: true, judgeSlotId: true },
              },
            },
            orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
          },
          matches: {
            include: {
              competitorA: {
                include: { user: { select: { name: true, avatarUrl: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } },
              },
              competitorB: {
                include: { user: { select: { name: true, avatarUrl: true } }, members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } } },
              },
              scores: { include: { judgeSlot: { select: { name: true } } } },
            },
            orderBy: [{ round: "asc" }, { position: "asc" }],
          },
        },
      },
    },
  });

  if (!slot || !slot.isActive) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-sm py-section">
        <section className="w-full max-w-md border border-line bg-paper-soft p-lg sm:p-xl text-center">
          <p className="font-display text-title-md uppercase">CYPHR</p>
          <h1 className="mt-xl font-display text-display-lg uppercase text-accent">Invalid code</h1>
          <p className="mt-sm text-body-sm text-ink-muted">
            This access code is invalid or has expired.
          </p>
          <Link
            className="mt-xl inline-block border border-accent px-lg py-md text-body-sm font-bold uppercase text-accent"
            href="/judge"
          >
            Try another code
          </Link>
        </section>
      </main>
    );
  }

  const activeRound = slot.category.rounds.find((r) => r.phaseStatus === "ACTIVE");
  const isRosterRound =
    activeRound != null && ["CYPHER", "QUALIFIER"].includes(activeRound.type);

  const liveMatch = slot.category.matches.find((m) => m.status === "LIVE") ?? null;
  const initialLiveMatch: MatchLiveData | null = liveMatch
    ? {
        matchId: liveMatch.id,
        round: liveMatch.round,
        position: liveMatch.position,
        red: {
          id: liveMatch.competitorAId ?? "",
          name: liveMatch.competitorA?.teamName ?? liveMatch.competitorA?.user.name ?? "TBD",
          crew: liveMatch.competitorA?.crew ?? null,
          seed: liveMatch.competitorA?.seed ?? null,
          avatar: liveMatch.competitorA?.user.avatarUrl ?? null,
          members: liveMatch.competitorA?.members.map((member) => member.user.name ?? member.user.username ?? "Unnamed"),
        },
        blue: {
          id: liveMatch.competitorBId ?? "",
          name: liveMatch.competitorB?.teamName ?? liveMatch.competitorB?.user.name ?? "TBD",
          crew: liveMatch.competitorB?.crew ?? null,
          seed: liveMatch.competitorB?.seed ?? null,
          avatar: liveMatch.competitorB?.user.avatarUrl ?? null,
          members: liveMatch.competitorB?.members.map((member) => member.user.name ?? member.user.username ?? "Unnamed"),
        },
        timeLimitMs: 60000,
        status: "LIVE",
      }
    : null;

  return (
    <main className="min-h-screen bg-paper">
      {isRosterRound ? (
        <div className="px-md py-section md:px-xl">
          <p className="font-mono text-body-sm uppercase text-accent">Judge portal</p>
          <h1 className="mt-lg font-display text-display-lg uppercase">
            Judging: {slot.category.name}
          </h1>
          <p className="mt-sm text-body-sm text-ink-muted">{slot.category.event.title}</p>
          <p className="mt-sm font-mono text-body-sm uppercase text-ink-muted">
            {activeRound ? `Phase ${activeRound.order}: ${activeRound.label ?? activeRound.type}` : "No active phase yet"}
          </p>
          <ScoringInterface
            code={normalizedCode}
            slotId={slot.id}
            data={slot}
            activeRound={activeRound ?? null}
          />
        </div>
      ) : (
        <SocketProvider code={normalizedCode}>
          <JudgeDashboard
            code={normalizedCode}
            slotId={slot.id}
            eventId={slot.category.event.id}
            categoryName={slot.category.name}
            eventTitle={slot.category.event.title}
            roundLabel={activeRound?.label ?? activeRound?.type ?? null}
            initialLiveMatch={initialLiveMatch}
          />
        </SocketProvider>
      )}
    </main>
  );
}
