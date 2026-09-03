"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SKILLS, SKILL_LABELS, skillLabel } from "@/lib/skills";
import { formatExperience } from "@/lib/format";

export type DirectoryArtist = {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  style: string | null;
  crew: string | null;
  city: string | null;
  country: string | null;
  experience: string | null;
  socialHandle: string | null;
  keywords: string | null;
  skills: string[];
  wins: number;
  matches: number;
  registrations: number;
  achievements: number;
};

export function ArtistDirectory({
  artists,
  baseHref = "/artist/directory",
  isPublic = false,
}: {
  artists: DirectoryArtist[];
  baseHref?: string;
  isPublic?: boolean;
}) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return artists.filter((artist) => {
      const q = query.trim().toLowerCase();

      const matchesSkills =
        selectedSkills.length === 0 ||
        artist.skills.some((skill) => selectedSkills.includes(skill));

      if (!matchesSkills) return false;
      if (!q) return true;

      const searchText = [
        artist.name,
        artist.username,
        artist.style,
        artist.crew,
        artist.city,
        artist.country,
        artist.socialHandle,
        artist.keywords,
        ...artist.skills,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(q);
    });
  }, [artists, query, selectedSkills]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  return (
    <div className="mt-section">
      <div className="flex flex-wrap items-center gap-md">
        <input
          className="min-w-0 flex-1 border border-line bg-paper px-md py-sm text-body-sm focus:border-accent"
          placeholder="Search name, @username, handle, style, crew, city, country, keywords, skills..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="shrink-0 border border-line px-md py-sm font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted hover:border-accent hover:text-accent"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="mt-md flex flex-wrap gap-xs">
        {SKILLS.map((skill) => {
          const active = selectedSkills.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`border px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] transition-colors ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-ink-muted hover:border-accent"
              }`}
            >
              {SKILL_LABELS[skill]}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-lg border border-line p-xl text-body-sm text-ink-muted">
          No artists match your filters.
        </p>
      ) : (
        <div className="mt-lg grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((artist) => (
            <Link
              key={artist.id}
              href={`${baseHref}/${artist.id}`}
              className="group relative border border-line bg-paper-soft p-lg transition-colors hover:border-accent"
            >
              {isPublic ? (
                <span className="absolute right-md top-md font-mono text-[0.55rem] uppercase tracking-[0.15em] text-ink-muted">
                  Public
                </span>
              ) : null}
              <div className="flex items-center gap-md">
                {artist.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artist.avatarUrl}
                    alt={`${artist.name ?? "Artist"}`}
                    className="h-20 w-20 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-line bg-paper font-display text-title-lg uppercase text-ink-muted">
                    {artist.name?.charAt(0) ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate font-display text-title-md uppercase transition-colors group-hover:text-accent">
                    {artist.name ?? "Unnamed artist"}
                  </h2>
                  {artist.username ? (
                    <p className="truncate font-mono text-[0.7rem] text-ink-muted">@{artist.username}</p>
                  ) : null}
                  {artist.socialHandle ? (
                    <p className="truncate font-mono text-[0.7rem] text-accent">{artist.socialHandle}</p>
                  ) : null}
                </div>
              </div>
              <p className="mt-sm text-body-sm text-ink-muted">
                {[artist.style, artist.crew, artist.city, artist.country, formatExperience(artist.experience)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {artist.keywords ? (
                <p className="mt-sm truncate text-body-sm text-ink-muted">{artist.keywords}</p>
              ) : null}
              {artist.skills.length > 0 && (
                <div className="mt-md flex flex-wrap gap-xs">
                  {artist.skills.map((skill) => (
                    <span key={skill} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                      {skillLabel(skill)}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-lg grid grid-cols-4 gap-sm border-t border-line pt-md">
                <div>
                  <p className="font-display text-title-sm text-accent">{artist.wins}</p>
                  <p className="font-mono text-[0.55rem] uppercase text-ink-muted">Wins</p>
                </div>
                <div>
                  <p className="font-display text-title-sm">{artist.matches}</p>
                  <p className="font-mono text-[0.55rem] uppercase text-ink-muted">Battles</p>
                </div>
                <div>
                  <p className="font-display text-title-sm">{artist.registrations}</p>
                  <p className="font-mono text-[0.55rem] uppercase text-ink-muted">Events</p>
                </div>
                <div>
                  <p className="font-display text-title-sm">{artist.achievements}</p>
                  <p className="font-mono text-[0.55rem] uppercase text-ink-muted">Achiev.</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
