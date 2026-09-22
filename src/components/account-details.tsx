"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailVerifyForm } from "@/components/email-verify-form";
import { displayPhone } from "@/lib/phone";

type AccountDetailsProps = {
  phone: string | null;
  email: string | null;
  emailVerifiedAt: Date | string | null;
};

export function AccountDetails({ phone, email, emailVerifiedAt }: AccountDetailsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [emailInput, setEmailInput] = useState(email ?? "");
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");

  const isVerified = Boolean(email && emailVerifiedAt);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!/.+@.+\..+/.test(emailInput)) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/users/me/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to send the code. Please try again.");
      } else {
        setCodeSent(true);
      }
    } catch {
      setError("Unable to send the code right now. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-section border border-line bg-paper-soft p-lg">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-ink-muted">Account details</p>
      <div className="mt-md grid gap-md text-body-sm sm:grid-cols-2">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Phone number</p>
          <p className="mt-xs text-body-md">{displayPhone(phone) ?? "—"}</p>
          <p className="mt-xs text-button-sm text-ink-muted">Used to sign in and reach you on WhatsApp.</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">Email</p>
          {email ? (
            <p className="mt-xs text-body-md">
              {email}{" "}
              <span className={isVerified ? "text-accent" : "text-ink-muted"}>
                {isVerified ? "· verified" : "· not verified"}
              </span>
            </p>
          ) : (
            <p className="mt-xs text-body-md text-ink-muted">Not set. Add an email to receive updates.</p>
          )}
          <button
            type="button"
            className="mt-xs border border-line px-md py-sm font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-ink transition-colors hover:border-accent hover:text-accent"
            onClick={() => {
              setEditing((prev) => !prev);
              setCodeSent(false);
              setError("");
              setEmailInput(email ?? "");
            }}
          >
            {editing ? "Cancel" : email ? "Change email" : "Add email"}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-lg max-w-xl">
          {codeSent ? (
            <EmailVerifyForm
              email={emailInput}
              verifyEndpoint="/api/users/me/email/confirm"
              resendEndpoint="/api/users/me/email"
              onVerified={() => {
                router.refresh();
                setEditing(false);
                setCodeSent(false);
              }}
            />
          ) : (
            <form className="mt-md flex flex-col gap-sm" onSubmit={handleSendCode}>
              <label className="block w-full text-body-sm font-bold uppercase">
                {email ? "New email address" : "Email address"}
                <input
                  required
                  autoComplete="email"
                  className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                  name="email"
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                />
              </label>
              {error ? <p className="text-button-sm text-accent">{error}</p> : null}
              <button
                type="submit"
                className="w-fit border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
                disabled={sending}
              >
                {sending ? "Sending..." : "Send verification code"}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}