"use client";

import Link from "next/link";

interface ArtistProfileHeroProps {
  artist: {
    name: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    style: string | null;
    crew: string | null;
    city: string | null;
    country: string | null;
    experience: string | null;
    keywords: string | null;
    bio: string | null;
    isProfilePublic: boolean;
  };
  isOwnProfile: boolean;
  canHire: boolean;
  stats: { battles: number; wins: number; achievements: number; joined: Date | null };
}

export function ArtistProfileHero({ artist, isOwnProfile, canHire, stats }: ArtistProfileHeroProps) {
  const winRate = stats.battles > 0 ? Math.round((stats.wins / stats.battles) * 100) : 0;

  return (
    <section className="relative">
      {artist.coverUrl && (
        <div className="relative h-48 md:h-72 overflow-hidden border-b border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artist.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/40 to-transparent" />
        </div>
      )}

      <div className={`mx-auto max-w-7xl px-md md:px-xl ${artist.coverUrl ? "-mt-20 md:-mt-24" : "pt-section"}`}>
        <div className="flex flex-col gap-lg">
          <div className="flex flex-col gap-lg lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-lg lg:flex-row lg:items-end lg:gap-lg">
              <div className="shrink-0">
                {artist.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artist.avatarUrl}
                    alt={`${artist.name ?? "Artist"} profile picture`}
                    className="h-32 w-32 md:h-40 md:w-40 rounded-2xl border-[3px] border-paper bg-paper-soft object-cover shadow-card"
                  />
                ) : (
                  <div className="flex h-32 w-32 md:h-40 md:w-40 items-center justify-center rounded-2xl border-[3px] border-paper bg-paper-soft font-display text-5xl uppercase text-ink-muted shadow-card">
                    {artist.name?.charAt(0) ?? "?"}
                  </div>
                )}
              </div>
              <div>
                <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Artist profile</p>
                <h1 className="mt-xs font-display text-display-lg uppercase md:text-display-xl">
                  {artist.name ?? "Unnamed artist"}
                </h1>
                <div className="mt-md flex flex-wrap items-center gap-x-lg gap-y-2 text-body-sm text-ink-muted">
                  {artist.style && (
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                      </svg>
                      {artist.style}
                    </span>
                  )}
                  {artist.crew && (
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-4-4m4 4a4 4 0 0 0 4-4m-4 4h2.5a4 4 0 0 0 4-4M9 6.5a4 4 0 1 1-4 4" />
                      </svg>
                      {artist.crew}
                    </span>
                  )}
                  {(artist.city || artist.country) && (
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                      {[artist.city, artist.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {artist.experience && (
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      {artist.experience}
                    </span>
                  )}
                </div>
                {artist.bio && (
                  <p className="mt-md max-w-2xl text-body-sm text-ink-muted">{artist.bio}</p>
                )}
              </div>
            </div>

            <div className="shrink-0 lg:pb-md">
              <div className="flex flex-wrap items-stretch gap-3">
                {isOwnProfile && (
                  <Link
                    href="/artist"
                    className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    Edit profile
                  </Link>
                )}
                {canHire && (
                  <Link
                    href={`/events`}
                    className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
                  >
                    Book {artist.name?.split(" ")[0] ?? "artist"}
                  </Link>
                )}
                {(artist.isProfilePublic || isOwnProfile) && (
                  <a
                    href="mailto:joincyphr@gmail.com?subject=Booking request"
                    className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    Message
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-sm border-t border-line pt-lg sm:grid-cols-4">
            <div>
              <p className="font-display text-title-md text-accent">{stats.battles}</p>
              <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Battles</p>
            </div>
            <div>
              <p className="font-display text-title-md text-accent">{stats.wins}</p>
              <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Wins</p>
            </div>
            <div>
              <p className="font-display text-title-md text-accent">{winRate}%</p>
              <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Win rate</p>
            </div>
            <div>
              <p className="font-display text-title-md text-accent">{stats.achievements}</p>
              <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Achievements</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}