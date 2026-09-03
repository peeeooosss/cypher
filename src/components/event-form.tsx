"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_TYPE_FEES, flatFeeForEventType, formatInr } from "@/lib/pricing";
import { PosterUpload } from "@/components/poster-upload";
import { BATTLE_FORMATS, CATEGORY_FORMAT_LABELS, COMPETITION_FORMATS, EVENT_TYPE_LABELS, EVENT_TYPE_LIST, defaultRosterSize, isCompetitionType, isWorkshopType } from "@/lib/event-types";
import { CategoryFormat, EventType } from "@/generated/prisma/enums";
import { INDIAN_STATES } from "@/lib/states";

export function EventForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterFileKey, setPosterFileKey] = useState<string | null>(null);
  const [eventType, setEventType] = useState<EventType | "">("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          slug: formData.get("slug"),
          description: formData.get("description") || undefined,
          eventType,
          posterUrl,
          posterFileKey,
          venue: formData.get("venue") || undefined,
          googleMapsUrl: formData.get("googleMapsUrl") || null,
          city: formData.get("city") || undefined,
          state: formData.get("state") || undefined,
          startsAt: formData.get("startsAt"),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Unable to create event.");
        setIsSubmitting(false);
        return;
      }

      const created = await response.json();
      router.push(`/organizer/${created.id}/bill`);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="border border-line bg-paper-soft p-lg" onSubmit={handleSubmit}>
      <p className="font-display text-title-md uppercase">Create event</p>
      <div className="mt-lg grid gap-md md:grid-cols-2">
        <input required className="border border-line bg-paper px-md py-sm" name="title" placeholder="Event title" />
        <input required className="border border-line bg-paper px-md py-sm" name="slug" placeholder="event-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Event type</span>
          <select
            className="mt-xs w-full border border-line bg-paper px-md py-sm"
            name="eventType"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType | "")}
          >
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
        <input className="border border-line bg-paper px-md py-sm" name="venue" placeholder="Venue" />
        <input className="border border-line bg-paper px-md py-sm md:col-span-2" name="googleMapsUrl" type="url" placeholder="https://maps.app.goo.gl/... (Google Maps link for directions)" />
        <input className="border border-line bg-paper px-md py-sm" name="city" placeholder="City" />
        <input required className="border border-line bg-paper px-md py-sm md:col-span-2" name="startsAt" type="datetime-local" />
        <textarea className="border border-line bg-paper px-md py-sm md:col-span-2" name="description" placeholder="Event description — shown on the public event page" rows={4} />
      </div>
      <div className="mt-lg border border-accent bg-paper p-md">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Flat fee to activate</p>
            <p className="mt-xs font-display text-title-md text-accent">{eventType ? formatInr(flatFeeForEventType(eventType)) : "Select a type"}</p>
          </div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
            Workshop {formatInr(EVENT_TYPE_FEES.WORKSHOP)} · Underground battle {formatInr(EVENT_TYPE_FEES.UNDERGROUND_BATTLE)} · Competition {formatInr(EVENT_TYPE_FEES.DANCE_COMPETITION)}
          </p>
        </div>
        <p className="mt-md border-t border-line pt-md text-body-sm text-ink-muted">
          Paid once at creation. Unlimited categories and unlimited phases — one flat fee. Later, just 2.99% per confirmed entry — taken at event completion.
        </p>
      </div>
      <div className="mt-lg">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Poster</p>
        <div className="mt-xs max-w-64">
        <PosterUpload
          initial={null}
          onChange={(url, fileKey) => {
            setPosterUrl(url);
            setPosterFileKey(fileKey);
          }}
        />
        </div>
      </div>
      {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
      <button className="mt-lg border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:opacity-60" disabled={isSubmitting || !eventType} type="submit">
        {isSubmitting ? "Creating..." : "Create event & pay flat fee"}
      </button>
    </form>
  );
}

export function CategoryForm({ eventId, eventType }: { eventId: string; eventType?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [format, setFormat] = useState<CategoryFormat>(
    isCompetitionType(eventType) || isWorkshopType(eventType) ? CategoryFormat.SOLO : CategoryFormat.BATTLE_1V1,
  );

  const roster = defaultRosterSize(format);
  const fixedSize = roster.min === roster.max;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/events/${eventId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          format,
          maxCompetitors: formData.get("maxCompetitors") ? Number(formData.get("maxCompetitors")) : null,
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
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
  }

  return (
    <form className="mt-md flex flex-wrap items-end gap-sm" onSubmit={handleSubmit}>
      <label className="block">
        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Name</span>
        <input required className="mt-xs min-w-48 border border-line bg-paper px-sm py-xs" name="name" placeholder="1v1 Popping" />
      </label>
      <label className="block">
        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Format</span>
        <select className="mt-xs border border-line bg-paper px-sm py-xs" value={format} onChange={(e) => setFormat(e.target.value as CategoryFormat)} name="format">
          {(isCompetitionType(eventType) ? COMPETITION_FORMATS : isWorkshopType(eventType) ? [CategoryFormat.SOLO] : BATTLE_FORMATS).map((f) => (
            <option key={f} value={f}>{CATEGORY_FORMAT_LABELS[f]}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Maximum participants</span>
        <input className="mt-xs w-36 border border-line bg-paper px-sm py-xs" min="1" name="maxCompetitors" placeholder="e.g. 16" type="number" />
        <span className="mt-xs block max-w-44 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-ink-muted">
          Max teams allowed. Leave blank for unlimited.
        </span>
      </label>
      <span className="mb-xs border border-line px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
        {fixedSize ? `${roster.min} per entry` : `${roster.min}–${roster.max} per entry`}
      </span>
      <label className="block">
        <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Entry fee (₹)</span>
        <input className="mt-xs w-32 border border-line bg-paper px-sm py-xs" min="0" name="entryFee" placeholder="e.g. 500" type="number" />
      </label>
      <button className="border border-line px-md py-xs text-body-sm font-bold uppercase hover:border-accent" type="submit">Add category</button>
      {error ? <p className="basis-full text-body-sm text-accent">{error}</p> : null}
    </form>
  );
}
