"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatFee } from "@/lib/format";

type CategoryOption = {
  id: string;
  name: string;
  entryFee: number | null;
  entryCurrency: string;
  maxCompetitors: number | null;
  registeredCount: number;
};

export function RegistrationForm({
  eventId,
  categories,
  registeredCategoryIds,
  paidCategoryIds,
}: {
  eventId: string;
  categories: CategoryOption[];
  registeredCategoryIds: Set<string>;
  paidCategoryIds: Set<string>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const total = [...selected].reduce((sum, id) => {
    const category = categories.find((c) => c.id === id);
    return sum + (category?.entryFee ?? 0);
  }, 0);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function isDisabled(category: CategoryOption) {
    if (registeredCategoryIds.has(category.id)) return true;
    if (category.maxCompetitors != null && category.registeredCount >= category.maxCompetitors) return true;
    return false;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: [...selected] }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to register.");
      setSubmitting(false);
      return;
    }

    const created = (await response.json()) as { id: string }[];
    const ids = created.map((r) => r.id).join(",");
    router.push(`/cart?event=${eventId}&ids=${ids}`);
  }

  return (
    <form className="mt-section" onSubmit={handleSubmit}>
      <div className="border border-line">
        <div className="border-b border-line bg-paper-soft px-lg py-md">
          <p className="font-display text-title-md uppercase">Choose your categories</p>
        </div>
        <ul className="divide-y divide-line">
          {categories.map((category) => {
            const disabled = isDisabled(category);
            const isRegistered = registeredCategoryIds.has(category.id);
            const isPaid = paidCategoryIds.has(category.id);
            const isFull =
              category.maxCompetitors != null && category.registeredCount >= category.maxCompetitors;
            return (
              <li key={category.id} className="flex items-center gap-md px-lg py-md">
                <input
                  type="checkbox"
                  checked={selected.has(category.id)}
                  disabled={disabled}
                  onChange={() => toggle(category.id)}
                  className="h-4 w-4 shrink-0 border border-line bg-paper accent-current"
                />
                <div className="flex-1">
                  <p className="font-display text-title-md uppercase">{category.name}</p>
                  <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
                    {category.registeredCount} registered
                    {category.maxCompetitors != null ? ` / max ${category.maxCompetitors}` : ""}
                  </p>
                </div>
                <span className="font-mono text-body-sm uppercase text-accent">
                  {formatFee(category.entryFee, category.entryCurrency)}
                </span>
                <span className="w-28 text-right font-mono text-[0.65rem] uppercase text-ink-muted">
                  {isRegistered ? (isPaid ? "Confirmed" : "Registered") : isFull ? "Full" : ""}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-sm border-t border-line bg-paper-soft px-lg py-md">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
            Total entry
          </span>
          <span className="font-display text-display-lg uppercase text-accent">
            {formatFee(total, "INR")}
          </span>
        </div>
      </div>

      <div className="mt-section border border-line">
        <div className="flex flex-wrap items-center justify-between gap-sm border-b border-line bg-paper-soft px-lg py-md">
          <p className="font-display text-title-md uppercase">Your details</p>
          <p className="text-body-sm text-ink-muted">
            Used from your artist profile
          </p>
        </div>
        <p className="px-lg py-md text-body-sm text-ink-muted">
          Style, crew, city, country, experience and social handle come from your battle
          profile — update them anytime from your artist dashboard.
        </p>
      </div>

      {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}

      <button
        className="mt-xl w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={submitting || selected.size === 0}
      >
        {submitting
          ? "Registering..."
          : selected.size === 0
            ? "Select at least one category"
            : `Register ${selected.size} categor${selected.size > 1 ? "ies" : "y"} — ${formatFee(total, "INR")}`}
      </button>
    </form>
  );
}
