"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Criterion = {
  key: string;
  label: string;
  max: number;
  order: number;
};

export type ScoringConfigFormData = {
  id?: string;
  name?: string | null;
  description?: string | null;
  appliesTo?: string | null;
  appliesToValue?: string | null;
  totalMax?: number | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  criteria?: Criterion[] | null;
};

export function ScoringConfigForm({ config }: { config?: ScoringConfigFormData }) {
  const router = useRouter();
  const [name, setName] = useState(config?.name ?? "");
  const [description, setDescription] = useState(config?.description ?? "");
  const [appliesTo, setAppliesTo] = useState(config?.appliesTo ?? "EVENT_TYPE");
  const [appliesToValue, setAppliesToValue] = useState(config?.appliesToValue ?? "");
  const [totalMax, setTotalMax] = useState(config?.totalMax ?? 20);
  const [isDefault, setIsDefault] = useState(config?.isDefault ?? false);
  const [isActive, setIsActive] = useState(config?.isActive ?? true);
  const [criteria, setCriteria] = useState<Criterion[]>(
    config?.criteria?.length
      ? config.criteria
      : [
          { key: "musicality", label: "Musicality", max: 5, order: 1 },
          { key: "foundation", label: "Foundation", max: 5, order: 2 },
          { key: "presentation", label: "Presentation", max: 5, order: 3 },
          { key: "execution", label: "Execution", max: 5, order: 4 },
        ]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addCriterion = () => {
    const order = criteria.length + 1;
    setCriteria([...criteria, { key: `criterion-${order}`, label: "New Criterion", max: 5, order }]);
  };

  const removeCriterion = (idx: number) => {
    setCriteria(criteria.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i + 1 })));
  };

  const updateCriterion = (idx: number, field: keyof Criterion, value: string | number) => {
    const updated = [...criteria];
    updated[idx] = { ...updated[idx], [field]: field === "max" || field === "order" ? Number(value) : value };
    setCriteria(updated);
  };

  const total = criteria.reduce((sum, c) => sum + c.max, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const body = {
      name,
      description: description || null,
      appliesTo,
      appliesToValue: appliesToValue || null,
      criteria,
      totalMax: Number(totalMax),
      isDefault,
      isActive,
    };

    const url = config ? `/api/admin/scoring-configs/${config.id}` : "/api/admin/scoring-configs";
    const method = config ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Failed to save config");
      setSubmitting(false);
      return;
    }

    router.push("/admin/scoring-configs");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-lg border border-line bg-paper-soft p-lg">
      <div className="space-y-md">
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Name</span>
          <input
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Description</span>
          <textarea
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="grid gap-md sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Applies To</span>
            <select
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value)}
            >
              <option value="EVENT_TYPE">EVENT_TYPE</option>
              <option value="ROUND_TYPE">ROUND_TYPE</option>
              <option value="EVENT">EVENT</option>
              <option value="CATEGORY">CATEGORY</option>
              <option value="ROUND_FORMAT">ROUND_FORMAT</option>
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Applies To Value</span>
            <input
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              value={appliesToValue}
              onChange={(e) => setAppliesToValue(e.target.value)}
              placeholder="e.g., DANCE_COMPETITION, CYPHER"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Total Max</span>
          <input
            type="number"
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            value={totalMax}
            onChange={(e) => setTotalMax(Number(e.target.value))}
            min={1}
          />
        </label>

        <div className="flex gap-md">
          <label className="flex items-center gap-xs">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            <span className="text-body-sm">Default</span>
          </label>
          <label className="flex items-center gap-xs">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-body-sm">Active</span>
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Criteria</h3>
          <span className="text-body-xs text-ink-muted">Total: {total}/{totalMax}</span>
        </div>
        <div className="mt-sm space-y-sm">
          {criteria.map((c, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-xs border border-line bg-paper p-sm">
              <input
                className="col-span-2 border border-line px-xs py-xs text-body-xs"
                value={c.label}
                onChange={(e) => updateCriterion(idx, "label", e.target.value)}
                placeholder="Label"
              />
              <input
                className="border border-line px-xs py-xs text-body-xs"
                value={c.key}
                onChange={(e) => updateCriterion(idx, "key", e.target.value)}
                placeholder="Key"
              />
              <input
                type="number"
                className="border border-line px-xs py-xs text-body-xs"
                value={c.max}
                onChange={(e) => updateCriterion(idx, "max", e.target.value)}
                min={0}
                step={0.5}
                max={20}
                placeholder="Max"
              />
              <button
                type="button"
                onClick={() => removeCriterion(idx)}
                className="border border-line px-xs py-xs text-body-xs hover:bg-paper-soft"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addCriterion}
          className="mt-sm border border-line px-md py-xs text-body-xs uppercase hover:bg-paper-soft"
        >
          Add Criterion
        </button>
      </div>

      {error && <p className="text-body-sm text-accent">{error}</p>}

      <div className="flex gap-sm">
        <button
          type="submit"
          disabled={submitting}
          className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] hover:bg-paper-soft"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
