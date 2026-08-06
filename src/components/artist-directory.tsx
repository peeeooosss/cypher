"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SKILLS, SKILL_LABELS, skillLabel } from "@/lib/skills";

export type DirectoryArtist = {
  id: string;
  name: string | null;
  style: string | null;
  crew: string | null;
  city: string | null;
  country: string | null;
  experience: string | null;
  socialHandle: string | null;
  skills: string[];
  wins: number;
  matches: number;
  registrations: number;
  achievements: number;
};

export function ArtistDirectory({ artists }: { artists: DirectoryArtist[] }) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return artists.filter((artist) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        [artist.name, artist.style, artist.crew, artist.city, artist.socialHandle]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      const matchesSkills =
        selectedSkills.length === 0 ||
        artist.skills.some((skill) => selectedSkills.includes(skill));
      return matchesQuery && matchesSkills;
    });
  }, [artists, query, selectedSkills]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  return (
    <div className="mt-section">
      <input
        className="w-full max-w-md border border-line bg-paper px-md py-sm text-body-sm"
        placeholder="Search name, style, crew, city..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
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
              href={`/organizer/artists/${artist.id}`}
              className="group border border-line bg-paper-soft p-lg transition-colors hover:border-accent"
            >
              <h2 className="font-display text-title-md uppercase transition-colors group-hover:text-accent">
                {artist.name ?? "Unnamed artist"}
              </h2>
              <p className="mt-xs text-body-sm text-ink-muted">
                {[artist.style, artist.crew, artist.city, artist.experience]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {artist.socialHandle ? (
                <p className="mt-xs font-mono text-[0.7rem] text-accent">{artist.socialHandle}</p>
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
