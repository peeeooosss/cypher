"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FeedbackStatus } from "@/generated/prisma/enums";

export function FeedbackStatusActions({
  id,
  current,
}: {
  id: string;
  current: FeedbackStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(status: FeedbackStatus) {
    if (status === current) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to update");
      return;
    }
    router.refresh();
  }

  const options: FeedbackStatus[] = [
    FeedbackStatus.NEW,
    FeedbackStatus.READ,
    FeedbackStatus.IN_PROGRESS,
    FeedbackStatus.COMPLETED,
    FeedbackStatus.REJECTED,
  ];

  return (
    <div className="flex flex-col items-start gap-sm">
      <div className="flex flex-wrap gap-xs">
        {options.map((status) => (
          <button
            key={status}
            type="button"
            className={`border px-md py-xs font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] disabled:opacity-60 ${
              status === current
                ? "border-accent bg-accent text-paper"
                : "border-line text-ink hover:border-accent hover:text-accent"
            }`}
            disabled={busy}
            onClick={() => void setStatus(status)}
          >
            {status === current ? "✓ " : ""}
            {status.toLowerCase()}
          </button>
        ))}
      </div>
      {error ? <span className="text-body-sm text-accent">{error}</span> : null}
    </div>
  );
}
