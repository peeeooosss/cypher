"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { SKILLS, SKILL_LABELS, skillLabel } from "@/lib/skills";

type GigApplication = {
  id: string;
  status: string;
  message: string | null;
  createdAt: Date;
  artist: {
    id: string;
    name: string | null;
    style: string | null;
    crew: string | null;
    city: string | null;
    experience: string | null;
    socialHandle: string | null;
    skills: string[];
  };
};

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
  applications: GigApplication[];
};

export function GigManager({ gigs }: { gigs: Gig[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const budget = Number(form.get("budget"));
    const startsAt = form.get("startsAt") as string;

    const res = await fetch("/api/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        skillsRequired: selectedSkills,
        location: form.get("location") || undefined,
        budget: budget > 0 ? budget : undefined,
        currency: form.get("currency") || "INR",
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      }),
    });

    setIsSubmitting(false);
    if (res.ok) {
      event.currentTarget.reset();
      setSelectedSkills([]);
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to create gig.");
    }
  }

  async function updateGigStatus(gigId: string, status: string) {
    const res = await fetch(`/api/gigs/${gigId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  async function updateApplication(gigId: string, applicationId: string, status: "ACCEPTED" | "REJECTED") {
    const res = await fetch(`/api/gigs/${gigId}/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="mt-section space-y-xl">
      <form className="border border-line bg-paper-soft p-lg" onSubmit={handleCreate}>
        <p className="font-display text-title-md uppercase">Post freelance work</p>
        <p className="mt-xs text-body-sm text-ink-muted">
          Create a gig and artists with matching skills can apply.
        </p>
        <div className="mt-lg grid gap-md md:grid-cols-2">
          <input required className="border border-line bg-paper px-md py-sm text-body-sm md:col-span-2" name="title" placeholder="Gig title — e.g. DJ for Saturday night" />
          <textarea required className="border border-line bg-paper px-md py-sm text-body-sm md:col-span-2" name="description" rows={4} placeholder="What does the gig involve? Details, date range, expectations." />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="location" placeholder="Location / city" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="startsAt" type="datetime-local" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="budget" placeholder="Budget / fee" type="number" min="0" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="currency" defaultValue="INR" placeholder="INR" />
        </div>
        <div className="mt-lg">
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Skills required</p>
          <div className="mt-xs flex flex-wrap gap-xs">
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
          {selectedSkills.length === 0 ? (
            <p className="mt-sm text-body-sm text-accent">Select at least one skill.</p>
          ) : null}
        </div>
        {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
        <button
          className="mt-lg border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
          disabled={isSubmitting || selectedSkills.length === 0}
          type="submit"
        >
          {isSubmitting ? "Posting..." : "Post gig"}
        </button>
      </form>

      {gigs.length === 0 ? (
        <p className="border border-line p-lg text-body-sm text-ink-muted">No gigs posted yet.</p>
      ) : (
        gigs.map((gig) => (
          <article key={gig.id} className="border border-line bg-paper-soft p-lg">
            <div className="flex flex-wrap items-start justify-between gap-sm">
              <div>
                <h3 className="font-display text-title-md uppercase">{gig.title}</h3>
                <p className="mt-xs text-body-sm text-ink-muted">
                  {gig.location ?? "Location TBA"}
                  {gig.startsAt ? ` / ${formatDate(gig.startsAt)}` : ""} ·{" "}
                  <span className="text-accent">
                    {gig.budget && gig.budget > 0
                      ? gig.currency === "INR" ? `₹${gig.budget}` : `${gig.currency} ${gig.budget}`
                      : "Unpaid"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-sm">
                <span className="font-mono text-[0.65rem] uppercase text-ink-muted">{gig.status}</span>
                {gig.status === "OPEN" ? (
                  <button
                    type="button"
                    className="border border-line px-sm py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent"
                    onClick={() => void updateGigStatus(gig.id, "CLOSED")}
                  >
                    Close
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-sm text-body-sm text-ink whitespace-pre-wrap">{gig.description}</p>
            <div className="mt-sm flex flex-wrap gap-xs">
              {gig.skillsRequired.map((skill) => (
                <span key={skill} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                  {skillLabel(skill)}
                </span>
              ))}
            </div>

            <div className="mt-lg border-t border-line pt-md">
              <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                Applicants ({gig.applications.length})
              </p>
              {gig.applications.length === 0 ? (
                <p className="mt-sm text-body-sm text-ink-muted">No applications yet.</p>
              ) : (
                <div className="mt-sm space-y-sm">
                  {gig.applications.map((application) => (
                    <div key={application.id} className="border border-line bg-paper p-md">
                      <div className="flex flex-wrap items-start justify-between gap-sm">
                        <div>
                          <Link
                            href={`/organizer/artists/${application.artist.id}`}
                            className="font-display text-title-sm uppercase hover:text-accent"
                          >
                            {application.artist.name ?? "Unnamed artist"}
                          </Link>
                          <p className="mt-xs text-body-sm text-ink-muted">
                            {[application.artist.style, application.artist.crew, application.artist.city, application.artist.experience]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <div className="mt-sm flex flex-wrap gap-xs">
                            {application.artist.skills.map((skill) => (
                              <span key={skill} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                                {skillLabel(skill)}
                              </span>
                            ))}
                          </div>
                          {application.message ? (
                            <p className="mt-sm text-body-sm text-ink-muted">“{application.message}”</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-sm">
                          <span className={`font-mono text-[0.65rem] uppercase ${application.status === "ACCEPTED" ? "text-accent" : application.status === "REJECTED" ? "text-red-500" : "text-ink-muted"}`}>
                            {application.status}
                          </span>
                          {application.status === "PENDING" ? (
                            <>
                              <button
                                type="button"
                                className="border border-accent bg-accent px-sm py-xs font-mono text-[0.65rem] uppercase text-paper"
                                onClick={() => void updateApplication(gig.id, application.id, "ACCEPTED")}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="border border-line px-sm py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent"
                                onClick={() => void updateApplication(gig.id, application.id, "REJECTED")}
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
