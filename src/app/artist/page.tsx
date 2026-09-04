import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { ArtistProfileForm, type ArtistProfile } from "@/components/artist-profile-form";
import { ArtistAchievements, type Achievement } from "@/components/artist-achievements";
import { MarketplaceComingSoon } from "@/components/marketplace-coming-soon";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/pagination";
import { TeamInvitations } from "@/components/team-invitations";
import { TeamEntries } from "@/components/team-entries";
import { ArtistEventCard } from "@/components/artist-event-card";
import type { BattleMatchBreakdown, RosterRound } from "@/components/artist-scoreboard";

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
            scores: { select: { feedback: true, feedbackRed: true, feedbackBlue: true, scoreA: true, scoreB: true, winnerCorner: true, scoreAMusicality: true, scoreAFoundation: true, scoreAPresentation: true, scoreAExecution: true, scoreBMusicality: true, scoreBFoundation: true, scoreBPresentation: true, scoreBExecution: true, judgeSlot: { select: { name: true, code: true } } } },
          },
          orderBy: { round: "asc" },
        },
        matchesAsB: {
          include: {
            competitorA: { include: { user: { select: { name: true } } } },
             winner: { select: { id: true, userId: true } },
            scores: { select: { feedback: true, feedbackRed: true, feedbackBlue: true, scoreA: true, scoreB: true, winnerCorner: true, scoreAMusicality: true, scoreAFoundation: true, scoreAPresentation: true, scoreAExecution: true, scoreBMusicality: true, scoreBFoundation: true, scoreBPresentation: true, scoreBExecution: true, judgeSlot: { select: { name: true, code: true } } } },
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
        keywords: true,
        referral: true,
        skills: true,
        gigWorkExpiresAt: true,
        minJudgingPricePerDay: true,
        minWorkshopPricePerDay: true,
        avatarUrl: true,
        isProfilePublic: true,
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

       <MarketplaceComingSoon compact />
       <MarketplaceComingSoon variant="rates" compact />

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
                  musicality: ds.musicality,
                  foundation: ds.foundation,
                  presentation: ds.presentation,
                  execution: ds.execution,
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
                    sectionsA: s.scoreAMusicality != null ? { musicality: s.scoreAMusicality, foundation: s.scoreAFoundation!, presentation: s.scoreAPresentation!, execution: s.scoreAExecution! } : null,
                    sectionsB: s.scoreBMusicality != null ? { musicality: s.scoreBMusicality, foundation: s.scoreBFoundation!, presentation: s.scoreBPresentation!, execution: s.scoreBExecution! } : null,
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
                    sectionsA: s.scoreAMusicality != null ? { musicality: s.scoreAMusicality, foundation: s.scoreAFoundation!, presentation: s.scoreAPresentation!, execution: s.scoreAExecution! } : null,
                    sectionsB: s.scoreBMusicality != null ? { musicality: s.scoreBMusicality, foundation: s.scoreBFoundation!, presentation: s.scoreBPresentation!, execution: s.scoreBExecution! } : null,
                  })),
                })),
              ].sort((a, b) => a.round - b.round);

              return (
                <ArtistEventCard
                  key={reg.id}
                  eventTitle={reg.category.event.title}
                  categoryName={reg.category.name}
                  categoryFormat={reg.category.format}
                  eventSlug={reg.category.event.slug}
                  isLive={isLive}
                  entryFee={reg.entryFee}
                  entryCurrency={reg.entryCurrency}
                  paid={reg.paid}
                  paidClaimedAt={reg.paidClaimedAt}
                  isOwner={reg.userId === user.id}
                  userId={user.id}
                  regId={reg.id}
                  eventId={reg.category.event.id}
                  memberCount={reg.members.length}
                  matches={allMatches.map((m) => {
                    const match = m as unknown as {
                      id: string; round: number; position: number; status: string;
                      scoreA: number; scoreB: number;
                      competitorA: { user: { name: string | null } } | null;
                      competitorB: { user: { name: string | null } } | null;
                      winner: { id: string; userId: string } | null;
                      scores: { feedback: string | null; feedbackRed: string | null; feedbackBlue: string | null; scoreA: number; scoreB: number; winnerCorner: string | null; judgeSlot: { name: string | null; code: string } }[];
                    };
                    return {
                      id: match.id,
                      round: match.round,
                      position: match.position,
                      status: match.status,
                      scoreA: match.scoreA,
                      scoreB: match.scoreB,
                      competitorA: match.competitorA,
                      competitorB: match.competitorB,
                      winner: match.winner,
                      scores: match.scores,
                    };
                  })}
                  rosterRounds={rosterRounds}
                  battleMatches={battleMatches}
                  wins={wins}
                  prizePool={reg.category.prizePool}
                />
              );
            })}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/artist" />
        </section>
      ) : null}
    </main>
  );
}
