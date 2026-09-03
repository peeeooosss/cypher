"use client";

import { FormEvent, useEffect, useState } from "react";

type EmailVerifyFormProps = {
  email: string;
  onVerified?: () => void;
  verifyEndpoint?: string;
  resendEndpoint?: string;
  showEmailLine?: boolean;
};

export function EmailVerifyForm({
  email,
  onVerified,
  verifyEndpoint = "/api/auth/verify-email",
  resendEndpoint = "/api/auth/resend-verification",
  showEmailLine = true,
}: EmailVerifyFormProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch(verifyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to verify that code. Please try again.");
        setOtp("");
        return;
      }
      setSuccess("Your email has been verified.");
      onVerified?.();
    } catch {
      setError("Unable to verify right now. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (countdown > 0 || resending) return;
    setError("");
    setSuccess("");
    setResending(true);
    try {
      const response = await fetch(resendEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 429) {
        setError(data?.message ?? "Please wait a moment before requesting another code.");
      } else {
        setSuccess(data?.message ?? "A new code is on its way to your inbox.");
      }
      setOtp("");
      setCountdown(60);
    } catch {
      setError("Unable to resend right now. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="border border-accent p-md text-body-sm">
      <p className="font-bold uppercase">Enter the verification code</p>
      {showEmailLine ? (
        <p className="mt-xs text-ink-muted">
          We sent a 6-digit code to <span className="font-bold text-ink">{email}</span>. It expires in 15 minutes.
        </p>
      ) : (
        <p className="mt-xs text-ink-muted">Enter the 6-digit code we emailed you. It expires in 15 minutes.</p>
      )}
      <form className="mt-md flex flex-col gap-md" onSubmit={handleVerify}>
        <input
          autoComplete="one-time-code"
          autoFocus
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]{6}"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="block w-full border border-line bg-paper px-md py-md text-center font-mono text-title-md tracking-[0.5em] text-ink outline-none focus:border-accent"
        />

        {success ? <p className="text-button-md font-bold uppercase text-accent">{success}</p> : null}
        {error ? <p className="text-accent">{error}</p> : null}

        <div className="flex flex-col gap-md sm:flex-row">
          <button
            className="border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
            disabled={verifying}
            type="submit"
          >
            {verifying ? "Verifying..." : "Verify code"}
          </button>
          <button
            type="button"
            className="border border-line px-lg py-md font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent disabled:opacity-60"
            disabled={resending || countdown > 0}
            onClick={() => void handleResend()}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : resending ? "Sending..." : "Resend code"}
          </button>
        </div>
      </form>
    </div>
  );
}
