"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Role = "ORGANIZER" | "ARTIST";

const ARTIST_PROFILE_FIELDS = [
  { name: "style", label: "Style", placeholder: "e.g. Popping, Breaking", required: true },
  { name: "crew", label: "Crew", placeholder: "e.g. Soul Mechanics (optional)", required: false },
  { name: "city", label: "City", placeholder: "e.g. Guwahati", required: true },
  { name: "country", label: "Country", placeholder: "e.g. India", required: true },
  { name: "experience", label: "Experience", placeholder: "e.g. PRO, ADVANCED, INTERMEDIATE", required: true },
  { name: "socialHandle", label: "Social handle", placeholder: "@yourname", required: true },
  { name: "referral", label: "How did you hear about us?", placeholder: "e.g. Instagram, Friend (optional)", required: false },
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("ARTIST");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    const body: Record<string, unknown> = {
      name: formData.get("name"),
      email,
      password,
      role,
    };

    if (role === "ARTIST") {
      for (const field of ARTIST_PROFILE_FIELDS) {
        const value = String(formData.get(field.name) ?? "").trim();
        if (value) body[field.name] = value;
      }
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

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push(role === "ARTIST" ? "/artist" : "/organizer");
      router.refresh();
    } else {
      router.push("/login?signup=success");
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
            Email
            <input
              required
              autoComplete="email"
              className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
              name="email"
              type="email"
            />
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

          <button
            className="w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

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
