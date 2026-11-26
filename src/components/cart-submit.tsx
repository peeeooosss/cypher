"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatFee } from "@/lib/format";

export function CartSubmit({
  eventId,
  categoryIds,
  teamName,
  choreographerName,
  address,
  age,
  auditionCity,
  musicFileUrl,
  musicFileKey,
  musicFileName,
  musicFileSize,
  musicMimeType,
  memberIds,
  total,
  verifyHref,
}: {
  eventId: string;
  categoryIds: string[];
  teamName?: string;
  choreographerName?: string;
  address?: string;
  age?: number;
  auditionCity?: string;
  musicFileUrl?: string;
  musicFileKey?: string;
  musicFileName?: string;
  musicFileSize?: number;
  musicMimeType?: string;
  memberIds: string[];
  total: number;
  verifyHref: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleClaim() {
    setSubmitting(true);
    setError("");
    const popup = window.open("", "_blank");
    if (popup) popup.opener = null;
    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryIds,
          teamName: teamName?.trim() || undefined,
          choreographerName: choreographerName?.trim() || undefined,
          address: address?.trim() || undefined,
          age,
          auditionCity: auditionCity?.trim() || undefined,
          musicFileUrl,
          musicFileKey,
          musicFileName,
          musicFileSize,
          musicMimeType,
          memberIds,
          claim: true,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        popup?.close();
        setError(body?.error ?? "Unable to register. Please try again.");
        return;
      }
      const created = body as { id: string }[];
      const next = new URLSearchParams({ event: eventId, ids: created.map((item) => item.id).join(",") });
      if (popup) popup.location.href = verifyHref;
      else window.location.assign(verifyHref);
      router.replace(`/cart?${next.toString()}`);
    } catch {
      popup?.close();
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        className="mt-lg block w-full border border-accent bg-accent px-md py-sm text-body-sm font-bold uppercase text-paper transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-60"
        type="button"
        onClick={() => void handleClaim()}
        disabled={submitting}
      >
        {submitting ? "Registering…" : `Paid & Verify Now — ${formatFee(total, "INR")}`}
      </button>
      {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}
    </div>
  );
}
