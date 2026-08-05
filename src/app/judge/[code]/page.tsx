export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ScoringInterface } from "@/components/scoring-interface";

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
          event: { select: { id: true, title: true } },
          matches: {
            include: {
              competitorA: { include: { user: { select: { name: true } } } },
              competitorB: { include: { user: { select: { name: true } } } },
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

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <p className="font-mono text-body-sm uppercase text-accent">Judge portal</p>
      <h1 className="mt-lg font-display text-display-lg uppercase">
        Judging: {slot.category.name}
      </h1>
      <p className="mt-sm text-body-sm text-ink-muted">
        {slot.category.event.title}
      </p>
      <ScoringInterface code={normalizedCode} data={slot} />
    </main>
  );
}
