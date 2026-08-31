"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function UpiForm({ currentUpiId, currentWhatsappNumber }: { currentUpiId: string | null; currentWhatsappNumber: string | null }) {
  const router = useRouter();
  const upiInputRef = useRef<HTMLInputElement>(null);
  const whatsappInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const upiId = (upiInputRef.current?.value ?? "").trim();
    const whatsappNumber = (whatsappInputRef.current?.value ?? "").trim();
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upiId, whatsappNumber }),
    });
    if (res.ok) {
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-md border border-line bg-paper-soft p-lg"
    >
      <div className="min-w-[220px] flex-1">
        <label htmlFor="upi" className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
          Payment UPI ID
        </label>
        <input
          id="upi"
          ref={upiInputRef}
          type="text"
          defaultValue={currentUpiId ?? ""}
          placeholder="yourname@upi"
          className="mt-xs w-full border border-line bg-paper px-md py-sm font-mono text-body-sm outline-none focus:border-accent"
        />
        <p className="mt-xs text-body-sm text-ink-muted">
          Artists scan your QR on this UPI ID to pay entry fees. Leave empty to remove.
        </p>
      </div>
      <div className="min-w-[220px] flex-1">
        <label htmlFor="whatsapp" className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
          WhatsApp number
        </label>
        <input
          id="whatsapp"
          ref={whatsappInputRef}
          type="tel"
          inputMode="numeric"
          defaultValue={currentWhatsappNumber ?? ""}
          placeholder="9198XXXXXXXX (country code + number)"
          className="mt-xs w-full border border-line bg-paper px-md py-sm font-mono text-body-sm outline-none focus:border-accent"
        />
        <p className="mt-xs text-body-sm text-ink-muted">
          Artists send you their payment screenshot here for verification. Leave empty to remove.
        </p>
      </div>
      <button
        type="submit"
        disabled={status === "saving"}
        className="border border-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent hover:bg-accent hover:text-paper disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : "Save"}
      </button>
      {status === "saved" && (
        <span className="font-mono text-[0.7rem] uppercase text-accent">Saved</span>
      )}
      {status === "error" && (
        <span className="font-mono text-[0.7rem] uppercase text-red-600">Failed</span>
      )}
    </form>
  );
}
