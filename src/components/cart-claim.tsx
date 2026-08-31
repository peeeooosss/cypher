"use client";

import { useState } from "react";
import Link from "next/link";
import { formatFee } from "@/lib/format";
import { formatInr } from "@/lib/pricing";
import { whatsappLink, BILL_WHATSAPP_NUMBER } from "@/lib/payment";

export type CartRegistration = {
  id: string;
  name: string;
  format: string | null;
  teamName: string | null;
  members: Array<{ name: string | null; username: string | null; status: string }>;
  allMembersAccepted: boolean;
  entryFee: number | null;
  entryCurrency: string;
  paid: boolean;
  paidClaimedAt: string | null;
};

export function CartCategoryList({ registrations, eventTitle, total, organizerWhatsapp }: { registrations: CartRegistration[]; eventTitle?: string; total?: number; organizerWhatsapp?: string | null }) {
  const [claimedIds, setClaimedIds] = useState<Set<string>>(
    () => new Set(registrations.filter((r) => r.paidClaimedAt).map((r) => r.id)),
  );
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleClaim(id: string) {
    setUpdating(id);
    setError("");
    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidClaimed: true }),
      });
      if (res.ok) {
        setClaimedIds((prev) => new Set(prev).add(id));
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not report payment. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {error ? <p className="border border-accent bg-accent/10 px-md py-sm text-body-sm text-accent">{error}</p> : null}
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
                {registration.teamName ?? registration.name}
              </p>
              <p className="mt-xs text-[0.65rem] uppercase text-ink-muted">{registration.format ?? "SOLO"} · {registration.members.length} member{registration.members.length === 1 ? "" : "s"}</p>
              {registration.members.length > 1 ? <p className="mt-xs text-[0.7rem] text-ink-muted">{registration.members.map((member) => member.name ?? member.username ?? "Unnamed").join(" · ")}</p> : null}
              <p
                className={`mt-xs font-mono text-[0.65rem] uppercase ${
                  registration.paid || isClaimed ? "text-accent" : "text-ink-muted"
                }`}
              >
                {registration.paid
                  ? "Confirmed"
                  : "Wait for verification"}
              </p>
            </div>
            <div className="flex items-center gap-md">
              <span className="font-mono text-body-sm uppercase text-accent">
                {formatFee(registration.entryFee, registration.entryCurrency)}
              </span>
              {!registration.paid && (
                <>
                  {isClaimed ? (
                    <Link
                      href={whatsappLink(
                        organizerWhatsapp ?? BILL_WHATSAPP_NUMBER,
                        `Hi, I've paid for ${eventTitle ?? "my event registration"}. Total: ${formatInr(total ?? 0)}. Attaching the payment screenshot for verification.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-accent bg-accent px-sm py-xs font-mono text-[0.7rem] font-bold uppercase text-paper hover:opacity-80"
                      type="button"
                    >
                      Send screenshot
                    </Link>
                  ) : (
                    <button
                      className="border border-accent px-md py-xs text-[0.7rem] font-bold uppercase text-accent hover:bg-accent hover:text-paper disabled:cursor-wait disabled:opacity-60"
                      disabled={updating !== null || isClaimed || !registration.allMembersAccepted}
                      onClick={() => void handleClaim(registration.id)}
                      type="button"
                    >
                      {updating === registration.id ? "Sending…" : registration.allMembersAccepted ? "I have paid" : "Awaiting roster"}
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
      </ul>
    </div>
  );
}
