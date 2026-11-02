"use client";

import { FormEvent, useState } from "react";

const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_BILL_WHATSAPP_NUMBER ?? "919864854481").replace(/\D/g, "");

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const phone = identifier.replace(/\D/g, "");
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    const message = encodeURIComponent(
      `Hi Admin, I forgot my CYPHR password. My registered phone number: ${phone}. Please help me reset it.`,
    );
    const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-sm py-section">
      <section className="w-full max-w-2xl border border-line bg-paper-soft p-lg sm:p-xl">
        <p className="font-display text-title-md uppercase tracking-[-0.08em]">CYPHR</p>
        <h1 className="mt-xl font-display text-display-lg uppercase">Forgot Password</h1>
        <p className="mt-sm text-body-sm text-ink-muted">
          Enter your registered phone number. We&apos;ll open a message to the admin with your number so they can help reset your password.
        </p>

        <form className="mt-xl flex w-full flex-col gap-6" onSubmit={handleSubmit}>
          <label className="block w-full text-body-sm font-bold uppercase">
            Phone number
            <input
              required
              autoComplete="tel"
              className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
              inputMode="numeric"
              maxLength={10}
              name="identifier"
              pattern="[0-9]{10}"
              placeholder="10-digit mobile number"
              type="tel"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>

          {error ? <p className="text-body-sm text-accent">{error}</p> : null}

          <button
            className="border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper"
            type="submit"
          >
            Contact Admin
          </button>
        </form>

        <p className="mt-xl text-body-sm text-ink-muted">
          Remembered it?{" "}
          <a
            className="font-bold uppercase text-ink underline decoration-accent underline-offset-4 hover:text-accent"
            href="/login"
          >
            Back to sign in
          </a>
        </p>
      </section>
    </main>
  );
}
