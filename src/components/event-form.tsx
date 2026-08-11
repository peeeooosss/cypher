"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { flatFeeForCategoryCount, formatInr } from "@/lib/pricing";
import { PosterUpload } from "@/components/poster-upload";
import { BATTLE_FORMATS, CATEGORY_FORMAT_LABELS, COMPETITION_FORMATS, EVENT_TYPE_LABELS, EVENT_TYPE_LIST, isCompetitionType, isWorkshopType } from "@/lib/event-types";
import { CategoryFormat } from "@/generated/prisma/enums";
import { INDIAN_STATES } from "@/lib/states";

export function EventForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [categoryCount, setCategoryCount] = useState(2);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const eventType = formData.get("eventType") as string | null;
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        slug: formData.get("slug"),
        description: formData.get("description") || undefined,
        eventType: eventType || undefined,
        posterUrl,
        venue: formData.get("venue") || undefined,
        city: formData.get("city") || undefined,
        state: formData.get("state") || undefined,
        startsAt: formData.get("startsAt"),
        categoryCount,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to create event.");
      setIsSubmitting(false);
      return;
    }

    const created = await response.json();
    setIsSubmitting(false);
    router.push(`/organizer/${created.id}/bill`);
  }

  return (
    <form className="border border-line bg-paper-soft p-lg" onSubmit={handleSubmit}>
      <p className="font-display text-title-md uppercase">Create event</p>
      <div className="mt-lg grid gap-md md:grid-cols-2">
        <input required className="border border-line bg-paper px-md py-sm" name="title" placeholder="Event title" />
        <input required className="border border-line bg-paper px-md py-sm" name="slug" placeholder="event-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Event type</span>
          <select className="mt-xs w-full border border-line bg-paper px-md py-sm" name="eventType" defaultValue="">
            <option value="">Select a type</option>
            {EVENT_TYPE_LIST.map((t) => (
              <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">State</span>
          <select className="mt-xs w-full border border-line bg-paper px-md py-sm" name="state" defaultValue="">
            <option value="">Select a state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Categories</span>
          <input
            className="mt-xs w-full border border-line bg-paper px-md py-sm"
            type="number"
            min={1}
            max={20}
            value={categoryCount}
            onChange={(e) => setCategoryCount(Number(e.target.value))}
          />
        </label>
        <input className="border border-line bg-paper px-md py-sm" name="venue" placeholder="Venue" />
        <input className="border border-line bg-paper px-md py-sm" name="city" placeholder="City" />
        <input required className="border border-line bg-paper px-md py-sm md:col-span-2" name="startsAt" type="datetime-local" />
        <textarea className="border border-line bg-paper px-md py-sm md:col-span-2" name="description" placeholder="Event description — shown on the public event page" rows={4} />
      </div>
      <div className="mt-lg border border-accent bg-paper p-md">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Flat fee to activate</p>
            <p className="mt-xs font-display text-title-md text-accent">{formatInr(flatFeeForCategoryCount(categoryCount))}</p>
          </div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
            1–2 categories ₹49 · 3–4 ₹99 · 5+ ₹199
          </p>
        </div>
        <p className="mt-md border-t border-line pt-md text-body-sm text-ink-muted">
          Paid once at creation. Later, just 1.5% per confirmed entry — taken at event completion.
        </p>
      </div>
      <div className="mt-lg">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Poster</p>
        <div className="mt-xs max-w-64">
          <PosterUpload initial={null} onChange={setPosterUrl} />
        </div>
      </div>
      {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
      <button className="mt-lg border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating..." : "Create event & pay flat fee"}
      </button>
    </form>
  );
}

export function CategoryForm({ eventId, eventType }: { eventId: string; eventType?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/events/${eventId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        format: formData.get("format"),
        maxCompetitors: formData.get("maxCompetitors") ? Number(formData.get("maxCompetitors")) : null,
        minMembers: formData.get("minMembers") ? Number(formData.get("minMembers")) : undefined,
        maxMembers: formData.get("maxMembers") ? Number(formData.get("maxMembers")) : undefined,
        entryFee: formData.get("entryFee") ? Number(formData.get("entryFee")) : null,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to create category.");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="mt-md flex flex-wrap gap-sm" onSubmit={handleSubmit}>
      <input required className="min-w-48 border border-line bg-paper px-sm py-xs" name="name" placeholder="1v1 Popping" />
      <select className="border border-line bg-paper px-sm py-xs" defaultValue={isCompetitionType(eventType) || isWorkshopType(eventType) ? CategoryFormat.SOLO : CategoryFormat.BATTLE_1V1} name="format">
        {(isCompetitionType(eventType) ? COMPETITION_FORMATS : isWorkshopType(eventType) ? [CategoryFormat.SOLO] : BATTLE_FORMATS).map((format) => (
          <option key={format} value={format}>{CATEGORY_FORMAT_LABELS[format]}</option>
        ))}
      </select>
      <input className="w-32 border border-line bg-paper px-sm py-xs" min="2" name="maxCompetitors" placeholder="Max" type="number" />
      <input className="w-28 border border-line bg-paper px-sm py-xs" min="1" name="minMembers" placeholder="Min members" type="number" />
      <input className="w-28 border border-line bg-paper px-sm py-xs" min="1" name="maxMembers" placeholder="Max members" type="number" />
      <input className="w-32 border border-line bg-paper px-sm py-xs" min="0" name="entryFee" placeholder="Entry fee (₹)" type="number" />
      <button className="border border-line px-md py-xs text-body-sm font-bold uppercase hover:border-accent" type="submit">Add category</button>
      {error ? <p className="basis-full text-body-sm text-accent">{error}</p> : null}
    </form>
  );
}
