"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { responseError } from "@/lib/client-error";

export function AdminCredentialsForm({
  userId,
  apiPath,
  roleLabel,
  phone,
  password,
}: {
  userId: string;
  apiPath: string;
  roleLabel: string;
  phone: string | null;
  password: string | null;
}) {
  const router = useRouter();
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [passwordValue, setPasswordValue] = useState(password ?? "");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");

    const phoneDigits = phoneValue.replace(/\D/g, "");
    const body: Record<string, unknown> = {};
    if (phoneDigits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      setBusy(false);
      return;
    }
    body.phone = phoneDigits;
    if (passwordValue.length >= 8) {
      body.password = passwordValue;
    }

    try {
      const res = await fetch(`${apiPath}/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to update"));
        return;
      }
      setNotice("Saved.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-md border border-line bg-paper-soft p-lg">
      <h3 className="font-display text-title-md uppercase">Phone &amp; password</h3>
      <p className="mt-xs text-body-sm text-ink-muted">
        Update the {roleLabel}&apos;s sign-in phone number or password. The phone may be shared with a profile of the other role.
      </p>

      <div className="mt-md grid gap-sm sm:grid-cols-2">
        <label className="block w-full text-body-sm font-bold uppercase">
          Phone number
          <input
            className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
            inputMode="numeric"
            maxLength={10}
            onChange={(event) => setPhoneValue(event.target.value)}
            pattern="[0-9]{10}"
            value={phoneValue}
          />
        </label>
        <label className="block w-full text-body-sm font-bold uppercase">
          Password
          <input
            className="mt-sm block w-full border border-line bg-paper px-md py-md text-body-md outline-none focus:border-accent"
            minLength={8}
            onChange={(event) => setPasswordValue(event.target.value)}
            placeholder={passwordValue.length >= 8 ? "" : "Set a new password"}
            type={show ? "text" : "password"}
            value={passwordValue}
          />
        </label>
      </div>

      <div className="mt-md flex items-center gap-md">
        <button
          className="border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-wait disabled:opacity-60"
          disabled={busy}
          onClick={() => void save()}
          type="button"
        >
          {busy ? "Saving..." : "Save"}
        </button>
        <button
          className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
          onClick={() => setShow((current) => !current)}
          type="button"
        >
          {show ? "Hide" : "Show"} password
        </button>
        {notice ? <span className="text-body-sm text-ink">{notice}</span> : null}
      </div>

      {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
    </div>
  );
}