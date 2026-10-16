"use client";

import { useState } from "react";
import { responseError } from "@/lib/client-error";
import { useToast } from "@/components/ui/toast";

export type AuditionRecord = {
  id: string;
  eventId: string;
  mode: "OFFLINE" | "ONLINE";
  city: string | null;
  categoryId: string | null;
  details: string | null;
  announcementText: string | null;
  whatsappNumber: string | null;
  displayOrder: number;
  isPublished: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  category: {
    id: string;
    name: string;
    entryFee: number | null;
    entryCurrency: string;
    format: string | null;
  } | null;
};

type CategoryOption = {
  id: string;
  name: string;
  entryFee: number | null;
  entryCurrency: string;
};

const emptyForm = {
  mode: "OFFLINE" as "OFFLINE" | "ONLINE",
  city: "",
  categoryId: "",
  details: "",
  announcementText: "",
  whatsappNumber: "",
};

export function EventAuditionsManager({
  eventId,
  enabled,
  initialAuditions,
  categories,
  onChanged,
  onToggleEnabled,
}: {
  eventId: string;
  enabled: boolean;
  initialAuditions: AuditionRecord[];
  categories: CategoryOption[];
  onChanged: () => void;
  onToggleEnabled: () => void;
}) {
  const { toast } = useToast();
  const [auditions, setAuditions] = useState<AuditionRecord[]>(initialAuditions);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await onToggleEnabled();
      toast(enabled ? "Auditions disabled" : "Auditions enabled", "success");
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update auditions", "error");
    } finally {
      setToggling(false);
    }
  }

  async function handleAdd() {
    setError("");
    if (form.mode === "OFFLINE" && !form.city.trim()) {
      setError("Offline auditions need a city.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/auditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: form.mode,
          city: form.city.trim() || null,
          categoryId: form.categoryId || null,
          details: form.details.trim() || null,
          announcementText: form.announcementText.trim() || null,
          whatsappNumber: form.whatsappNumber.trim() || null,
          displayOrder: auditions.length,
        }),
      });
      if (!res.ok) throw new Error(await responseError(res, "Failed to add audition"));
      const created = (await res.json()) as AuditionRecord;
      setAuditions((prev) => [...prev, created]);
      setForm(emptyForm);
      setAdding(false);
      toast("Audition added", "success");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add audition");
    } finally {
      setSaving(false);
    }
  }

  async function patchAudition(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/events/${eventId}/auditions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await responseError(res, "Failed to update audition"));
      const saved = (await res.json()) as AuditionRecord;
      setAuditions((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update audition", "error");
    }
  }

  async function deleteAudition(id: string) {
    if (!window.confirm("Remove this audition entry?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/auditions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await responseError(res, "Failed to remove audition"));
      setAuditions((prev) => prev.filter((a) => a.id !== id));
      toast("Audition removed", "success");
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove audition", "error");
    }
  }

  return (
    <div className="border border-line p-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
            {auditions.length} audition{auditions.length === 1 ? "" : "s"} ·{" "}
            {enabled ? "live on event page" : "hidden from event page"}
          </p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            disabled={toggling}
            onClick={() => void handleToggle()}
            className="border border-line px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.1em] hover:border-accent disabled:opacity-50"
          >
            {toggling ? "Saving..." : enabled ? "Disable auditions" : "Enable auditions"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding((v) => !v);
              setError("");
            }}
            className="border border-accent bg-accent px-md py-sm font-bold uppercase text-paper"
          >
            + Add audition
          </button>
        </div>
      </div>

      {adding ? (
        <div className="mt-lg space-y-sm border border-accent bg-paper-soft p-md">
          <div className="grid gap-sm sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">Mode</span>
              <select
                value={form.mode}
                onChange={(e) => set("mode", e.target.value as "OFFLINE" | "ONLINE")}
                className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              >
                <option value="OFFLINE">Offline (city audition)</option>
                <option value="ONLINE">Online audition</option>
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
                City {form.mode === "OFFLINE" ? "(required)" : "(optional)"}
              </span>
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="e.g. Guwahati"
                maxLength={120}
                className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
              Linked category (online fee)
            </span>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            >
              <option value="">No linked category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.entryFee ? ` — ₹${c.entryFee}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
              Details (venue, date, instructions)
            </span>
            <textarea
              value={form.details}
              onChange={(e) => set("details", e.target.value)}
              placeholder="Venue, date and instructions — leave empty if not announced yet."
              rows={3}
              maxLength={5000}
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
              Announcement note (shown when details aren&apos;t out yet)
            </span>
            <textarea
              value={form.announcementText}
              onChange={(e) => set("announcementText", e.target.value)}
              placeholder="e.g. Venue & date drop soon — follow us on WhatsApp / Instagram."
              rows={2}
              maxLength={2000}
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
              WhatsApp number (optional override)
            </span>
            <input
              value={form.whatsappNumber}
              onChange={(e) => set("whatsappNumber", e.target.value)}
              placeholder="Defaults to your organizer contact"
              maxLength={20}
              className="mt-xs w-full max-w-xs border border-line bg-paper px-md py-sm text-body-sm"
            />
          </label>
          {error ? <p className="text-body-sm text-accent">{error}</p> : null}
          <div className="flex justify-end gap-sm">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError("");
                setForm(emptyForm);
              }}
              className="border border-line px-md py-sm text-button-md font-bold uppercase hover:border-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleAdd()}
              className="border border-accent bg-accent px-md py-sm text-button-md font-bold uppercase text-paper disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save audition"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-lg grid gap-md sm:grid-cols-2">
        {auditions.length === 0 && !adding ? (
          <p className="border border-line p-lg text-body-sm text-ink-muted sm:col-span-2">
            No audition entries yet.
          </p>
        ) : null}
        {auditions.map((audition) => (
          <div key={audition.id} className="border border-line bg-paper-soft p-md">
            <div className="flex flex-wrap items-center gap-xs">
              <span className="border border-accent px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-accent">
                {audition.mode === "OFFLINE" ? "Offline" : "Online"}
              </span>
              {audition.city ? (
                <span className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink">
                  {audition.city}
                </span>
              ) : null}
              {!audition.isPublished ? (
                <span className="border border-line px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink-muted">
                  Hidden
                </span>
              ) : null}
            </div>
            {audition.category ? (
              <p className="mt-xs text-body-sm text-ink-muted">
                Linked: {audition.category.name}
                {audition.category.entryFee ? ` — ₹${audition.category.entryFee}` : ""}
              </p>
            ) : null}
            {audition.details ? (
              <p className="mt-xs whitespace-pre-wrap text-body-sm">{audition.details}</p>
            ) : (
              <p className="mt-xs text-body-sm italic text-ink-muted">
                {audition.announcementText || "Details not announced yet."}
              </p>
            )}
            <div className="mt-xs flex flex-wrap gap-xs">
              <button
                type="button"
                onClick={() => void patchAudition(audition.id, { isPublished: !audition.isPublished })}
                className="border border-line px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] hover:border-accent"
              >
                {audition.isPublished ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={() => void deleteAudition(audition.id)}
                className="border border-line px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-accent hover:border-accent"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
