"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegistrationButton({ categoryId, registered }: { categoryId: string; registered: boolean }) {
  const router = useRouter();
  const [isRegistered, setIsRegistered] = useState(registered);
  const [error, setError] = useState("");

  async function register() {
    setError("");
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to register.");
      return;
    }

    setIsRegistered(true);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start gap-xs">
      <button className="border border-accent px-sm py-xs text-body-sm font-bold uppercase text-accent disabled:opacity-60" disabled={isRegistered} onClick={register} type="button">
        {isRegistered ? "Registered" : "Enter"}
      </button>
      {error ? <span className="text-[0.7rem] text-accent">{error}</span> : null}
    </span>
  );
}
