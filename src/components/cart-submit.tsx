"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatFee } from "@/lib/format";

export function CartSubmit({
  eventId,
  categoryIds,
  teamName,
  memberIds,
  total,
}: {
  eventId: string;
  categoryIds: string[];
  teamName?: string;
  memberIds: string[];
  total: number;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleClaim() {
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryIds,
        teamName: teamName?.trim() || undefined,
        memberIds,
        claim: true,
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to register. Please try again.");
      setSubmitting(false);
      return;
    }
    const created = body as { id: string }[];
    router.replace(`/cart?event=${eventId}&ids=${created.map((registration) => registration.id).join(",")}`);
  }

  return (
    <div>
      <button
        className="mt-lg block w-full border border-accent bg-accent px-md py-sm text-body-sm font-bold uppercase text-paper transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-60"
        type="button"
        onClick={() => void handleClaim()}
        disabled={submitting}
      >
        {submitting ? "Registering…" : `I have paid — ${formatFee(total, "INR")}`}
      </button>
      {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}
    </div>
  );
}
