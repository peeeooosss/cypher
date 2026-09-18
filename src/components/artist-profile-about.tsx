"use client";

import { skillLabel } from "@/lib/skills";

interface ArtistProfileAboutProps {
  bio: string | null;
  keywords: string | null;
  socialHandle: string | null;
  skills: string[];
  socialLinks: Record<string, string> | null;
  hourlyRate: number | null;
  responseTime: string | null;
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  twitter: "X / Twitter",
};

export function ArtistProfileAbout({
  bio,
  keywords,
  socialHandle,
  skills,
  socialLinks,
  hourlyRate,
  responseTime,
}: ArtistProfileAboutProps) {
  return (
    <div className="grid gap-lg lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-section">
        {bio ? (
          <section>
            <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">About</p>
            <p className="mt-md whitespace-pre-line text-body-sm leading-relaxed text-ink">{bio}</p>
          </section>
        ) : null}

        {keywords ? (
          <section>
            <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">Specialties</p>
            <div className="mt-md flex flex-wrap gap-sm">
              {keywords
                .split(/[,\n]+/)
                .map((k) => k.trim())
                .filter(Boolean)
                .map((k) => (
                  <span key={k} className="border border-line bg-paper-soft px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
                    {k}
                  </span>
                ))}
            </div>
          </section>
        ) : null}

        {skills.length > 0 && (
          <section>
            <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">Skills</p>
            <div className="mt-md flex flex-wrap gap-sm">
              {skills.map((skill) => (
                <span key={skill} className="border border-accent/30 bg-accent/5 px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
                  {skillLabel(skill)}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-md self-start lg:sticky lg:top-24">
        {(hourlyRate != null && hourlyRate > 0) || responseTime ? (
          <div className="border border-line bg-paper-soft p-md">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Availability</p>
            <div className="mt-md space-y-sm">
              {hourlyRate != null && hourlyRate > 0 ? (
                <p className="text-body-sm">
                  <span className="font-display text-title-md text-accent">₹{hourlyRate}</span>
                  <span className="text-ink-muted"> / session</span>
                </p>
              ) : null}
              {responseTime ? (
                <p className="text-body-sm text-ink-muted">Response time: {responseTime}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {(socialHandle || socialLinks) && (
          <div className="border border-line bg-paper-soft p-md">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Connect</p>
            <div className="mt-md space-y-sm">
              {socialHandle ? (
                <p className="font-mono text-[0.7rem] text-accent">@{socialHandle.replace(/^@/, "")}</p>
              ) : null}
              {socialLinks &&
                Object.entries(socialLinks)
                  .filter(([, url]) => url)
                  .map(([key, url]) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-mono text-[0.7rem] text-ink underline-offset-4 hover:text-accent hover:underline"
                    >
                      {SOCIAL_LABELS[key] ?? key}
                    </a>
                  ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}