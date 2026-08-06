"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import { SKILLS, SKILL_LABELS } from "@/lib/skills";

type Gig = {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  location: string | null;
  budget: number | null;
  currency: string;
  startsAt: Date | null;
  status: string;
  organizer: { name: string | null };
};

type Application = {
  id: string;
  status: string;
  createdAt: Date;
  message: string | null;
  gig: {
    id: string;
    title: string;
    budget: number | null;
    currency: string;
    location: string | null;
    status: string;
  };
};

export function GigsMarketplace({
  gigs,
  applications,
}: {
  gigs: Gig[];
  applications: Application[];
}) {
  const router = useRouter();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"browse" | "applications">("browse");

  const appliedGigIds = useMemo(
    () => new Set(applications.map((a) => a.gig.id)),
    [applications],
  );

  const filtered = useMemo(() => {
    if (selectedSkills.length === 0) return gigs;
    return gigs.filter((gig) =>
      gig.skillsRequired.some((skill) => selectedSkills.includes(skill)),
    );
  }, [gigs, selectedSkills]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handleApply(gigId: string) {
    setNotice("");
    const res = await fetch(`/api/gigs/${gigId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() || null }),
    });
    if (res.ok) {
      setApplyingTo(null);
      setMessage("");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setNotice(body?.error ?? "Failed to apply.");
    }
  }

  return (
    <div className="mt-section">
      <div className="flex flex-wrap gap-sm border-b border-line pb-sm">
        <button
          type="button"
          onClick={() => setTab("browse")}
          className={`border px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors ${
            tab === "browse"
              ? "border-accent bg-accent/10 text-accent"
              : "border-line text-ink-muted hover:border-accent"
          }`}
        >
          Browse gigs
        </button>
        <button
          type="button"
          onClick={() => setTab("applications")}
          className={`border px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors ${
            tab === "applications"
              ? "border-accent bg-accent/10 text-accent"
              : "border-line text-ink-muted hover:border-accent"
          }`}
        >
          My applications ({applications.length})
        </button>
      </div>

      {notice ? <p className="mt-md text-body-sm text-accent">{notice}</p> : null}

      {tab === "browse" ? (
        <>
          <div className="mt-lg">
            <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
              Filter by skill
            </p>
            <div className="mt-sm flex flex-wrap gap-xs">
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
          </div>

          {filtered.length === 0 ? (
            <p className="mt-lg border border-line p-xl text-body-sm text-ink-muted">
              No gigs match your filters. Try adding more skills or clearing the filter.
            </p>
          ) : (
            <div className="mt-lg grid gap-md lg:grid-cols-2">
              {filtered.map((gig) => {
                const applied = appliedGigIds.has(gig.id);
                return (
                  <article key={gig.id} className="flex flex-col border border-line bg-paper-soft p-lg">
                    <div className="flex flex-wrap items-start justify-between gap-sm">
                      <h3 className="font-display text-title-md uppercase">{gig.title}</h3>
                      <span className="font-mono text-[0.65rem] uppercase text-accent">
                        {formatFee(gig.budget, gig.currency)}
                      </span>
                    </div>
                    <p className="mt-sm text-body-sm text-ink-muted">
                      {gig.location ?? "Location TBA"}
                      {gig.startsAt ? ` / ${formatDate(gig.startsAt)}` : ""}
                    </p>
                    <div className="mt-sm flex flex-wrap gap-xs">
                      {gig.skillsRequired.map((skill) => (
                        <span key={skill} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                          {SKILL_LABELS[skill as keyof typeof SKILL_LABELS] ?? skill}
                        </span>
                      ))}
                    </div>
                    <p className="mt-md text-body-sm text-ink whitespace-pre-wrap">{gig.description}</p>
                    <p className="mt-md font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                      Posted by {gig.organizer.name ?? "Anonymous"} · {gig.status}
                    </p>
                    <div className="mt-auto pt-md">
                      {applied ? (
                        <p className="border border-accent bg-accent/10 px-md py-sm text-center font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
                          Applied
                        </p>
                      ) : applyingTo === gig.id ? (
                        <div className="space-y-sm">
                          <textarea
                            className="w-full border border-line bg-paper px-md py-sm text-body-sm"
                            rows={3}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Short note to the organizer (optional)"
                          />
                          <div className="flex gap-sm">
                            <button
                              type="button"
                              className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
                              onClick={() => void handleApply(gig.id)}
                            >
                              Submit application
                            </button>
                            <button
                              type="button"
                              className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted"
                              onClick={() => {
                                setApplyingTo(null);
                                setMessage("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="block w-full border border-accent px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-paper"
                          onClick={() => setApplyingTo(gig.id)}
                        >
                          Apply to this gig
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="mt-lg space-y-md">
          {applications.length === 0 ? (
            <p className="border border-line p-lg text-body-sm text-ink-muted">
              You haven&apos;t applied to any gigs yet.
            </p>
          ) : (
            applications.map((app) => (
              <article key={app.id} className="border border-line bg-paper-soft p-lg">
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <h3 className="font-display text-title-md uppercase">{app.gig.title}</h3>
                  <span className={`font-mono text-[0.65rem] uppercase ${app.status === "ACCEPTED" ? "text-accent" : app.status === "REJECTED" ? "text-red-500" : "text-ink-muted"}`}>
                    {app.status}
                  </span>
                </div>
                <p className="mt-xs text-body-sm text-ink-muted">
                  {app.gig.location ?? "Location TBA"} · {formatFee(app.gig.budget, app.gig.currency)}
                </p>
                {app.message ? <p className="mt-sm text-body-sm text-ink-muted">Note: {app.message}</p> : null}
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function formatFee(budget: number | null, currency: string) {
  if (!budget || budget <= 0) return "Unpaid";
  return currency === "INR" ? `₹${budget}` : `${currency} ${budget}`;
}
