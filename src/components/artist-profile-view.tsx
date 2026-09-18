"use client";

import { useState } from "react";
import { ArtistProfileHero } from "@/components/artist-profile-hero";
import { ArtistProfileAbout } from "@/components/artist-profile-about";
import { ArtistProfileWorks, type ArtistProfileWork } from "@/components/artist-profile-works";
import { formatDate, formatFee } from "@/lib/format";

type Achievement = {
  id: string;
  title: string;
  competition: string | null;
  placement: string | null;
  year: number | null;
  prize: number | null;
  currency: string;
  note: string | null;
};

type BattleRegistration = {
  id: string;
  createdAt: Date;
  category: {
    name: string;
    prizePool: { isPaid: boolean } | null;
    event: { id: string; title: string };
  };
  matchesAsA: Array<{ id: string; round: number; status: string; competitorB: { user: { name: string | null } } | null; winner: { userId: string } | null }>;
  matchesAsB: Array<{ id: string; round: number; status: string; competitorA: { user: { name: string | null } } | null; winner: { userId: string } | null }>;
};

const TABS = ["About", "Works", "Achievements", "Battles"] as const;
type Tab = (typeof TABS)[number];

interface ArtistProfileViewProps {
  artist: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    style: string | null;
    crew: string | null;
    city: string | null;
    country: string | null;
    experience: string | null;
    socialHandle: string | null;
    keywords: string | null;
    bio: string | null;
    skills: string[];
    socialLinks: Record<string, string> | null;
    hourlyRate: number | null;
    responseTime: string | null;
    isProfilePublic: boolean;
    isOwnProfile: boolean;
  };
  stats: { battles: number; wins: number; achievements: number; joined: Date | null };
  works: ArtistProfileWork[];
  achievements: Achievement[];
  registrations: BattleRegistration[];
  canHire: boolean;
}

export function ArtistProfileView({
  artist,
  stats,
  works,
  achievements,
  registrations,
  canHire,
}: ArtistProfileViewProps) {
  const [tab, setTab] = useState<Tab>(works.length > 0 ? "Works" : "About");

  return (
    <main className="min-h-screen bg-paper">
      <ArtistProfileHero
        artist={artist}
        isOwnProfile={artist.isOwnProfile}
        canHire={canHire}
        stats={stats}
      />

      <nav className="sticky top-0 z-30 mt-lg border-y border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-md md:px-xl">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative whitespace-nowrap px-lg py-md font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors ${
                tab === t ? "text-accent" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t}
              {t === "Works" && <span className="ml-xs text-ink-muted">({works.length})</span>}
              {t === "Achievements" && <span className="ml-xs text-ink-muted">({achievements.length})</span>}
              {tab === t && <span className="absolute inset-x-lg bottom-0 h-0.5 bg-accent" />}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
        {tab === "About" && (
          <ArtistProfileAbout
            bio={artist.bio}
            keywords={artist.keywords}
            socialHandle={artist.socialHandle}
            skills={artist.skills}
            socialLinks={artist.socialLinks}
            hourlyRate={artist.hourlyRate}
            responseTime={artist.responseTime}
          />
        )}

        {tab === "Works" && <ArtistProfileWorks works={works} />}

        {tab === "Achievements" && (
          <AchievementsSection achievements={achievements} />
        )}

        {tab === "Battles" && (
          <BattlesSection registrations={registrations} artistId={artist.id} joined={stats.joined} />
        )}
      </div>
    </main>
  );
}

function AchievementsSection({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) {
    return (
      <div className="border border-line bg-paper-soft p-xl text-center">
        <p className="text-body-sm text-ink-muted">No achievements listed yet.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-md sm:grid-cols-2">
      {achievements.map((a) => (
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
  );
}

function BattlesSection({
  registrations,
  artistId,
  joined,
}: {
  registrations: BattleRegistration[];
  artistId: string;
  joined: Date | null;
}) {
  if (registrations.length === 0) {
    return (
      <div className="border border-line bg-paper-soft p-xl text-center">
        <p className="text-body-sm text-ink-muted">
          This artist has not entered any events on CYPHR yet.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-sm">
      {registrations.map((reg) => {
        const allMatches = [...reg.matchesAsA, ...reg.matchesAsB].sort(
          (a, b) => a.round - b.round || a.id.localeCompare(b.id),
        );
        return (
          <article key={reg.id} className="border border-line bg-paper-soft p-lg">
            <div className="flex flex-wrap items-start justify-between gap-sm">
              <div>
                <h3 className="font-display text-title-md uppercase">{reg.category.event.title}</h3>
                <p className="mt-xs text-body-sm text-ink-muted">
                  {reg.category.name}
                  {reg.category.prizePool ? ` · ${reg.category.prizePool.isPaid ? "Prize paid" : "Prize pending"}` : ""}
                </p>
              </div>
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
                {formatDate(reg.createdAt)}
              </span>
            </div>
            <div className="mt-md space-y-sm border-t border-line pt-md">
              {allMatches.length === 0 ? (
                <p className="text-body-sm text-ink-muted">No matches yet.</p>
              ) : (
                allMatches
                  .map((match) => {
                    const isA = "competitorA" in match;
                    const opponent = isA
                      ? match.competitorA?.user.name
                      : match.competitorB?.user.name;
                    return { match, opponent };
                  })
                  .map(({ match, opponent }) => {
                    const won = match.winner?.userId === artistId;
                    const isComplete = match.status === "COMPLETE";

                    return (
                      <div key={match.id} className="flex items-center justify-between gap-md text-body-sm">
                        <p className="min-w-0">
                          <span className="font-bold uppercase">Round {match.round}</span>
                          <span className="text-ink-muted"> vs </span>
                          <span className={isComplete && match.winner && !won ? "text-accent" : ""}>
                            {opponent ?? "TBD"}
                          </span>
                        </p>
                        <span
                          className={`shrink-0 px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] ${
                            isComplete
                              ? won
                                ? "bg-accent/10 text-accent"
                                : "bg-paper text-ink-muted"
                              : "bg-paper text-ink-muted"
                          }`}
                        >
                          {isComplete ? (won ? "WIN" : "LOSS") : "UPCOMING"}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </article>
        );
      })}
      {joined ? (
        <p className="pt-sm text-body-sm text-ink-muted">Active on CYPHR since {formatDate(joined)}</p>
      ) : null}
    </div>
  );
}