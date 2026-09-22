"use client";

import { FormEvent, useState } from "react";
import { getSession, signIn } from "next-auth/react";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  ORGANIZER: "/organizer",
  ARTIST: "/artist",
  JUDGE: "/judge",
};

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [query] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams(),
  );
  const [signedUp] = useState(() => query.get("signup") === "success");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      identifier: formData.get("phone"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl: "/",
    });

    if (!result || result.error) {
      setError("Invalid phone number or password.");
      setIsSubmitting(false);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role;
    window.location.assign(role ? (ROLE_HOME[role] ?? "/") : "/");
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