import { RegistrationButton } from "@/components/registration-button";
import { SignOutButton } from "@/components/sign-out-button";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ArtistPage() {
  const user = await requireRole("ARTIST");
  const [events, registrations, battleResults] = await Promise.all([
    prisma.event.findMany({
      where: { status: { in: ["PUBLISHED", "LIVE"] } },
      include: { categories: { include: { _count: { select: { registrations: true } } } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.registration.findMany({ where: { userId: user.id }, select: { categoryId: true } }),
    prisma.registration.findMany({
      where: { userId: user.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            event: { select: { id: true, title: true } },
            prizePool: { select: { distribution: true, isPaid: true } },
          },
        },
        matchesAsA: {
          include: {
            competitorB: { include: { user: { select: { name: true } } } },
            winner: { select: { userId: true } },
            scores: { select: { feedback: true, scoreA: true, scoreB: true } },
          },
          orderBy: { round: "asc" },
        },
        matchesAsB: {
          include: {
            competitorA: { include: { user: { select: { name: true } } } },
            winner: { select: { userId: true } },
            scores: { select: { feedback: true, scoreA: true, scoreB: true } },
          },
          orderBy: { round: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const registeredCategoryIds = new Set(registrations.map((registration) => registration.categoryId));

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Artist space</p>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="font-display text-display-lg uppercase">Find your next battle.</h1>
          <p className="mt-sm text-body-sm text-ink-muted">Signed in as {user.email}</p>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-section grid gap-md lg:grid-cols-2">
        {events.length === 0 ? <p className="border border-line p-lg text-ink-muted">No open events right now.</p> : null}
        {events.map((event) => (
          <article className="border border-line bg-paper-soft p-lg" key={event.id}>
            <p className="font-mono text-[0.7rem] uppercase text-accent">{event.status}</p>
            <h2 className="mt-sm font-display text-title-md uppercase">{event.title}</h2>
            <p className="mt-xs text-body-sm text-ink-muted">{event.startsAt.toLocaleString()} / {event.city ?? "Location TBA"}</p>
            <ul className="mt-lg space-y-sm border-t border-line pt-md">
              {event.categories.map((category) => (
                <li className="flex items-center justify-between gap-md" key={category.id}>
                  <span className="text-body-sm">{category.name} <span className="text-ink-muted">({category._count.registrations})</span></span>
                  <RegistrationButton categoryId={category.id} registered={registeredCategoryIds.has(category.id)} />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      {battleResults.length > 0 ? (
        <section className="mt-section">
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">My Results</p>
          <div className="mt-lg grid gap-md lg:grid-cols-2">
            {battleResults.map((reg) => {
              const allMatches = [...reg.matchesAsA, ...reg.matchesAsB].sort((a, b) => a.round - b.round || a.position - b.position);
              const wins = allMatches.filter((m) => m.winner?.userId === user.id).length;
              return (
                <article className="border border-line bg-paper-soft p-lg" key={reg.id}>
                  <h3 className="font-display text-title-md uppercase">{reg.category.event.title}</h3>
                  <p className="mt-xs text-body-sm text-ink-muted">{reg.category.name}</p>
                  <div className="mt-md space-y-sm border-t border-line pt-md">
                    {allMatches.length === 0 ? (
                      <p className="text-body-sm text-ink-muted">No matches yet.</p>
                    ) : (
                      allMatches.map((match) => {
                        const isA = reg.matchesAsA.some((m) => m.id === match.id);
                        const matchAny = match as unknown as {
                          scoreA: number; scoreB: number;
                          competitorA: { user: { name: string | null } } | null;
                          competitorB: { user: { name: string | null } } | null;
                          winner: { userId: string } | null;
                          scores: { feedback: string | null; scoreA: number; scoreB: number }[];
                          round: number;
                          status: string;
                        };
                        const opponent = isA ? matchAny.competitorB : matchAny.competitorA;
                        const myScore = isA ? matchAny.scoreA : matchAny.scoreB;
                        const theirScore = isA ? matchAny.scoreB : matchAny.scoreA;
                        const won = matchAny.winner?.userId === user.id;
                        const feedbackText = matchAny.scores.flatMap((s) => (s.feedback ? [s.feedback] : [])).join(" | ");
                        return (
                          <div className="flex items-start justify-between gap-sm text-body-sm" key={match.id}>
                            <div>
                              <p className="font-bold uppercase">
                                Round {matchAny.round} vs {opponent?.user.name ?? "TBD"}
                              </p>
                              <p className="text-ink-muted">
                                Score: {myScore} — {theirScore} {matchAny.status === "COMPLETE" ? (won ? "W" : "L") : ""}
                              </p>
                              {feedbackText ? <p className="mt-xs text-ink-muted">{feedbackText}</p> : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {wins > 0 && reg.category.prizePool?.distribution ? (
                    <div className="mt-md border-t border-line pt-md font-mono text-[0.7rem] uppercase text-accent">
                      {wins} wins — {reg.category.prizePool.isPaid ? "Prize paid" : "Prize pending"}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
