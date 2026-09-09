"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { responseError } from "@/lib/client-error";
import { formatInr } from "@/lib/money";

export type PricingFormValues = {
  workshopFee: number;
  undergroundBattleFee: number;
  danceCompetitionFee: number;
  musicCompetitionFee: number;
  commissionBps: number;
  gigFlatFee: number;
  gigWorkFee: number;
  gigConnectionFee: number;
};

function Field({
  label,
  value,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  accent: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-md py-sm">
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">{label}</span>
      <span className="flex items-center gap-sm">
        <span className="font-mono text-body-sm text-accent">{accent > 0 ? formatInr(accent) : ""}</span>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-32 border border-line bg-paper px-md py-sm text-right font-mono"
        />
      </span>
    </label>
  );
}

export function PricingSettings({ initial }: { initial: PricingFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<PricingFormValues>(initial);
  const [apply, setApply] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (key: keyof PricingFormValues) => (value: number) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, applyFlatFeeToUnpaidEvents: apply }),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to save pricing"));
        return;
      }
      setSuccess("Pricing updated everywhere.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="border border-line bg-paper-soft p-lg">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Event flat fees (INR, paid once at creation)</p>
        <div className="mt-sm divide-y divide-line">
          <Field label="Workshop" value={values.workshopFee} accent={values.workshopFee} onChange={set("workshopFee")} />
          <Field label="Underground battle" value={values.undergroundBattleFee} accent={values.undergroundBattleFee} onChange={set("undergroundBattleFee")} />
          <Field label="Dance competition" value={values.danceCompetitionFee} accent={values.danceCompetitionFee} onChange={set("danceCompetitionFee")} />
          <Field label="Music competition" value={values.musicCompetitionFee} accent={values.musicCompetitionFee} onChange={set("musicCompetitionFee")} />
        </div>
      </div>

      <div className="mt-section border border-line bg-paper-soft p-lg">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Commission on confirmed entry fees</p>
        <div className="mt-sm divide-y divide-line">
          <Field
            label={`Commission (${(values.commissionBps / 100).toFixed(values.commissionBps % 100 === 0 ? 0 : 2)}%)`}
            value={values.commissionBps}
            accent={0}
            onChange={set("commissionBps")}
          />
        </div>
        <p className="mt-sm text-body-sm text-ink-muted">Stored in basis points — 500 means 5%.</p>
      </div>

      <div className="mt-section border border-line bg-paper-soft p-lg">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Gig fees (INR)</p>
        <div className="mt-sm divide-y divide-line">
          <Field label="Gig posting flat fee" value={values.gigFlatFee} accent={values.gigFlatFee} onChange={set("gigFlatFee")} />
          <Field label="Gig work access (3 months)" value={values.gigWorkFee} accent={values.gigWorkFee} onChange={set("gigWorkFee")} />
          <Field label="Chat connection fee" value={values.gigConnectionFee} accent={values.gigConnectionFee} onChange={set("gigConnectionFee")} />
        </div>
      </div>

      <label className="mt-lg flex items-center gap-sm border border-line p-lg text-body-sm">
        <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} />
        <span>Also apply the new flat fees to existing events that have not paid yet.</span>
      </label>

      {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
      {success ? <p className="mt-md text-body-sm text-accent">{success}</p> : null}

      <button
        className="mt-lg border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
        disabled={saving}
        onClick={() => void save()}
        type="button"
      >
        {saving ? "Saving..." : "Save pricing"}
      </button>
    </div>
  );
}