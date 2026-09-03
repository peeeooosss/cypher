"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { responseError } from "@/lib/client-error";

export function GigWorkBillSubmit() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/me/gig-work/bill-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "UPI" }),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to submit. Try again."));
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <p className="text-body-sm text-ink-muted">
        Paid? Send it for verification. Keep your screenshot &mdash; you&apos;ll share it
        on WhatsApp as proof.
      </p>
      <button
        className="mt-md border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
        disabled={sending}
        onClick={() => void handleSubmit()}
        type="button"
      >
        {sending ? "Submitting..." : "Send for verification"}
      </button>
      {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}
    </div>
  );
}
