"use client";

import { useState } from "react";
import { PAYU_TEST_MODE, chargeablePaise, formatInr } from "@/lib/pricing";

type PayUPurpose = "FLAT_FEE" | "COMMISSION" | "GIG_POST" | "GIG_WORK" | "GIG_CONNECTION";

type OrderFields = Record<string, string>;

export function PayUCheckout({
  purpose,
  amountInr,
  productInfo,
  eventId,
  gigId,
  agreementId,
  buttonLabel,
  className = "",
  fullWidth = false,
  disabled = false,
}: {
  purpose: PayUPurpose;
  amountInr: number;
  productInfo: string;
  eventId?: string;
  gigId?: string;
  agreementId?: string;
  buttonLabel?: string;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/payu/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          eventId,
          gigId,
          agreementId,
          amount: chargeablePaise(amountInr),
          productInfo,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Failed to start payment. Please try again.");
        return;
      }

      const { order, checkoutUrl } = await res.json();
      submitPayUForm(checkoutUrl, order as unknown as OrderFields);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      {PAYU_TEST_MODE ? (
        <p className="mb-sm text-body-sm text-ink-muted">
          Test mode — you&apos;ll be charged {formatInr(1)}.
        </p>
      ) : null}
      <button
        type="button"
        disabled={starting || disabled}
        onClick={() => void handlePay()}
        className={
          className ||
          (fullWidth
            ? "block w-full border border-accent bg-accent px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:cursor-wait disabled:opacity-60"
            : "border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:cursor-wait disabled:opacity-60")
        }
      >
        {starting ? "Redirecting to PayU..." : buttonLabel ?? `Pay ${formatInr(chargeablePaise(amountInr) / 100)}`}
      </button>
      {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}
    </div>
  );
}

function submitPayUForm(checkoutUrl: string, fields: OrderFields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  form.style.display = "none";

  const names = [
    "key",
    "txnid",
    "amount",
    "productinfo",
    "firstname",
    "email",
    "phone",
    "surl",
    "furl",
    "udf1",
    "udf2",
    "udf3",
    "udf4",
    "udf5",
    "hash",
  ];

  for (const name of names) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = fields[name] ?? "";
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}