"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function EventForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        slug: formData.get("slug"),
        venue: formData.get("venue") || undefined,
        city: formData.get("city") || undefined,
        startsAt: formData.get("startsAt"),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to create event.");
      setIsSubmitting(false);
      return;
    }

    event.currentTarget.reset();
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form className="border border-line bg-paper-soft p-lg" onSubmit={handleSubmit}>
      <p className="font-display text-title-md uppercase">Create event</p>
      <div className="mt-lg grid gap-md md:grid-cols-2">
        <input required className="border border-line bg-paper px-md py-sm" name="title" placeholder="Event title" />
        <input required className="border border-line bg-paper px-md py-sm" name="slug" placeholder="event-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        <input className="border border-line bg-paper px-md py-sm" name="venue" placeholder="Venue" />
        <input className="border border-line bg-paper px-md py-sm" name="city" placeholder="City" />
        <input required className="border border-line bg-paper px-md py-sm md:col-span-2" name="startsAt" type="datetime-local" />
      </div>
      {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
      <button className="mt-lg border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating..." : "Create event"}
      </button>
    </form>
  );
}

export function CategoryForm({ eventId }: { eventId: string }) {
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
        maxCompetitors: formData.get("maxCompetitors") ? Number(formData.get("maxCompetitors")) : null,
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
      <input className="w-32 border border-line bg-paper px-sm py-xs" min="2" name="maxCompetitors" placeholder="Max" type="number" />
      <button className="border border-line px-md py-xs text-body-sm font-bold uppercase hover:border-accent" type="submit">Add category</button>
      {error ? <p className="basis-full text-body-sm text-accent">{error}</p> : null}
    </form>
  );
}
