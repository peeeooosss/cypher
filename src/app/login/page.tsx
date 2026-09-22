"use client";

import { FormEvent, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { responseError } from "@/lib/client-error";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  ORGANIZER: "/organizer",
  ARTIST: "/artist",
  JUDGE: "/judge",
};

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "ADMIN" | "ORGANIZER" | "ARTIST" | "JUDGE";
  avatarUrl: string | null;
};

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [query] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams(),
  );
  const [signedUp] = useState(() => query.get("signup") === "success");

  async function finishSignIn(profileId?: string) {
    setIsSubmitting(true);
    setError("");

    const result = await signIn("credentials", {
      identifier: phone,
      password,
      ...(profileId ? { profileId } : {}),
      redirect: false,
      callbackUrl: "/",
    });

    if (!result || result.error) {
      setIsSubmitting(false);
      setError("Invalid phone number or password.");
      return;
    }

    const session = await getSession();
    const role = session?.user?.role;
    window.location.assign(role ? (ROLE_HOME[role] ?? "/") : "/");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    setProfiles(null);

    const formData = new FormData(event.currentTarget);
    const formPhone = String(formData.get("phone") ?? "");
    const formPassword = String(formData.get("password") ?? "");

    setPhone(formPhone);
    setPassword(formPassword);

    const res = await fetch("/api/auth/signin-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: formPhone, password: formPassword }),
    });

    if (!res.ok) {
      setIsSubmitting(false);
      setError(await responseError(res, "Invalid phone number or password."));
      return;
    }

    const { matches }: { matches: Profile[] } = await res.json();

    if (matches.length === 0) {
      setIsSubmitting(false);
      setError("Invalid phone number or password.");
      return;
    }

    if (matches.length === 1) {
      await finishSignIn();
      return;
    }

    setProfiles(matches);
    setIsSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-sm py-section">
      <section className="w-full max-w-2xl border border-line bg-paper-soft p-lg sm:p-xl">
        <p className="font-display text-title-md uppercase tracking-[-0.08em]">
          CYPHR
        </p>
        <h1 className="mt-xl font-display text-display-lg uppercase">
          Enter the circle
        </h1>
        <p className="mt-sm text-body-sm text-ink-muted">
          Sign in with your phone number to manage events, enter battles, or judge the floor.
        </p>

        {!profiles ? (
          <form className="mt-xl flex w-full flex-col gap-6" onSubmit={handleSubmit}>
            <label className="block w-full text-body-sm font-bold uppercase">
              Phone number
              <input
                required
                autoComplete="tel"
                className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                inputMode="numeric"
                name="phone"
                pattern="[0-9]{10}"
                maxLength={10}
                placeholder="10-digit mobile number"
                type="tel"
              />
            </label>
            <label className="block w-full text-body-sm font-bold uppercase">
              Password
              <input
                required
                autoComplete="current-password"
                className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                minLength={8}
                name="password"
                type="password"
              />
            </label>

            {signedUp ? (
              <p className="text-body-sm font-bold uppercase text-ink">
                Account created. Sign in to enter the circle.
              </p>
            ) : null}

            {error ? <p className="text-body-sm text-accent">{error}</p> : null}

            <button
              className="w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Checking..." : "Sign in"}
            </button>
          </form>
        ) : (
          <div className="mt-xl">
            <p className="font-display text-title-md uppercase">Choose your profile</p>
            <p className="mt-sm text-body-sm text-ink-muted">
              This phone number has more than one profile. Pick which one to sign into.
            </p>

            <div className="mt-lg space-y-sm">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  className="flex w-full items-center justify-between border border-line bg-paper px-lg py-md text-left hover:border-accent disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={() => void finishSignIn(profile.id)}
                  type="button"
                >
                  <div>
                    <p className="font-bold uppercase">{profile.name ?? "Unnamed"}</p>
                    <p className="mt-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">{profile.role}</p>
                  </div>
                  <span className="border border-accent px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent">
                    {isSubmitting ? "..." : "Sign in"}
                  </span>
                </button>
              ))}
            </div>

            {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}

            <button
              className="mt-lg font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
              onClick={() => setProfiles(null)}
              type="button"
            >
              &larr; Use a different phone number
            </button>
          </div>
        )}

        <p className="mt-xl text-body-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <a className="font-bold uppercase text-ink underline decoration-accent underline-offset-4 hover:text-accent" href="/signup">
            Sign up
          </a>
        </p>
      </section>
    </main>
  );
}