"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ArtistProfile = {
  name: string | null;
  style: string | null;
  crew: string | null;
  city: string | null;
  country: string | null;
  experience: string | null;
  socialHandle: string | null;
  referral: string | null;
};

const PROFILE_FIELDS: Array<{
  name: keyof Omit<ArtistProfile, "name">;
  label: string;
  placeholder: string;
}> = [
  { name: "style", label: "Style", placeholder: "e.g. Popping, Breaking" },
  { name: "crew", label: "Crew", placeholder: "e.g. Soul Mechanics" },
  { name: "city", label: "City", placeholder: "e.g. Guwahati" },
  { name: "country", label: "Country", placeholder: "e.g. India" },
  { name: "experience", label: "Experience", placeholder: "e.g. PRO, ADVANCED, INTERMEDIATE" },
  { name: "socialHandle", label: "Social handle", placeholder: "@yourname" },
  { name: "referral", label: "How did you hear about us?", placeholder: "e.g. Instagram, Friend" },
];

export function ArtistProfileForm({ profile }: { profile: ArtistProfile }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};

    const name = String(form.get("name") ?? "").trim();
    if (name) body.name = name;

    for (const field of PROFILE_FIELDS) {
      body[field.name] = String(form.get(field.name) ?? "").trim();
    }

    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="border border-line bg-paper-soft p-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="font-display text-title-md uppercase">My profile</p>
        {status === "saved" && (
          <span className="font-mono text-[0.7rem] uppercase text-accent">Saved</span>
        )}
        {status === "error" && (
          <span className="font-mono text-[0.7rem] uppercase text-red-600">Failed to save</span>
        )}
      </div>
      <p className="mt-xs text-body-sm text-ink-muted">
        These details are sent to organizers with every registration.
      </p>

      <div className="mt-lg grid gap-md sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Name</span>
          <input
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            name="name"
            defaultValue={profile.name ?? ""}
            placeholder="Stage name"
          />
        </label>
        {PROFILE_FIELDS.map((field) => (
          <label key={field.name} className="block">
            <span className="font-mono text-[0.7rem] uppercase text-ink-muted">
              {field.label}
            </span>
            <input
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              name={field.name}
              defaultValue={profile[field.name] ?? ""}
              placeholder={field.placeholder}
            />
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-lg border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
      >
        {status === "saving" ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
