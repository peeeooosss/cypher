"use client";

import { FormEvent, useState } from "react";
import { responseError } from "@/lib/client-error";

type Profile = {
  id: string;
  name: string | null;
  role: "ADMIN" | "ORGANIZER" | "ARTIST" | "JUDGE";
};

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const rules: [string, boolean][] = [
    ["At least 8 characters", newPassword.length >= 8],
    ["At least one number", /[0-9]/.test(newPassword)],
    ["At least one special character", /[^A-Za-z0-9]/.test(newPassword)],
    ["Passwords match", newPassword.length > 0 && newPassword === confirmPassword],
  ];
  const allValid = rules.every(([, met]) => met);

  async function submit(profileId?: string) {
    setError("");

    const isEmail = identifier.includes("@");
    if (!isEmail && identifier.replace(/\D/g, "").length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    if (!profileId && !allValid) {
      setError("Your new password does not meet the requirements below.");
      return;
    }

    setIsSubmitting(true);

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        currentPassword,
        newPassword,
        ...(profileId ? { profileId } : {}),
      }),
    });

    if (!res.ok) {
      setIsSubmitting(false);
      setError(
        await responseError(res, "Could not update your password. Check your current password and try again."),
      );
      return;
    }

    const data = await res.json().catch(() => null);
    if (data?.matches?.length) {
      setProfiles(data.matches);
      setIsSubmitting(false);
      return;
    }

    setProfiles(null);
    setDone(true);
    setIsSubmitting(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-sm py-section">
      <section className="w-full max-w-2xl border border-line bg-paper-soft p-lg sm:p-xl">
        <p className="font-display text-title-md uppercase tracking-[-0.08em]">CYPHR</p>
        <h1 className="mt-xl font-display text-display-lg uppercase">Reset password</h1>
        <p className="mt-sm text-body-sm text-ink-muted">
          Confirm it&apos;s you with your current password, then set a new one.
        </p>

        {done ? (
          <div className="mt-xl border border-accent p-md text-body-sm">
            <p className="font-bold uppercase text-accent">Password updated.</p>
            <p className="mt-sm text-ink-muted">Sign in with your new password to continue.</p>
            <a
              className="mt-md inline-block border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper"
              href="/login"
            >
              Back to sign in
            </a>
          </div>
        ) : profiles ? (
          <div className="mt-xl">
            <p className="font-bold uppercase">Choose profile</p>
            <p className="mt-sm text-body-sm text-ink-muted">
              This phone number has more than one profile. Pick which password to change.
            </p>
            <div className="mt-lg space-y-sm">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  className="flex w-full items-center justify-between border border-line bg-paper px-lg py-md text-left hover:border-accent disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={() => void submit(profile.id)}
                  type="button"
                >
                  <div>
                    <p className="font-bold uppercase">{profile.name ?? "Unnamed"}</p>
                    <p className="mt-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                      {profile.role}
                    </p>
                  </div>
                  <span className="border border-accent px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent">
                    {isSubmitting ? "..." : "Use"}
                  </span>
                </button>
              ))}
            </div>
            {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
            <button
              className="mt-lg font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
              onClick={() => {
                setProfiles(null);
                setError("");
              }}
              type="button"
            >
              &larr; Back
            </button>
          </div>
        ) : (
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
            <label className="block w-full text-body-sm font-bold uppercase">
              Current password
              <input
                required
                autoComplete="current-password"
                className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
            </label>
            <label className="block w-full text-body-sm font-bold uppercase">
              New password
              <input
                required
                autoComplete="new-password"
                className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </label>
            <label className="block w-full text-body-sm font-bold uppercase">
              Confirm new password
              <input
                required
                autoComplete="new-password"
                className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </label>

            <ul className="flex flex-col gap-xs text-body-sm">
              {rules.map(([label, met]) => (
                <li key={label} className={met ? "text-accent" : "text-ink-muted"}>
                  {met ? "\u2713" : "\u00b7"} {label}
                </li>
              ))}
            </ul>

            {error ? <p className="text-body-sm text-accent">{error}</p> : null}

            <button
              className="border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
              disabled={isSubmitting || !allValid}
              type="submit"
            >
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

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
