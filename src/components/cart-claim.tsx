"use client";

import { useState } from "react";
import { formatFee } from "@/lib/format";

export type CartRegistration = {
  id: string;
  name: string;
  entryFee: number | null;
  entryCurrency: string;
  paid: boolean;
  paidClaimedAt: string | null;
};

export function CartCategoryList({ registrations }: { registrations: CartRegistration[] }) {
  const [claimedIds, setClaimedIds] = useState<Set<string>>(
    () => new Set(registrations.filter((r) => r.paidClaimedAt).map((r) => r.id)),
  );
  const [updating, setUpdating] = useState<string | null>(null);

  async function handleClaim(id: string) {
    setUpdating(id);
    const res = await fetch(`/api/registrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paidClaimed: true }),
    });
    if (res.ok) {
      setClaimedIds((prev) => new Set(prev).add(id));
    }
    setUpdating(null);
  }

  return (
    <ul className="divide-y divide-line">
      {registrations.map((registration) => {
        const isClaimed = claimedIds.has(registration.id);
        return (
          <li
            key={registration.id}
            className="flex items-center justify-between gap-md px-lg py-md"
          >
            <div>
              <p className="font-display text-title-md uppercase">
                {registration.name}
              </p>
              <p
                className={`mt-xs font-mono text-[0.65rem] uppercase ${
                  registration.paid || isClaimed ? "text-accent" : "text-ink-muted"
                }`}
              >
                {registration.paid
                  ? "Confirmed"
                  : isClaimed
                    ? "Payment reported"
                    : "Pending payment"}
              </p>
            </div>
            <div className="flex items-center gap-md">
              <span className="font-mono text-body-sm uppercase text-accent">
                {formatFee(registration.entryFee, registration.entryCurrency)}
              </span>
              {!registration.paid && (
                <button
                  className="border border-accent px-md py-xs text-[0.7rem] font-bold uppercase text-accent hover:bg-accent hover:text-paper disabled:cursor-wait disabled:opacity-60"
                  disabled={updating !== null || isClaimed}
                  onClick={() => void handleClaim(registration.id)}
                  type="button"
                >
                  {isClaimed ? "Reported" : "I have paid"}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
