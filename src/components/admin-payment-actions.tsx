"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { responseError } from "@/lib/client-error";

export function AdminPaymentActions({
  id,
  status,
  type = "FLAT_FEE",
  scope = "event",
}: {
  id: string;
  status: "PENDING" | "VERIFIED" | "NONE";
  type?: "FLAT_FEE" | "COMMISSION" | "GIG" | "GIG_POST" | "GIG_CONNECTION";
  scope?: "event" | "gig-work" | "gig-post" | "gig-connection";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function run(action: "verify" | "reopen") {
    setBusy(action);
    setError("");
    const base =
      scope === "gig-work"
        ? "/api/admin/gig-work"
        : scope === "gig-post"
          ? "/api/admin/gigs"
          : scope === "gig-connection"
            ? "/api/admin/gig-connection"
            : "/api/admin/payments";
    try {
      const res = await fetch(`${base}/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed"));
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex items-center gap-sm">
      {status === "PENDING" ? (
        <button
          className="border border-accent bg-accent px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
          disabled={busy !== ""}
          onClick={() => void run("verify")}
          type="button"
        >
          {busy === "verify" ? "..." : "Verify"}
        </button>
      ) : null}
      {status === "VERIFIED" ? (
        <button
          className="border border-line px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink hover:border-accent hover:text-accent disabled:opacity-60"
          disabled={busy !== ""}
          onClick={() => void run("reopen")}
          type="button"
        >
          {busy === "reopen" ? "..." : "Reopen"}
        </button>
      ) : null}
      {error ? <span className="text-body-sm text-accent">{error}</span> : null}
    </div>
  );
}
