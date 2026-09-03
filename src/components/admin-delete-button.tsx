"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { responseError } from "@/lib/client-error";

export function AdminDeleteButton({
  userId,
  apiPath,
  label = "Delete",
}: {
  userId: string;
  apiPath: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Permanently delete this account and all its data? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${apiPath}/${userId}`, {
        method: "DELETE",
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
        className="border border-accent px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent hover:bg-accent hover:text-paper disabled:opacity-60"
        disabled={busy}
        onClick={() => void remove()}
        type="button"
      >
        {busy ? "..." : label}
      </button>
      {error ? <span className="text-body-sm text-accent">{error}</span> : null}
    </div>
  );
}
