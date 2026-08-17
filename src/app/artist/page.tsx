import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { ArtistProfileForm, type ArtistProfile } from "@/components/artist-profile-form";
import { ArtistAchievements, type Achievement } from "@/components/artist-achievements";
import { ArtistAvailability } from "@/components/artist-availability";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/pagination";
import { formatLabel } from "@/lib/event-types";
import { TeamInvitations } from "@/components/team-invitations";
import { TeamEntries } from "@/components/team-entries";
import { ArtistScoreboard, type BattleMatchBreakdown, type RosterRound } from "@/components/artist-scoreboard";

export const dynamic = "force-dynamic";

const RESULTS_PER_PAGE = 5;

type PageProps = { searchParams: Promise<{ page?: string }> };

export default async function ArtistPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await requireRole("ARTIST");
  const [battleResults, profile, achievements, invitations] = await Promise.all([
    prisma.registration.findMany({
      where: { OR: [{ userId: user.id }, { members: { some: { userId: user.id, status: "ACCEPTED" } } }] },
      include: {
        category: {
          select: {
             id: true,
             name: true,
             format: true,
            event: { select: { id: true, title: true, slug: true, status: true } },
            prizePool: { select: { distribution: true, isPaid: true } },
          },
        },
        members: { include: { user: { select: { name: true, username: true } } } },
        dancerScores: {
          include: {
            roundFormat: { select: { order: true, type: true, label: true } },
            judgeSlot: { select: { name: true, code: true } },
          },
          orderBy: { roundFormat: { order: "asc" } },
        },
        matchesAsA: {
          include: {
            competitorB: { include: { user: { select: { name: true } } } },
             winner: { select: { id: true, userId: true } },
            scores: { select: { feedback: true, feedbackRed: true, feedbackBlue: true, scoreA: true, scoreB: true, winnerCorner: true, judgeSlot: { select: { name: true, code: true } } } },
          },
          orderBy: { round: "asc" },
        },
        matchesAsB: {
          include: {
            competitorA: { include: { user: { select: { name: true } } } },
             winner: { select: { id: true, userId: true } },
            scores: { select: { feedback: true, feedbackRed: true, feedbackBlue: true, scoreA: true, scoreB: true, winnerCorner: true, judgeSlot: { select: { name: true, code: true } } } },
          },
          orderBy: { round: "asc" },
        },
        matchesWon: { select: { id: true, categoryId: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        style: true,
        crew: true,
        city: true,
        country: true,
        experience: true,
        socialHandle: true,
        referral: true,
        skills: true,
        gigWorkExpiresAt: true,
        minJudgingPricePerDay: true,
        minWorkshopPricePerDay: true,
      },
    }),
    prisma.artistAchievement.findMany({
      where: { userId: user.id },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    }),
    prisma.registrationMember.findMany({
      where: { userId: user.id, status: "PENDING" },
      include: {
        registration: {
          select: {
            id: true,
            teamName: true,
            category: { select: { name: true, format: true, event: { select: { title: true, slug: true, startsAt: true } } } },
            user: { select: { name: true, username: true } },
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    }),
  ]);
  const totalMatches = battleResults.reduce((sum, r) => sum + r.matchesAsA.length + r.matchesAsB.length, 0);
  const totalWins = battleResults.reduce(
    (sum, r) =>
      sum +
       r.matchesAsA.filter((m) => m.winner?.id === r.id).length +
       r.matchesAsB.filter((m) => m.winner?.id === r.id).length,
    0,
  );
  const prizesPending = battleResults.filter((r) => r.matchesWon.length > 0 && r.category.prizePool && !r.category.prizePool.isPaid).length;
  const prizesPaid = battleResults.filter((r) => r.matchesWon.length > 0 && r.category.prizePool?.isPaid).length;

  const totalPages = Math.max(1, Math.ceil(battleResults.length / RESULTS_PER_PAGE));
  const requestedPage = Math.max(1, Number(params.page) || 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const pageResults = battleResults.slice((currentPage - 1) * RESULTS_PER_PAGE, currentPage * RESULTS_PER_PAGE);
  const teamEntries = battleResults.filter((registration) => registration.userId === user.id && registration.members.length > 1);

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Artist space</p>
      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="font-display text-display-lg uppercase">Find your next battle.</h1>
          <p className="mt-sm text-body-sm text-ink-muted">Signed in as {user.email}</p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Link
            href="/events"
            className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
          >
            See events
          </Link>
          <Link
            href="/artist/marketplace"
            className="border border-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent transition-opacity hover:opacity-80"
          >
            Marketplace / Gigs
          </Link>
          <SignOutButton />
        </div>
      </div>

      <section className="mt-section">
        <ArtistProfileForm profile={profile as ArtistProfile} />
      </section>

      <TeamInvitations initialInvitations={invitations} />
      <TeamEntries entries={teamEntries} />

      <section className="mt-section border border-line bg-paper-soft p-lg">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">Battle stats</p>
        <div className="mt-lg grid grid-cols-2 gap-md sm:grid-cols-4">
          <div>
            <p className="font-display text-title-md text-accent">{battleResults.length}</p>
            <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Events entered</p>
          </div>
          <div>
            <p className="font-display text-title-md text-accent">{totalWins}</p>
            <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Battles won</p>
          </div>
          <div>
            <p className="font-display text-title-md">{totalMatches}</p>
            <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Total battles</p>
          </div>
          <div>
            <p className="font-display text-title-md">{prizesPaid} <span className="text-ink-muted">/ {prizesPaid + prizesPending}</span></p>
            <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Prizes paid</p>
          </div>
        </div>
      </section>

      <section className="mt-section">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">My achievements</p>
        <div className="mt-lg">
          <ArtistAchievements achievements={achievements as Achievement[]} />
        </div>
      </section>

      <section className="mt-section border border-line bg-paper-soft p-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">Marketplace</p>
            <p className="mt-sm text-body-sm text-ink-muted">
              Browse freelance gigs, send proposals, receive offers and chat with organizers.
            </p>
          </div>
          <Link
            href="/artist/marketplace"
            className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
          >
            Open Marketplace
          </Link>
        </div>
      </section>

      <ArtistAvailability
        minJudging={profile?.minJudgingPricePerDay ?? null}
        minWorkshop={profile?.minWorkshopPricePerDay ?? null}
      />

      {battleResults.length > 0 ? (
        <section className="mt-section">
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">My enrolled events</p>
          <div className="mt-lg grid gap-md lg:grid-cols-2">
            {pageResults.map((reg) => {
              const allMatches = [...reg.matchesAsA, ...reg.matchesAsB].sort((a, b) => a.round - b.round || a.position - b.position);
              const wins = allMatches.filter((m) => m.winner?.userId === user.id).length;
              const isLive = reg.category.event.status === "LIVE";

              const rosterRounds: RosterRound[] = [];
              for (const ds of reg.dancerScores) {
                const order = ds.roundFormat.order;
                let round = rosterRounds.find((r) => r.order === order);
                if (!round) {
                  round = { order, type: ds.roundFormat.type, label: ds.roundFormat.label, scores: [] };
                  rosterRounds.push(round);
                }
                round.scores.push({
                  judgeName: ds.judgeSlot.name ?? ds.judgeSlot.code,
                  score: ds.score,
                  feedback: ds.feedback,
                });
              }

              const battleMatches: BattleMatchBreakdown[] = [
                ...reg.matchesAsA.map((m) => ({
                  id: m.id,
                  round: m.round,
                  status: m.status,
                  opponentName: m.competitorB?.user.name ?? "TBD",
                  iAmRed: true,
                  scores: m.scores.map((s) => ({
                    judgeName: s.judgeSlot.name ?? s.judgeSlot.code,
                    winnerCorner: s.winnerCorner,
                    feedback: s.feedback,
                    feedbackRed: s.feedbackRed,
                    feedbackBlue: s.feedbackBlue,
                    scoreA: s.scoreA,
                    scoreB: s.scoreB,
                  })),
                })),
                ...reg.matchesAsB.map((m) => ({
                  id: m.id,
                  round: m.round,
                  status: m.status,
                  opponentName: m.competitorA?.user.name ?? "TBD",
                  iAmRed: false,
                  scores: m.scores.map((s) => ({
                    judgeName: s.judgeSlot.name ?? s.judgeSlot.code,
                    winnerCorner: s.winnerCorner,
                    feedback: s.feedback,
                    feedbackRed: s.feedbackRed,
                    feedbackBlue: s.feedbackBlue,
                    scoreA: s.scoreA,
                    scoreB: s.scoreB,
                  })),
                })),
              ].sort((a, b) => a.round - b.round);

              return (
                <article className="border border-line bg-paper-soft p-lg" key={reg.id}>
                  <div className="flex flex-wrap items-start justify-between gap-sm">
                    <div>
                      <h3 className="font-display text-title-md uppercase">{reg.category.event.title}</h3>
                      <p className="mt-xs text-body-sm text-ink-muted">{reg.category.name} · {formatLabel(reg.category.format)}</p>
                    </div>
                    <Link
                      href={`/events/${reg.category.event.slug}${isLive ? "/live" : ""}`}
                      className="border border-accent px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-accent hover:bg-accent hover:text-paper"
                    >
                      {isLive ? "Go live" : "View updates"}
                    </Link>
                  </div>
                  <p className={`mt-xs font-mono text-[0.7rem] uppercase tracking-[0.1em] ${reg.paid ? "text-accent" : "text-ink-muted"}`}>
                    {reg.entryFee && reg.entryFee > 0
                      ? `${reg.entryCurrency === "INR" ? "₹" : `${reg.entryCurrency} `}${reg.entryFee} — ${reg.paid ? "Paid & confirmed" : reg.paidClaimedAt ? "Registered" : "Wait for verification"}`
                      : "Free entry"}
                  </p>
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
                  <ArtistScoreboard rosterRounds={rosterRounds} matches={battleMatches} />
                  {!reg.paid && !reg.paidClaimedAt && reg.userId === user.id ? (
                    <Link
                      href={`/cart?event=${reg.category.event.id}&ids=${reg.id}`}
                      className="mt-md inline-block border border-accent bg-accent px-md py-sm font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
                    >
                      {reg.members.length > 1 ? "Check roster & pay" : "Complete payment"}
                    </Link>
                  ) : null}
                  {wins > 0 && reg.category.prizePool?.distribution ? (
                    <div className="mt-md border-t border-line pt-md font-mono text-[0.7rem] uppercase text-accent">
                      {wins} wins — {reg.category.prizePool.isPaid ? "Prize paid" : "Prize pending"}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/artist" />
        </section>
      ) : null}
    </main>
  );
}
