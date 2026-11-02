"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { responseError } from "@/lib/client-error";

export function AdminAddArtistForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const phoneClean = phone.replace(/\D/g, "");
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (phoneClean.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          phone: phoneClean,
          password,
        }),
      });

      if (!res.ok) {
        setError(await responseError(res, "Failed to add artist."));
        setIsSubmitting(false);
        return;
      }

      setSuccess("Artist added successfully.");
      setUsername("");
      setPhone("");
      setPassword("");
      setIsSubmitting(false);
      router.refresh();
    } catch {
      setError("Failed to add artist.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mb-lg border border-line bg-paper-soft p-lg">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Add Artist</p>
      <form className="mt-md grid gap-md sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="block text-body-sm font-bold uppercase">
          Username *
          <input
            required
            className="mt-xs block w-full border border-line bg-paper px-md py-sm text-body-md outline-none focus:border-accent"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="block text-body-sm font-bold uppercase">
          Phone number *
          <input
            required
            inputMode="numeric"
            maxLength={10}
            pattern="[0-9]{10}"
            className="mt-xs block w-full border border-line bg-paper px-md py-sm text-body-md outline-none focus:border-accent"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <label className="block text-body-sm font-bold uppercase sm:col-span-2">
          Password *
          <input
            required
            type="password"
            minLength={8}
            className="mt-xs block w-full border border-line bg-paper px-md py-sm text-body-md outline-none focus:border-accent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="text-body-sm text-accent sm:col-span-2">{error}</p> : null}
        {success ? <p className="text-body-sm text-accent sm:col-span-2">{success}</p> : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
          >
            {isSubmitting ? "Adding..." : "Add Artist"}
          </button>
        </div>
      </form>
    </section>
  );
}
