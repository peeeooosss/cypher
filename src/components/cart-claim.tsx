"use client";

import { useState } from "react";
import Link from "next/link";
import { formatFee } from "@/lib/format";
import { formatInr } from "@/lib/money";
import { whatsappLink, BILL_WHATSAPP_NUMBER } from "@/lib/payment";
import { buildStructuredVerifyMessage, isCustomAuditionEvent, type CustomAuditionMode } from "@/lib/audition-events";

export type CartRegistration = {
  id: string;
  name: string;
  format: string | null;
  teamName: string | null;
  choreographerName?: string | null;
  address?: string | null;
  members: Array<{ name: string | null; username: string | null; status: string }>;
  allMembersAccepted: boolean;
  entryFee: number | null;
  entryCurrency: string;
  paid: boolean;
  paidClaimedAt: string | null;
};

export function CartCategoryList({ registrations, eventTitle, total, organizerWhatsapp, organizerName, organizerStudioName, eventSlug, audMode, audCity, sender }: { registrations: CartRegistration[]; eventTitle?: string; total?: number; organizerWhatsapp?: string | null; organizerName?: string | null; organizerStudioName?: string | null; eventSlug?: string | null; audMode?: CustomAuditionMode | null; audCity?: string | null; sender?: string | null }) {
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
        // Same structured text as the checkout button on the custom audition
        // event; other events keep the legacy one-line message.
        const verifyHref = whatsappLink(
          organizerWhatsapp ?? BILL_WHATSAPP_NUMBER,
          isCustomAuditionEvent(eventSlug)
            ? buildStructuredVerifyMessage({
                studio: organizerStudioName ?? organizerName ?? "Organizer",
                sender: sender ?? "a participant",
                team: registration.teamName,
                choreographer: registration.choreographerName,
                address: registration.address,
                categories: registration.name,
                payment: formatFee(registration.entryFee, registration.entryCurrency),
                audMode,
                audCity,
              })
            : `Hi ${organizerName ?? "Organizer"}, I'm ${sender ?? "a participant"}. I've paid for ${eventTitle ?? "my event registration"}. Total: ${formatInr(total ?? 0)}. Attaching the payment screenshot for verification.`,
        );
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
            <div className="flex shrink-0 flex-col items-end gap-sm">
              <span className="font-mono text-body-sm uppercase text-accent">
                {formatFee(registration.entryFee, registration.entryCurrency)}
              </span>
              {!registration.paid && (
                <>
                  {isClaimed ? (
                    <div className="border border-accent bg-accent/10 p-md text-center">
                      <p className="font-display text-title-md uppercase">Waiting for verification</p>
                      <p className="mt-xs text-body-sm text-ink-muted">
                        Send your payment screenshot to get verified faster.
                      </p>
                      <Link
                        href={verifyHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-sm block w-full border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper hover:opacity-80"
                      >
                        Verify now
                      </Link>
                    </div>
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
