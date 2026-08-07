"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminArtistActions({ userId, isSuspended, gigWorkEnabled }: { userId: string; isSuspended: boolean; gigWorkEnabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function run(action: "suspend" | "unsuspend" | "gig-on" | "gig-off") {
    setBusy(action);
    setError("");
    const body: Record<string, boolean> = {};
    if (action === "suspend") body.isSuspended = true;
    if (action === "unsuspend") body.isSuspended = false;
    if (action === "gig-on") body.gigWorkEnabled = true;
    if (action === "gig-off") body.gigWorkEnabled = false;
    const res = await fetch(`/api/admin/artists/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy("");
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  const buttonBase = "border px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-sm">
      <button
        className={`${buttonBase} ${
          isSuspended ? "border-accent bg-accent text-paper" : "border-line text-ink hover:border-accent hover:text-accent"
        }`}
        disabled={busy !== ""}
        onClick={() => void run(isSuspended ? "unsuspend" : "suspend")}
        type="button"
      >
        {busy === "suspend" || busy === "unsuspend" ? "..." : isSuspended ? "Unsuspend" : "Suspend"}
      </button>
      <button
        className={`${buttonBase} ${
          gigWorkEnabled ? "border-line text-ink hover:border-accent hover:text-accent" : "border-accent bg-accent text-paper"
        }`}
        disabled={busy !== ""}
        onClick={() => void run(gigWorkEnabled ? "gig-off" : "gig-on")}
        type="button"
      >
        {busy === "gig-on" || busy === "gig-off" ? "..." : gigWorkEnabled ? "Disable gig work" : "Enable gig work"}
      </button>
      {error ? <span className="text-body-sm text-accent">{error}</span> : null}
    </div>
  );
}
