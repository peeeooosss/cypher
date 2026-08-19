"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentType } from "@/generated/prisma/enums";

type RazorpayHandler = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description?: string;
      order_id: string;
      prefill?: { name?: string; email?: string; contact?: string };
      theme?: { color: string };
      handler: (response: RazorpayHandler) => void;
      modal?: {
        ondismiss?: () => void;
      };
    }) => { open: () => void; on: (event: string, callback: (response: RazorpayHandler & { error?: { reason?: string; description?: string } }) => void) => void };
  }
}

let scriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript(): Promise<boolean> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export function RazorpayCheckout({
  type,
  referenceId,
  label,
  className,
  onSuccess,
  disabled = false,
}: {
  type: PaymentType;
  referenceId: string;
  label: string;
  className?: string;
  onSuccess?: () => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setBusy(true);
    setError("");

    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setBusy(false);
      setError("Unable to load payment. Check your connection and try again.");
      return;
    }

    const orderRes = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, referenceId }),
    });

    if (!orderRes.ok) {
      const body = await orderRes.json().catch(() => null);
      setBusy(false);
      setError(body?.error ?? "Unable to start payment.");
      return;
    }

    const order = await orderRes.json();

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "CYPHR",
      description: `Payment - ${type}`,
      order_id: order.orderId,
      handler: async (response) => {
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        setBusy(false);

        if (!verifyRes.ok) {
          setError("Payment could not be verified. Please contact support.");
          return;
        }

        onSuccess?.();
        router.refresh();
      },
      modal: {
        ondismiss: () => {
          setBusy(false);
        },
      },
      theme: { color: "#FF3B30" },
    });

    rzp.on("payment.failed", () => {
      setBusy(false);
      setError("Payment failed. Please try again.");
    });

    rzp.open();
  }

  return (
    <div>
      <button
        type="button"
        className={className ?? "border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"}
        disabled={busy || disabled}
        onClick={() => void handlePay()}
      >
        {busy ? "Processing..." : label}
      </button>
      {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}
    </div>
  );
}
