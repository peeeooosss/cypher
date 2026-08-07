"use client";

import { useState } from "react";

const METHODS: Array<{ id: string; label: string; scheme: string }> = [
  { id: "PAYTM", label: "Paytm", scheme: "paytmmp://pay" },
  { id: "PHONEPE", label: "PhonePe", scheme: "phonepe://pay" },
  { id: "GOOGLE_PAY", label: "Google Pay", scheme: "tez://upi/pay" },
];

export function PaymentMethods({
  amount,
  upiId,
  payeeName,
  note,
}: {
  amount: number;
  upiId: string;
  payeeName: string;
  note: string;
}) {
  const [copied, setCopied] = useState(false);

  function buildUrl(scheme: string) {
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: String(amount),
      cu: "INR",
      tn: note,
    });
    return `${scheme}?${params.toString()}`;
  }

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div>
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
        Pay {`₹${amount.toLocaleString("en-IN")}`} to
      </p>
      <button
        className="mt-sm block border border-line bg-paper px-md py-sm font-mono text-body-sm text-accent hover:border-accent"
        onClick={() => void copyUpiId()}
        type="button"
      >
        {upiId} {copied ? "· copied" : "· tap to copy"}
      </button>
      <p className="mt-md text-body-sm text-ink-muted">
        Open the pay button for your preferred UPI app, or enter the ID above
        manually. Take a screenshot of the payment &mdash; you&apos;ll send it to us for
        verification.
      </p>
      <div className="mt-md grid gap-sm sm:grid-cols-3">
        {METHODS.map((method) => (
          <a
            key={method.id}
            href={buildUrl(method.scheme)}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-accent bg-accent px-md py-md text-center font-bold uppercase text-paper transition-opacity hover:opacity-80"
          >
            {method.label}
          </a>
        ))}
      </div>
      <p className="mt-sm text-body-sm text-ink-muted">
        Buttons open the app on your phone. If nothing opens, pay directly from
        your UPI app using the ID above.
      </p>
    </div>
  );
}
