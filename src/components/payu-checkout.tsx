"use client";

import { useState } from "react";

type PayuPaymentType =
  | "EVENT_FLAT_FEE"
  | "EVENT_COMMISSION"
  | "GIG_POST"
  | "GIG_WORK"
  | "GIG_CONNECTION";

export function PayuCheckout({
  type,
  referenceId,
  label,
  className,
}: {
  type: PayuPaymentType;
  referenceId: string;
  label: string;
  className?: string;
}) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setBusy(true);
    setError("");

    const response = await fetch("/api/payments/payu/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, referenceId, phone }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setBusy(false);
      setError(body?.error ?? "Unable to start payment.");
      return;
    }

    const checkout = await response.json();
    const form = document.createElement("form");
    form.method = "POST";
    form.action = checkout.action;
    form.style.display = "none";

    for (const [name, value] of Object.entries(checkout.fields as Record<string, string>)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="space-y-sm">
      <label className="block">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
          Mobile number for PayU
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit mobile number"
          className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-md text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>
      <button
        type="button"
        className={className ?? "w-full border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:cursor-wait disabled:opacity-60"}
        disabled={busy}
        onClick={() => void handlePay()}
      >
        {busy ? "Redirecting to PayU…" : label}
      </button>
      {error ? <p className="text-body-sm text-accent">{error}</p> : null}
      <p className="text-[0.7rem] text-ink-muted">Secure checkout powered by PayU. You will be redirected to PayU to complete payment.</p>
    </div>
  );
}
