"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatFee } from "@/lib/format";

export type Achievement = {
  id: string;
  title: string;
  competition: string | null;
  placement: string | null;
  year: number | null;
  prize: number | null;
  currency: string;
  note: string | null;
};

export function ArtistAchievements({ achievements }: { achievements: Achievement[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const prize = Number(form.get("prize"));
    const year = Number(form.get("year"));

    const res = await fetch("/api/artists/me/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        competition: form.get("competition") || null,
        placement: form.get("placement") || null,
        year: year > 0 ? year : null,
        prize: prize > 0 ? prize : null,
        currency: form.get("currency") || "INR",
        note: form.get("note") || null,
      }),
    });

    setIsSubmitting(false);
    if (res.ok) {
      event.currentTarget.reset();
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to add achievement.");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/artists/me/achievements/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="grid gap-xl lg:grid-cols-[0.55fr_1fr]">
      <form className="border border-line bg-paper-soft p-lg" onSubmit={handleSubmit}>
        <p className="font-display text-title-md uppercase">Add achievement</p>
        <p className="mt-xs text-body-sm text-ink-muted">
          External wins, titles and prizes — shown on your profile for organizers.
        </p>
        <div className="mt-lg grid gap-md sm:grid-cols-2">
          <input required className="border border-line bg-paper px-md py-sm text-body-sm sm:col-span-2" name="title" placeholder="e.g. Champion" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm sm:col-span-2" name="competition" placeholder="Competition / event name" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="placement" placeholder="Placement (1st, Winner)" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="year" placeholder="Year (2025)" type="number" min="1900" max="2100" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="prize" placeholder="Prize amount" type="number" min="0" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="currency" defaultValue="INR" placeholder="INR" />
          <textarea className="border border-line bg-paper px-md py-sm text-body-sm sm:col-span-2" name="note" rows={3} placeholder="Note (optional)" />
        </div>
        {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
        <button
          className="mt-lg border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving..." : "Add achievement"}
        </button>
      </form>

      <div className="space-y-sm">
        {achievements.length === 0 ? (
          <p className="border border-line p-lg text-body-sm text-ink-muted">
            No achievements yet. Add your wins and competition results.
          </p>
        ) : (
          achievements.map((achievement) => (
            <article key={achievement.id} className="border border-line bg-paper-soft p-lg">
              <div className="flex flex-wrap items-start justify-between gap-sm">
                <div>
                  <h3 className="font-display text-title-md uppercase">{achievement.title}</h3>
                  <p className="mt-xs text-body-sm text-ink-muted">
                    {achievement.competition ?? "Competition"}
                    {achievement.year ? ` · ${achievement.year}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {achievement.prize && achievement.prize > 0 ? (
                    <p className="font-mono text-[0.7rem] uppercase text-accent">
                      {formatFee(achievement.prize, achievement.currency)}
                    </p>
                  ) : null}
                  {achievement.placement ? (
                    <p className="mt-xs font-mono text-[0.7rem] uppercase text-ink-muted">
                      {achievement.placement}
                    </p>
                  ) : null}
                </div>
              </div>
              {achievement.note ? (
                <p className="mt-sm text-body-sm text-ink-muted">{achievement.note}</p>
              ) : null}
              <button
                type="button"
                className="mt-md border border-line px-sm py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent"
                onClick={() => void handleDelete(achievement.id)}
              >
                Remove
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
