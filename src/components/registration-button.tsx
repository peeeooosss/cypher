"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatFee(entryFee: number | null | undefined, entryCurrency: string | null | undefined) {
  if (!entryFee || entryFee <= 0) return "Free";
  const currency = entryCurrency ?? "INR";
  return currency === "INR" ? `₹${entryFee}` : `${currency} ${entryFee}`;
}

export function RegistrationButton({
  categoryId,
  registered,
  paid = false,
  entryFee = null,
  entryCurrency = "INR",
}: {
  categoryId: string;
  registered: boolean;
  paid?: boolean;
  entryFee?: number | null;
  entryCurrency?: string | null;
}) {
  const router = useRouter();
  const [isRegistered, setIsRegistered] = useState(registered);
  const [error, setError] = useState("");
  const feeLabel = formatFee(entryFee, entryCurrency);
  const isPaid = paid && isRegistered;

  async function register() {
    setError("");
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to register.");
      return;
    }

    setIsRegistered(true);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end gap-xs">
      {isRegistered ? (
        <div className="text-right">
          <button
            className="border border-line px-sm py-xs text-body-sm font-bold uppercase text-ink-muted disabled:opacity-60"
            disabled
            type="button"
          >
            {isPaid ? "Confirmed" : "Registered"}
          </button>
          {!isPaid && feeLabel !== "Free" && (
            <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
              Pending payment · {feeLabel}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-end">
          <button
            className="border border-accent px-sm py-xs text-body-sm font-bold uppercase text-accent disabled:opacity-60"
            onClick={register}
            type="button"
          >
            Enter
          </button>
          <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
            Entry {feeLabel}
          </p>
        </div>
      )}
      {error ? <span className="text-[0.7rem] text-accent">{error}</span> : null}
    </span>
  );
}
