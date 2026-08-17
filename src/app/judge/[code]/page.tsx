export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { JudgeShell } from "@/components/judge-shell";

type PageParams = { params: Promise<{ code: string }> };

export default async function JudgeCodePage({ params }: PageParams) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();

  const slot = await prisma.judgeSlot.findUnique({
    where: { code: normalizedCode },
    include: {
      category: {
        select: { id: true, name: true, currentPhaseOrder: true, eventId: true },
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

  const [rounds, registrations, matches, event] = await Promise.all([
    prisma.roundFormat.findMany({
      where: { categoryId: slot.categoryId },
      orderBy: { order: "asc" },
      select: { id: true, order: true, type: true, label: true, phaseStatus: true },
    }),
    prisma.registration.findMany({
      where: { categoryId: slot.categoryId, status: "CONFIRMED" },
      include: {
        user: { select: { name: true, email: true } },
        members: { where: { status: "ACCEPTED" }, select: { user: { select: { name: true, username: true } } } },
        dancerScores: { select: { roundFormatId: true, score: true, judgeSlotId: true } },
      },
      orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
    }),
    prisma.battleMatch.findMany({
      where: { categoryId: slot.categoryId },
      include: {
        competitorA: { include: { user: { select: { name: true, avatarUrl: true } } } },
        competitorB: { include: { user: { select: { name: true, avatarUrl: true } } } },
        scores: { include: { judgeSlot: { select: { name: true } } } },
      },
      orderBy: [{ round: "asc" }, { position: "asc" }],
    }),
    prisma.event.findUnique({
      where: { id: slot.eventId },
      select: { id: true, title: true },
    }),
  ]);

  const slotData = {
    id: slot.id,
    code: normalizedCode,
    name: slot.name,
    categoryId: slot.categoryId,
    eventId: slot.eventId,
    isActive: slot.isActive,
    category: {
      id: slot.category.id,
      name: slot.category.name,
      currentPhaseOrder: slot.category.currentPhaseOrder,
      event: event!,
      rounds,
      registrations,
      matches,
    },
  };

  return <JudgeShell code={normalizedCode} slotData={slotData} />;
}
