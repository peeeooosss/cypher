"use client";

import { FormEvent, useState } from "react";
import { FeedbackType } from "@/generated/prisma/enums";

const TYPES = [
  { value: FeedbackType.FEEDBACK, label: "General feedback", hint: "Thoughts on the platform, an event, or something that felt off." },
  { value: FeedbackType.DEMAND, label: "Public demand", hint: "A feature you want us to add to the website next." },
] as const;

export default function FeedbackPage() {
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>(FeedbackType.FEEDBACK);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      type,
      subject: formData.get("subject"),
      message: formData.get("message"),
    };
    const name = String(formData.get("name") ?? "").trim();
    if (name) body.name = name;
    const email = String(formData.get("email") ?? "").trim();
    if (email) body.email = email;

    const response = await fetch("/api/feedback", {
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

    setSubmitted(true);
    setIsSubmitting(false);
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-sm py-section">
        <section className="w-full max-w-2xl border border-line bg-paper-soft p-lg text-center sm:p-xl">
          <p className="font-display text-display-lg uppercase">Received.</p>
          <p className="mx-auto mt-md max-w-lg text-body-sm text-ink-muted">
            Thanks for taking the time. Your{" "}
            {type === FeedbackType.DEMAND ? "demand" : "feedback"} is on its way to
            the control room — we read every single one.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-paper">
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            Feedback
          </p>
          <h1 className="mt-lg max-w-4xl font-display text-display-xl uppercase leading-tight tracking-[-0.03em]">
            Tell us what&rsquo;s next.
          </h1>
          <p className="mt-md max-w-2xl text-body-md text-ink-muted">
            Spotted a bug, want a new feature, or think the floor could run better?
            Drop it here and it lands straight in the CYPHR control room.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-md py-section md:px-xl">
        <form className="border border-line bg-paper-soft p-lg sm:p-xl" onSubmit={handleSubmit}>
          <div className="grid gap-sm sm:grid-cols-2" role="tablist" aria-label="Feedback type">
            {TYPES.map((option) => {
              const isActive = type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`border p-md text-left transition-colors ${
                    isActive ? "border-accent bg-accent/10" : "border-line bg-paper hover:border-accent"
                  }`}
                  onClick={() => setType(option.value)}
                >
                  <p className={`font-display text-title-md uppercase ${isActive ? "text-accent" : ""}`}>
                    {option.label}
                  </p>
                  <p className="mt-xs text-body-sm text-ink-muted">{option.hint}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-lg grid gap-md sm:grid-cols-2">
            <label className="block text-body-sm font-bold uppercase">
              Name
              <span className="font-normal normal-case text-ink-muted"> (optional)</span>
              <input
                autoComplete="name"
                className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                name="name"
                placeholder="Your name"
                maxLength={120}
              />
            </label>
            <label className="block text-body-sm font-bold uppercase">
              Email
              <span className="font-normal normal-case text-ink-muted"> (optional)</span>
              <input
                autoComplete="email"
                className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                name="email"
                type="email"
                placeholder="you@example.com"
                maxLength={120}
              />
            </label>
            <label className="block text-body-sm font-bold uppercase sm:col-span-2">
              Subject
              <input
                required
                className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                name="subject"
                placeholder={type === FeedbackType.DEMAND ? "e.g. Add a video battle mode" : "e.g. Loved the cypher flow"}
                minLength={3}
                maxLength={120}
              />
            </label>
            <label className="block text-body-sm font-bold uppercase sm:col-span-2">
              Message
              <textarea
                required
                className="mt-sm block min-h-40 w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
                name="message"
                placeholder={type === FeedbackType.DEMAND ? "What should we build — and why does the scene need it?" : "Tell us what worked, what broke, what should change."}
                maxLength={2000}
              />
              <span className="mt-xs block text-[0.65rem] font-normal normal-case text-ink-muted">
                Max 2000 characters.
              </span>
            </label>
          </div>

          {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}

          <button
            className="mt-lg w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending..." : type === FeedbackType.DEMAND ? "Raise demand" : "Send feedback"}
          </button>
        </form>
      </section>
    </main>
  );
}
