"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { responseError } from "@/lib/client-error";

export function AdminSuspendButton({ userId, isSuspended }: { userId: string; isSuspended: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/organizers/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: !isSuspended }),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed"));
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-sm">
      <button
        className={`border px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] disabled:opacity-60 ${
          isSuspended
            ? "border-accent bg-accent text-paper"
            : "border-line text-ink hover:border-accent hover:text-accent"
        }`}
        disabled={busy}
        onClick={() => void toggle()}
        type="button"
      >
        {busy ? "..." : isSuspended ? "Unsuspend" : "Suspend"}
      </button>
      {error ? <span className="text-body-sm text-accent">{error}</span> : null}
    </div>
  );
}
