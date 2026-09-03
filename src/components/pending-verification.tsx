"use client";

import { BILL_WHATSAPP_NUMBER, whatsappLink } from "@/lib/payment";

export function PendingVerification({ label, context }: { label?: string; context?: string }) {
  const message =
    `Hi CYPHR Admin, I've paid ${label ?? "the amount"}${context ? ` (${context})` : ""}. ` +
    "Attaching my payment screenshot for verification.";

  return (
    <div>
      <div className="border border-accent bg-accent/10 px-md py-sm">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
          Payment sent for verification ✓
        </p>
        <p className="mt-xs text-body-sm text-ink-muted">
          Waiting for admin approval. Send your payment screenshot on WhatsApp so we can verify it faster.
        </p>
      </div>
      <a
        href={whatsappLink(BILL_WHATSAPP_NUMBER, message)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-md block w-full border border-accent bg-accent px-lg py-md text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper hover:opacity-80"
      >
        Send screenshot on WhatsApp
      </a>
      <p className="mt-sm text-body-sm text-ink-muted">
        Status will flip to &ldquo;verified&rdquo; here once the admin approves it.
      </p>
    </div>
  );
}
