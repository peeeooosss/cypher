"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelPaymentButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleCancel() {
    setBusy(true);
    await fetch("/api/payments/payu/cancel", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      type="button"
      className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
      disabled={busy}
      onClick={() => void handleCancel()}
    >
      {busy ? "Cancelling…" : "Cancel payment"}
    </button>
  );
}
