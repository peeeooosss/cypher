"use client";

import { FormEvent, useState } from "react";
import { DANCE_STYLES, EXPERIENCE_OPTIONS } from "@/lib/styles";
import { EmailVerifyForm } from "@/components/email-verify-form";

type Role = "ORGANIZER" | "ARTIST";

const ARTIST_PROFILE_FIELDS = [
  { name: "crew", label: "Crew", placeholder: "e.g. Soul Mechanics (optional)", required: false },
  { name: "city", label: "City", placeholder: "e.g. Guwahati", required: true },
  { name: "country", label: "Country", placeholder: "e.g. India", required: true },
  { name: "socialHandle", label: "Social handle", placeholder: "@yourname", required: true },
  { name: "referral", label: "How did you hear about us?", placeholder: "e.g. Instagram, Friend (optional)", required: false },
] as const;

export default function SignupPage() {
  const [role, setRole] = useState<Role>("ARTIST");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [verifySent, setVerifySent] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySending, setVerifySending] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    if (!emailVerified) {
      setError("Please verify your email before creating the account.");
      setIsSubmitting(false);
      return;
    }

    const body: Record<string, unknown> = {
      name: formData.get("name"),
      email,
      password,
      role,
    };

    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    if (username) body.username = username;

    if (role === "ARTIST") {
      for (const field of ARTIST_PROFILE_FIELDS) {
        const value = String(formData.get(field.name) ?? "").trim();
        if (value) body[field.name] = value;
      }

      const style = String(formData.get("style") ?? "").trim();
      if (style) body.style = style;
      const experience = String(formData.get("experience") ?? "").trim();
      if (experience) body.experience = experience;
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setAccountCreated(true);
    setIsSubmitting(false);
  }

  async function handleVerifyRequest() {
    setVerifyError("");
    if (!/.+@.+\..+/.test(email)) {
      setVerifyError("Enter a valid email address first.");
      return;
    }
    setVerifySending(true);
    try {
      const response = await fetch("/api/auth/verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setVerifyError(data?.error ?? "Unable to send the code. Please try again.");
      } else {
        setVerifySent(true);
      }
    } catch {
      setVerifyError("Unable to send the code right now. Please try again.");
    } finally {
      setVerifySending(false);
    }
  }

  const nameLabel = role === "ORGANIZER" ? "Organization name" : "Artist name";

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-sm py-section">
      <section className="w-full max-w-2xl border border-line bg-paper-soft p-lg sm:p-xl">
        <p className="font-display text-title-md uppercase tracking-[-0.08em]">
          CYPHR
        </p>
        <h1 className="mt-xl font-display text-display-lg uppercase">
          Join the circle
        </h1>
        <p className="mt-sm text-body-sm text-ink-muted">
          Create an account to host battles, enter the floor, or take the stage.
        </p>

        <div className="mt-xl grid grid-cols-2 gap-sm" role="tablist" aria-label="Account type">
          {(["ORGANIZER", "ARTIST"] as const).map((option) => {
            const isActive = role === option;
            return (
              <button
                key={option}
                className={`border px-md py-md text-button-md font-bold uppercase transition-colors ${
                  isActive
                    ? "border-accent bg-accent text-paper"
                    : "border-line bg-paper text-ink hover:border-accent"
                }`}
                onClick={() => setRole(option)}
                role="tab"
                type="button"
                aria-selected={isActive}
              >
                {option === "ORGANIZER" ? "Organizer" : "Artist"}
              </button>
            );
          })}
        </div>

        <form className="mt-xl flex w-full flex-col gap-6" onSubmit={handleSubmit}>
          <label className="block w-full text-body-sm font-bold uppercase">
            {nameLabel}
            <input
              required
              autoComplete="name"
              className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
              name="name"
              placeholder={role === "ORGANIZER" ? "Your crew or company name" : "Your stage name"}
            />
          </label>
          <label className="block w-full text-body-sm font-bold uppercase">
            Username
            <input
              required={role === "ARTIST"}
              autoComplete="username"
              className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
              name="username"
              pattern="[a-zA-Z0-9_]{3,30}"
              placeholder="e.g. alexmoves"
            />
            <span className="mt-xs block text-[0.65rem] font-normal normal-case text-ink-muted">Artists use this to invite you to team entries.</span>
          </label>
          <label className="block w-full text-body-sm font-bold uppercase">
            Email
            <div className="mt-sm flex gap-sm">
              <input
                required
                autoComplete="email"
                className="block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                name="email"
                type="email"
                value={email}
                disabled={emailVerified}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailVerified(false);
                  setVerifySent(false);
                  setVerifyError("");
                }}
              />
              <button
                type="button"
                className={`shrink-0 border px-md py-md text-button-md font-bold uppercase ${
                  emailVerified
                    ? "border-accent text-accent"
                    : "border-line bg-paper text-ink hover:border-accent hover:text-accent"
                } disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={verifySending || emailVerified}
                onClick={() => void handleVerifyRequest()}
              >
                {emailVerified ? "Verified ✓" : verifySending ? "Sending..." : "Verify email"}
              </button>
            </div>
            {verifyError ? <span className="mt-xs block text-button-sm text-accent">{verifyError}</span> : null}
            {emailVerified ? (
              <span className="mt-xs block text-button-sm text-accent">Email verified. You can now create your account.</span>
            ) : null}
          </label>
          <label className="block w-full text-body-sm font-bold uppercase">
            Password
            <input
              required
              autoComplete="new-password"
              className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
              minLength={8}
              name="password"
              placeholder="Minimum 8 characters"
              type="password"
            />
          </label>
          <label className="block w-full text-body-sm font-bold uppercase">
            Confirm password
            <input
              required
              autoComplete="new-password"
              className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
              minLength={8}
              name="confirmPassword"
              type="password"
            />
          </label>

          {role === "ARTIST" ? (
            <div className="border border-line bg-paper p-md">
              <p className="font-display text-title-md uppercase">Battle profile</p>
              <p className="mt-xs text-body-sm text-ink-muted">
                This is shown to organizers so they know who&rsquo;s on the floor.
              </p>
              <div className="mt-lg grid gap-md sm:grid-cols-2">
                <label className="block text-body-sm font-bold uppercase">
                  Style — dance style
                  <span className="font-normal normal-case text-ink-muted"> (optional)</span>
                  <select
                    autoComplete="off"
                    className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                    name="style"
                    defaultValue=""
                  >
                    <option value="">Not a dancer / skip</option>
                    {DANCE_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-body-sm font-bold uppercase">
                  Years of experience
                  <select
                    required
                    autoComplete="off"
                    className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                    name="experience"
                    defaultValue=""
                  >
                    <option value="">Select years</option>
                    {EXPERIENCE_OPTIONS.map((years) => (
                      <option key={years} value={years}>
                        {years === "0" ? "Under 1 year" : `${years} ${years === "1" ? "year" : "years"}`}
                      </option>
                    ))}
                  </select>
                </label>
                {ARTIST_PROFILE_FIELDS.map((field) => (
                  <label
                    key={field.name}
                    className={`block text-body-sm font-bold uppercase ${field.name === "referral" ? "sm:col-span-2" : ""}`}
                  >
                    {field.label}
                    {!field.required && <span className="font-normal normal-case text-ink-muted"> (optional)</span>}
                    <input
                      required={field.required}
                      autoComplete="off"
                      className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                      name={field.name}
                      placeholder={field.placeholder}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-body-sm text-accent">{error}</p> : null}

          {accountCreated ? (
            <div className="border border-accent p-md text-body-sm">
              <p className="font-bold uppercase text-accent">Account created. Welcome to the circle.</p>
              <p className="mt-sm text-ink-muted">Your email is verified — sign in to get started.</p>
              <a
                className="mt-md inline-block border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper"
                href="/login"
              >
                Sign in
              </a>
            </div>
          ) : (
            <>
              <button
                className="w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || !emailVerified}
                type="submit"
              >
                {isSubmitting ? "Creating account..." : emailVerified ? "Create account" : "Verify email to continue"}
              </button>
              {!emailVerified && verifySent ? (
                <p className="text-center text-body-sm text-ink-muted">Enter the code below to unlock account creation.</p>
              ) : null}
              {!emailVerified && !verifySent ? (
                <p className="text-center text-body-sm text-ink-muted">
                  Click &ldquo;Verify email&rdquo; next to your email to receive a 6-digit code.
                </p>
              ) : null}
            </>
          )}
        </form>

        {verifySent && !emailVerified && !accountCreated ? (
          <div className="mt-lg">
            <EmailVerifyForm
              email={email}
              showEmailLine={false}
              verifyEndpoint="/api/auth/verify/confirm"
              resendEndpoint="/api/auth/verify/request"
              onVerified={() => setEmailVerified(true)}
            />
          </div>
        ) : null}

        <p className="mt-xl text-body-sm text-ink-muted">
          Already have an account?{" "}
          <a className="font-bold uppercase text-ink underline decoration-accent underline-offset-4 hover:text-accent" href="/login">
            Sign in
          </a>
        </p>
      </section>
    </main>
  );
}
