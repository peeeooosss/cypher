"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl: "/",
    });

    if (!result || result.error) {
      setError("Invalid email or password.");
      setIsSubmitting(false);
      return;
    }

    window.location.assign(result.url ?? "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-md py-section">
      <section className="w-full max-w-lg border border-line bg-paper-soft p-lg sm:p-xl">
        <p className="font-display text-title-md uppercase tracking-[-0.08em]">
          CYPHR
        </p>
        <h1 className="mt-xl font-display text-display-lg uppercase">
          Enter the circle
        </h1>
        <p className="mt-sm text-body-sm text-ink-muted">
          Sign in to manage events, enter battles, or judge the floor.
        </p>

        <form className="mt-xl space-y-lg" onSubmit={handleSubmit}>
          <label className="block text-body-sm font-bold uppercase">
            Email
            <input
              required
              autoComplete="email"
              className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
              name="email"
              type="email"
            />
          </label>
          <label className="block text-body-sm font-bold uppercase">
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

          {error ? <p className="text-body-sm text-accent">{error}</p> : null}

          <button
            className="w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Checking..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}