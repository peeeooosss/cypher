"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizePhone } from "@/lib/phone";

export function ArtistIdentityBox({
  needsName,
  needsPhone,
}: {
  needsName: boolean;
  needsPhone: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const payload: { name?: string; phone?: string } = {};
    if (needsName && !name.trim()) {
      setError("Add your artist name.");
      return;
    }
    if (needsName) {
      payload.name = name.trim();
    }
    if (needsPhone) {
      const normalized = normalizePhone(phone);
      if (!normalized) {
        setError("Enter a valid 10-digit mobile number.");
        return;
      }
      payload.phone = normalized;
    }

    setSaving(true);
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not save your details. Try again.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-section border border-line p-lg">
      <p className="font-display text-title-md uppercase">
        {needsName && needsPhone
          ? "Add your artist name and phone number"
          : needsName
            ? "Add your artist name"
            : "Add your phone number"}
      </p>
      <p className="mt-sm text-body-sm text-ink-muted">
        We need your name and a phone number to identify your entry. Filling this takes a
        second — your full battle profile can wait.
      </p>
      <form className="mt-lg max-w-md space-y-md" onSubmit={handleSubmit}>
        {needsName ? (
          <div>
            <label
              htmlFor="artist-identity-name"
              className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted"
            >
              Artist name
            </label>
            <input
              id="artist-identity-name"
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your stage name"
              maxLength={120}
              autoComplete="name"
            />
          </div>
        ) : null}
        {needsPhone ? (
          <div>
            <label
              htmlFor="artist-identity-phone"
              className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted"
            >
              Phone number
            </label>
            <input
              id="artist-identity-phone"
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              maxLength={16}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        ) : null}
        {error ? <p className="text-body-sm text-accent">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Saving…" : "Save & continue"}
        </button>
      </form>
    </div>
  );
}