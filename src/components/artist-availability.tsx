"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";

type Availability = {
  id: string;
  dateFrom: string;
  dateTo: string;
  note: string | null;
};

export function ArtistAvailability({
  minJudging,
  minWorkshop,
}: {
  minJudging: number | null;
  minWorkshop: number | null;
}) {
  const router = useRouter();
  const [judging, setJudging] = useState(minJudging ?? 0);
  const [workshop, setWorkshop] = useState(minWorkshop ?? 0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [availability, setAvailability] = useState<Availability[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/me/availability")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAvailability(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function savePrices() {
    setSaving(true);
    setNotice("");
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minJudgingPricePerDay: judging > 0 ? judging : null,
        minWorkshopPricePerDay: workshop > 0 ? workshop : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setNotice("Prices saved.");
      router.refresh();
    } else {
      setNotice("Failed to save prices.");
    }
  }

  async function addAvailability(e: React.FormEvent) {
    e.preventDefault();
    if (!dateFrom || !dateTo) return;
    const res = await fetch("/api/me/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateFrom: new Date(dateFrom).toISOString(), dateTo: new Date(dateTo).toISOString(), note: note || undefined }),
    });
    if (res.ok) {
      setDateFrom("");
      setDateTo("");
      setNote("");
      router.refresh();
      const list = await fetch("/api/me/availability").then((r) => r.json());
      setAvailability(Array.isArray(list) ? list : []);
    }
  }

  async function removeAvailability(id: string) {
    await fetch(`/api/me/availability/${id}`, { method: "DELETE" });
    setAvailability((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <section className="mt-section border border-line bg-paper-soft p-lg">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">
        Gig availability & rates
      </p>
      <p className="mt-sm text-body-sm text-ink-muted">
        Set your minimum day rates and the dates you&apos;re available for gig work. Organizers
        see this when reviewing your application.
      </p>

      <div className="mt-lg grid gap-md md:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Min judging rate (₹ / day)</span>
          <input
            className="mt-xs w-full border border-line bg-paper px-md py-sm"
            type="number"
            min={0}
            value={judging}
            onChange={(e) => setJudging(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Min workshop rate (₹ / day)</span>
          <input
            className="mt-xs w-full border border-line bg-paper px-md py-sm"
            type="number"
            min={0}
            value={workshop}
            onChange={(e) => setWorkshop(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="mt-md flex items-center gap-md">
        <button
          type="button"
          className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
          disabled={saving}
          onClick={() => void savePrices()}
        >
          {saving ? "Saving..." : "Save rates"}
        </button>
        {notice ? <span className="text-body-sm text-ink-muted">{notice}</span> : null}
      </div>

      <div className="mt-lg border-t border-line pt-md">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Available dates</p>
        <div className="mt-sm space-y-sm">
          {availability.length === 0 ? (
            <p className="text-body-sm text-ink-muted">No availability added yet.</p>
          ) : (
            availability.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-sm border border-line bg-paper px-md py-sm">
                <span className="text-body-sm">
                  {formatDate(new Date(a.dateFrom))} → {formatDate(new Date(a.dateTo))}
                  {a.note ? <span className="ml-sm text-ink-muted">· {a.note}</span> : null}
                </span>
                <button
                  type="button"
                  className="border border-line px-sm py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent"
                  onClick={() => void removeAvailability(a.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <form className="mt-md flex flex-wrap items-end gap-sm" onSubmit={addAvailability}>
          <label className="block">
            <span className="font-mono text-[0.65rem] uppercase text-ink-muted">From</span>
            <input className="mt-xs border border-line bg-paper px-sm py-xs" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="font-mono text-[0.65rem] uppercase text-ink-muted">To</span>
            <input className="mt-xs border border-line bg-paper px-sm py-xs" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <input className="border border-line bg-paper px-sm py-xs" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className="border border-accent bg-accent px-md py-xs font-mono text-[0.65rem] font-bold uppercase text-paper">
            Add dates
          </button>
        </form>
      </div>
    </section>
  );
}
