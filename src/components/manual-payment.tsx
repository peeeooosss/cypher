"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UpiButtons } from "@/components/upi-buttons";
import { PAYMENT_UPI_ID, PAYMENT_NAME } from "@/lib/payment";

export function ManualPayment({
  amount,
  note,
  submitUrl,
  submitBody,
  buttonLabel = "Send for verification",
  verifier = "the CYPHR team",
}: {
  amount: number;
  note: string;
  submitUrl: string;
  submitBody?: Record<string, unknown>;
  buttonLabel?: string;
  verifier?: string;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setSending(true);
    setError("");
    const res = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submitBody ?? {}),
    });
    setSending(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => null);
    setError(body?.error ?? "Failed to submit. Try again.");
  }

  return (
    <div>
      <UpiButtons upiId={PAYMENT_UPI_ID} payeeName={PAYMENT_NAME} amount={amount} note={note} verifier={verifier} />
      <div className="mt-lg border-t border-line pt-md">
        <p className="text-body-sm text-ink-muted">
          Paid? Send it for verification. Keep your screenshot &mdash; you&apos;ll share it
          on WhatsApp as proof.
        </p>
        <button
          className="mt-md w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
          disabled={sending}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {sending ? "Submitting..." : buttonLabel}
        </button>
        {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}
      </div>
    </div>
  );
}
