"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { responseError } from "@/lib/client-error";

type Candidate = {
  id: string;
  seed: number | null;
  name: string;
  crew: string | null;
  total: number;
  judgeCount: number;
};

type AuditRow = {
  id: string;
  action: string;
  advanceCount: number | null;
  winnerIds: string[];
  changedBy: string | null;
  reason: string | null;
  createdAt: string;
};

const PRESETS = [4, 8, 16, 20, 32];

const ACTION_LABELS: Record<string, string> = {
  TOP_N_SET: "Top-N changed",
  TOP_UP: "Entries brought back",
  PHASE_ADVANCED: "Phase advanced",
  BRACKET_REBUILT: "Bracket rebuilt",
  LANES_EDITED: "Lanes edited",
  MATCH_DELETED: "Match deleted",
};

export function AdvancementStudio({
  categoryId,
  categoryName,
  roundId,
  phaseLabel,
  advanceCount,
  onChanged,
}: {
  categoryId: string;
  categoryName: string;
  roundId: string;
  phaseLabel: string;
  advanceCount: number | null;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [topN, setTopN] = useState(advanceCount?.toString() ?? "");
  const [savingN, setSavingN] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [toppingUp, setToppingUp] = useState(false);
  const [audit, setAudit] = useState<AuditRow[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        fetch(`/api/categories/${categoryId}/top-up`),
        fetch(`/api/categories/${categoryId}/advancement-audit`),
      ]);
      if (cRes.ok) setCandidates(await cRes.json());
      if (aRes.ok) setAudit(await aRes.json());
    } catch {
      // Best effort; studio stays usable.
    }
  }, [categoryId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/categories/${categoryId}/top-up`),
      fetch(`/api/categories/${categoryId}/advancement-audit`),
    ])
      .then(async ([cRes, aRes]) => {
        if (cancelled) return;
        if (cRes.ok) setCandidates(await cRes.json());
        if (aRes.ok) setAudit(await aRes.json());
      })
      .catch(() => {
        // Best effort; studio stays usable.
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  async function saveTopN() {
    const n = Number(topN);
    if (!Number.isInteger(n) || n < 1 || n > 512) {
      toast("Top-N must be a whole number between 1 and 512", "error");
      return;
    }
    setSavingN(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advanceCount: n }),
      });
      if (!res.ok) {
        toast(await responseError(res, "Failed to set Top-N"), "error");
        return;
      }
      toast(`Top-N set to ${n} for ${phaseLabel}`, "success");
      onChanged();
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setSavingN(false);
    }
  }

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function topUp() {
    if (picked.size === 0) {
      toast("Tick the entries to bring back", "error");
      return;
    }
    setToppingUp(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}/top-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationIds: [...picked] }),
      });
      if (!res.ok) {
        toast(await responseError(res, "Failed to bring entries back"), "error");
        return;
      }
      const body = (await res.json()) as { confirmedCount: number };
      setPicked(new Set());
      toast(`Brought back — ${body.confirmedCount} confirmed now. Rebuild the bracket to seat them.`, "success");
      await load();
      onChanged();
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setToppingUp(false);
    }
  }

  return (
    <div className="mt-lg rounded-lg border border-accent/40 bg-accent/[0.04] p-md sm:p-lg">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <p className="font-display text-title-sm uppercase tracking-wide">
          Advancement studio <span className="text-ink-muted">· {phaseLabel}</span>
        </p>
        <Badge tone="accent">{advanceCount != null ? `Top ${advanceCount}` : "No cut set"}</Badge>
      </div>

      <div className="mt-md grid gap-md lg:grid-cols-2">
        <div>
          <Label htmlFor={`topn-${roundId}`}>Top-N cut</Label>
          <div className="flex flex-wrap items-center gap-sm">
            <Input
              id={`topn-${roundId}`}
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              placeholder="e.g. 20"
              inputMode="numeric"
              className="h-9 w-24 text-center"
            />
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTopN(String(p))}
                className={`cursor-pointer rounded border px-2 py-1 font-mono text-[0.65rem] font-bold uppercase transition-colors ${
                  topN === String(p)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-ink-muted hover:border-accent hover:text-accent"
                }`}
              >
                {p}
              </button>
            ))}
            <Button size="sm" loading={savingN} onClick={() => void saveTopN()}>
              Set cut
            </Button>
          </div>
          <p className="mt-2 text-body-sm text-ink-muted">
            Change the cut anytime — judges ask for TOP 20 instead of 16? Set 20, bring back
            ranks 17–20 below, rebuild the bracket.
          </p>
        </div>

        <div>
          <p className="mb-1.5 block text-body-sm font-semibold text-ink">
            Bring back withdrawn ({candidates?.length ?? "…"})
          </p>
          {candidates === null ? (
            <ListSkeleton rows={2} />
          ) : candidates.length === 0 ? (
            <p className="text-body-sm text-ink-muted">Nobody withdrawn — nothing to bring back.</p>
          ) : (
            <>
              <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {candidates.map((c, i) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-sm rounded border border-line bg-paper px-sm py-1.5 text-body-sm">
                      <input
                        type="checkbox"
                        checked={picked.has(c.id)}
                        onChange={() => togglePick(c.id)}
                        className="border border-line bg-paper"
                      />
                      <span className="w-7 shrink-0 text-right font-mono text-xs text-ink-muted">#{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {c.name}
                        {c.seed != null ? <span className="text-ink-muted"> · seed {c.seed}</span> : ""}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-accent">
                        {c.judgeCount > 0 ? c.total : "—"}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="secondary" loading={toppingUp} onClick={() => void topUp()} className="mt-2">
                Bring back selected ({picked.size})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-md border-t border-line pt-md">
        <p className="text-body-xs font-bold uppercase tracking-[0.2em] text-ink-muted">
          Advancement trail — {categoryName}
        </p>
        {audit === null ? (
          <ListSkeleton rows={2} />
        ) : audit.length === 0 ? (
          <p className="mt-2 text-body-sm text-ink-muted">No advancement actions recorded yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {audit.slice(0, 8).map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
                <Badge>{ACTION_LABELS[row.action] ?? row.action}</Badge>
                <span className="text-ink-muted">
                  {new Date(row.createdAt).toLocaleString()}
                  {row.advanceCount != null ? ` · Top ${row.advanceCount}` : ""}
                  {row.winnerIds.length > 0 && row.action !== "TOP_UP" ? ` · ${row.winnerIds.length} through` : ""}
                  {row.action === "TOP_UP" ? ` · ${row.winnerIds.length} back` : ""}
                </span>
                {row.reason ? <span className="w-full text-ink-muted">“{row.reason}”</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
