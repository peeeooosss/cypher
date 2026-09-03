"use client";

import { useState } from "react";
import { formatLabel } from "@/lib/event-types";

type Invitation = {
  id: string;
  registration: {
    id: string;
    teamName: string | null;
    category: { name: string; format: string | null; event: { title: string; slug: string; startsAt: Date | string } };
    user: { name: string | null; username: string | null };
  };
};

export function TeamInvitations({ initialInvitations }: { initialInvitations: Invitation[] }) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function respond(invitation: Invitation, status: "ACCEPTED" | "DECLINED") {
    setBusy(invitation.id);
    setError("");
    try {
      const response = await fetch(`/api/registrations/${invitation.registration.id}/members/${invitation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      } else {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not update the invitation. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  if (invitations.length === 0) return null;

  return (
    <section className="mt-section border border-accent bg-paper-soft p-lg">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Team invitations</p>
      {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}
      <div className="mt-md space-y-sm">
        {invitations.map((invitation) => (
          <div className="flex flex-wrap items-center justify-between gap-md border border-line p-md" key={invitation.id}>
            <div>
              <p className="font-display text-title-md uppercase">{invitation.registration.teamName ?? invitation.registration.category.name}</p>
              <p className="mt-xs text-body-sm text-ink-muted">{invitation.registration.category.event.title} · invited by {invitation.registration.user.name ?? invitation.registration.user.username ?? "captain"}</p>
              <p className="mt-xs font-mono text-[0.65rem] uppercase text-accent">{formatLabel(invitation.registration.category.format)}</p>
            </div>
            <div className="flex gap-sm">
              <button className="border border-line px-md py-sm font-mono text-[0.65rem] font-bold uppercase hover:border-accent disabled:opacity-50" type="button" disabled={busy !== null} onClick={() => void respond(invitation, "DECLINED")}>Decline</button>
              <button className="border border-accent bg-accent px-md py-sm font-mono text-[0.65rem] font-bold uppercase text-paper disabled:opacity-50" type="button" disabled={busy !== null} onClick={() => void respond(invitation, "ACCEPTED")}>Accept</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
