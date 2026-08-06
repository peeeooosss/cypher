import { notFound } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatDate, formatFee } from "@/lib/format";
import { skillLabel } from "@/lib/skills";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ userId: string }> };

export default async function OrganizerArtistProfilePage({ params }: PageProps) {
  const { userId } = await params;
  await requireRole("ORGANIZER");

  const artist = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      style: true,
      crew: true,
      city: true,
      country: true,
      experience: true,
      socialHandle: true,
      skills: true,
      achievements: { orderBy: [{ year: "desc" }, { createdAt: "desc" }] },
      registrations: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              prizePool: { select: { distribution: true, isPaid: true } },
              event: { select: { id: true, title: true } },
            },
          },
          matchesAsA: {
            include: {
              competitorB: { include: { user: { select: { name: true } } } },
              winner: { select: { userId: true } },
              scores: { select: { feedback: true } },
            },
            orderBy: { round: "asc" },
          },
          matchesAsB: {
            include: {
              competitorA: { include: { user: { select: { name: true } } } },
              winner: { select: { userId: true } },
              scores: { select: { feedback: true } },
            },
            orderBy: { round: "asc" },
          },
          matchesWon: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!artist) {
    notFound();
  }

  const totalMatches = artist.registrations.reduce((s, r) => s + r.matchesAsA.length + r.matchesAsB.length, 0);
  const totalWins = artist.registrations.reduce((s, r) => s + r.matchesWon.length, 0);

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <Link
        href="/organizer/artists"
        className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
      >
        &larr; Back to artist directory
      </Link>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            Artist profile
          </p>
          <h1 className="font-display text-display-lg uppercase">{artist.name ?? "Unnamed artist"}</h1>
          <p className="mt-sm text-body-sm text-ink-muted">
            {[artist.style, artist.crew, artist.city, artist.country, artist.experience].filter(Boolean).join(" · ")}
          </p>
          {artist.socialHandle ? (
            <p className="mt-xs font-mono text-[0.7rem] text-accent">{artist.socialHandle}</p>
          ) : null}
        </div>
        <SignOutButton />
      </div>

      {artist.skills.length > 0 && (
        <div className="mt-lg flex flex-wrap gap-xs">
          {artist.skills.map((skill) => (
            <span key={skill} className="border border-line px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
              {skillLabel(skill)}
            </span>
          ))}
        </div>
      )}

      <section className="mt-section grid grid-cols-3 gap-md">
        <div className="border border-line bg-paper-soft p-lg">
          <p className="font-display text-title-md text-accent">{totalWins}</p>
          <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Battles won</p>
        </div>
        <div className="border border-line bg-paper-soft p-lg">
          <p className="font-display text-title-md">{totalMatches}</p>
          <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Total battles</p>
        </div>
        <div className="border border-line bg-paper-soft p-lg">
          <p className="font-display text-title-md">{artist.achievements.length}</p>
          <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Achievements</p>
        </div>
      </section>

      <section className="mt-section">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">Achievements</p>
        {artist.achievements.length === 0 ? (
          <p className="mt-md border border-line p-lg text-body-sm text-ink-muted">No achievements listed.</p>
        ) : (
          <div className="mt-lg grid gap-md sm:grid-cols-2">
            {artist.achievements.map((a) => (
              <article key={a.id} className="border border-line bg-paper-soft p-lg">
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <div>
                    <h3 className="font-display text-title-md uppercase">{a.title}</h3>
                    <p className="mt-xs text-body-sm text-ink-muted">
                      {a.competition ?? "Competition"}
                      {a.year ? ` · ${a.year}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    {a.prize && a.prize > 0 ? (
                      <p className="font-mono text-[0.7rem] uppercase text-accent">{formatFee(a.prize, a.currency)}</p>
                    ) : null}
                    {a.placement ? (
                      <p className="mt-xs font-mono text-[0.7rem] uppercase text-ink-muted">{a.placement}</p>
                    ) : null}
                  </div>
                </div>
                {a.note ? <p className="mt-sm text-body-sm text-ink-muted">{a.note}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-section">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">Battle record</p>
        {artist.registrations.length === 0 ? (
          <p className="mt-md border border-line p-lg text-body-sm text-ink-muted">
            This artist has not entered any events on CYPHR yet.
          </p>
        ) : (
          <div className="mt-lg grid gap-md lg:grid-cols-2">
            {artist.registrations.map((reg) => {
              const allMatches = [...reg.matchesAsA, ...reg.matchesAsB].sort((a, b) => a.round - b.round || a.position - b.position);
              return (
                <article key={reg.id} className="border border-line bg-paper-soft p-lg">
                  <h3 className="font-display text-title-md uppercase">{reg.category.event.title}</h3>
                  <p className="mt-xs text-body-sm text-ink-muted">
                    {reg.category.name}
                    {reg.category.prizePool ? ` · ${reg.category.prizePool.isPaid ? "Prize paid" : "Prize pending"}` : ""}
                  </p>
                  <div className="mt-md space-y-sm border-t border-line pt-md">
                    {allMatches.length === 0 ? (
                      <p className="text-body-sm text-ink-muted">No matches yet.</p>
                    ) : (
                      allMatches.map((match) => {
                        const isA = reg.matchesAsA.some((m) => m.id === match.id);
                        const matchAny = match as unknown as {
                          round: number;
                          status: string;
                          competitorA: { user: { name: string | null } } | null;
                          competitorB: { user: { name: string | null } } | null;
                          winner: { userId: string } | null;
                          scores: { feedback: string | null }[];
                        };
                        const opponent = isA ? matchAny.competitorB?.user.name : matchAny.competitorA?.user.name;
                        const won = matchAny.winner?.userId === artist.id;
                        const feedbackText = matchAny.scores.flatMap((s) => (s.feedback ? [s.feedback] : [])).join(" | ");
                        return (
                          <div key={match.id} className="text-body-sm">
                            <p className="font-bold uppercase">
                              Round {matchAny.round} vs {opponent ?? "TBD"}
                              {matchAny.status === "COMPLETE" ? ` — ${won ? "W" : "L"}` : ""}
                            </p>
                            {feedbackText ? <p className="mt-xs text-ink-muted">{feedbackText}</p> : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-section border border-line bg-paper-soft p-lg">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Contact</p>
        <p className="mt-sm text-body-sm text-ink-muted">
          {artist.email}
          {artist.socialHandle ? ` · ${artist.socialHandle}` : ""} · joined{" "}
          {artist.registrations[0] ? formatDate(artist.registrations[0].createdAt) : "recently"}
        </p>
      </section>
    </main>
  );
}
