"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { responseError } from "@/lib/client-error";

type StaffCode = {
  id: string;
  label: string;
  role: string;
  codeHint: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

type PhaseInfo = {
  id: string;
  order: number;
  type: string;
  label: string | null;
  advanceCount: number | null;
  matchSize?: number | null;
  phaseStatus: string | null;
};

type CategoryInfo = {
  id: string;
  name: string;
  currentPhaseOrder: number | null;
  rounds: PhaseInfo[];
};

export function StaffCodesTab({
  eventId,
  eventTitle,
  eventStartsAt,
  categories,
}: {
  eventId: string;
  eventTitle: string;
  eventStartsAt: Date;
  categories: CategoryInfo[];
}) {
  const { toast } = useToast();
  const [codes, setCodes] = useState<StaffCode[]>([]);
  const [label, setLabel] = useState("");
  const [role, setRole] = useState("MC");
  const [creating, setCreating] = useState(false);
  const [freshCode, setFreshCode] = useState<{ code: string; label: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/staff-codes`);
      if (res.ok) setCodes(await res.json());
    } catch {
      // Best-effort refresh; the tab keeps working offline-ish.
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${eventId}/staff-codes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setCodes(data);
      })
      .catch(() => {
        // Best-effort; the tab keeps working.
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function create() {
    if (!label.trim()) {
      toast("Name the code first (e.g. Stage MC)", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/events/${eventId}/staff-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), role }),
      });
      if (!res.ok) {
        toast(await responseError(res, "Failed to create code"), "error");
        return;
      }
      const body = (await res.json()) as StaffCode & { code: string };
      setFreshCode({ code: body.code, label: body.label });
      setLabel("");
      toast("Code created — share it now, it won't be shown again", "success");
      await load();
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setCreating(false);
    }
  }

  async function toggle(code: StaffCode) {
    setBusy(code.id);
    try {
      const res = await fetch(`/api/events/${eventId}/staff-codes/${code.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !code.isActive }),
      });
      if (!res.ok) {
        toast(await responseError(res, "Failed to update code"), "error");
        return;
      }
      toast(code.isActive ? "Code revoked" : "Code reactivated", "success");
      await load();
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove(code: StaffCode) {
    if (!window.confirm(`Delete the "${code.label}" code permanently? Anyone using it loses portal access.`)) return;
    setBusy(code.id);
    try {
      const res = await fetch(`/api/events/${eventId}/staff-codes/${code.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast(await responseError(res, "Failed to delete code"), "error");
        return;
      }
      toast("Code deleted", "success");
      await load();
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  function runningOrderText(): string {
    const lines = [
      `MC / HOST — ${eventTitle}`,
      `RUNNING ORDER · ${new Date(eventStartsAt).toLocaleString()}`,
      "",
    ];
    categories.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}`);
      [...c.rounds]
        .sort((a, b) => a.order - b.order)
        .forEach((r) => {
          const active = c.currentPhaseOrder === r.order && r.phaseStatus === "ACTIVE" ? "  [ON NOW]" : "";
          const top = r.advanceCount != null ? `Top ${r.advanceCount}` : "no cut set";
          lines.push(`   - ${r.label ?? r.type} (${r.type}${r.matchSize === 3 ? ", 3-way" : ""}, ${top})${active}`);
        });
    });
    lines.push("", "Call names in order. Good luck — hold the circle.");
    return lines.join("\n");
  }

  async function copyText(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(done, "success");
    } catch {
      toast("Could not copy — select the text manually", "error");
    }
  }

  return (
    <div className="space-y-xl">
      {freshCode ? (
        <div className="rounded-lg border border-accent bg-accent/10 p-lg break-words" role="alert">
          <p className="font-display text-title-md uppercase text-accent">Share this code now</p>
          <p className="mt-xs text-body-sm text-ink-muted">
            “{freshCode.label}” — it is shown once. Send it to your MC/Host on WhatsApp, or have
            them open <span className="font-mono">/mc/{freshCode.code}</span>.
          </p>
          <p className="mt-md break-all text-center font-mono text-display-sm tracking-[0.15em] sm:text-display-md">
            {freshCode.code}
          </p>
          <div className="mt-md flex flex-wrap justify-center gap-sm">
            <Button size="sm" onClick={() => void copyText(freshCode.code, "Code copied")}>
              Copy code
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Your CYPHR MC/Host code for ${eventTitle}: ${freshCode.code} — open ${(typeof window !== "undefined" ? window.location.origin : "")}/mc/${freshCode.code}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-md border border-line-strong px-3 text-button-sm text-ink transition-colors hover:border-accent hover:text-accent"
            >
              WhatsApp it
            </a>
            <Button size="sm" variant="ghost" onClick={() => setFreshCode(null)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}

      <div className="border border-line p-lg">
        <p className="font-display text-title-md uppercase tracking-wide">New MC / Host code</p>
        <div className="mt-md grid gap-md md:grid-cols-[1fr_160px_auto]">
          <div>
            <Label htmlFor="staff-label">Label</Label>
            <Input
              id="staff-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Stage MC, Host — Finals…"
            />
          </div>
          <div>
            <Label htmlFor="staff-role">Role</Label>
            <Select id="staff-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="MC">MC</option>
              <option value="HOST">HOST</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => void create()} loading={creating}>
              Generate
            </Button>
          </div>
        </div>
        <p className="mt-sm text-body-sm text-ink-muted">
          Codes are event-scoped and login-free: the MC/Host opens the portal, runs battles, and
          calls names. Revoke anytime to cut access instantly.
        </p>
      </div>

      <div className="border border-line p-lg">
        <p className="font-display text-title-md uppercase tracking-wide">Active codes ({codes.length})</p>
        {codes.length === 0 ? (
          <div className="mt-md">
            <EmptyState title="No codes yet" description="Generate the first code above for your MC or Host." />
          </div>
        ) : (
          <ul className="mt-md space-y-sm">
            {codes.map((code) => (
              <li
                key={code.id}
                className="flex flex-wrap items-center justify-between gap-sm rounded-md border border-line bg-paper px-md py-sm"
              >
                <div className="min-w-0">
                  <p className="font-display text-body-md uppercase">
                    {code.label}{" "}
                    <span className="font-mono text-[0.65rem] text-ink-muted">···{code.codeHint}</span>
                  </p>
                  <p className="mt-px text-body-sm text-ink-muted">
                    {code.lastUsedAt ? `Last used ${new Date(code.lastUsedAt).toLocaleString()}` : "Never used yet"}
                  </p>
                </div>
                <div className="flex items-center gap-sm">
                  <Badge tone={code.isActive ? "success" : "neutral"}>{code.role}</Badge>
                  <Badge tone={code.isActive ? "accent" : "neutral"}>
                    {code.isActive ? "Active" : "Revoked"}
                  </Badge>
                  <Button size="sm" variant="secondary" disabled={busy === code.id} onClick={() => void toggle(code)}>
                    {code.isActive ? "Revoke" : "Reactivate"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === code.id} onClick={() => void remove(code)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-line p-lg">
        <div className="flex flex-col gap-md sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-display text-title-md uppercase tracking-wide">Running order</p>
            <p className="mt-xs text-body-sm text-ink-muted">
              Every category and phase in calling order — send this to your HOST so names get
              called right.
            </p>
          </div>
          <div className="flex flex-wrap gap-sm">
            <Button size="sm" variant="secondary" onClick={() => void copyText(runningOrderText(), "Running order copied")}>
              Copy
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(runningOrderText())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-md border border-line-strong px-3 text-button-sm text-ink transition-colors hover:border-accent hover:text-accent"
            >
              WhatsApp
            </a>
          </div>
        </div>
        <pre className="mt-md overflow-x-auto whitespace-pre-wrap rounded-md border border-line bg-paper px-md py-sm font-mono text-body-sm text-ink">
          {runningOrderText()}
        </pre>
      </div>
    </div>
  );
}
