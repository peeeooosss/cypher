"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function JudgeEntryPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("code") ?? "").trim().toUpperCase();

    if (code.length !== 6) {
      setError("Code must be 6 characters");
      setIsSubmitting(false);
      return;
    }

    const res = await fetch(`/api/judge-slots/${code}`);

    if (res.ok) {
      router.push(`/judge/${code}`);
      return;
    }

    if (res.status === 404) {
      setError("Invalid code");
    } else {
      setError("Something went wrong. Try again.");
    }
    setIsSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-sm py-section">
      <section className="w-full max-w-2xl border border-line bg-paper-soft p-lg sm:p-xl">
        <p className="font-display text-title-md uppercase">CYPHR</p>
        <h1 className="mt-xl font-display text-display-lg uppercase">
          Judge the floor
        </h1>
        <p className="mt-sm text-body-sm text-ink-muted">
          Enter the access code provided by the event organizer.
        </p>

        <form className="mt-xl flex w-full flex-col gap-6" onSubmit={handleSubmit}>
          <label className="block w-full text-body-sm font-bold uppercase">
            Access code
            <input
            required
            autoComplete="off"
            className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md uppercase outline-none focus:border-accent"
            maxLength={6}
            minLength={6}
            name="code"
            placeholder="XXXXXX"
            type="text"
            />
          </label>

          {error ? <p className="text-body-sm text-accent">{error}</p> : null}

          <button
            className="w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Checking..." : "Enter"}
          </button>
        </form>

        <p className="mt-xl text-body-sm text-ink-muted">
          Are you an organizer?{" "}
          <Link
            className="font-bold uppercase text-ink underline decoration-accent underline-offset-4 hover:text-accent"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
