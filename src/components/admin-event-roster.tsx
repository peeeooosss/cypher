"use client";

import { useEffect, useMemo, useState } from "react";
import { responseError } from "@/lib/client-error";
import { downloadRosterXlsx, paymentLabel, statusLabel } from "@/lib/registration-export";
import type { AdminRosterRow } from "@/lib/admin";

type RosterPayload = {
  event: { id: string; title: string; slug: string; status: string };
  rows: AdminRosterRow[];
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function AdminEventRoster({ eventId }: { eventId: string }) {
  const [data, setData] = useState<RosterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/events/${eventId}/registrations`);
        if (!res.ok) throw new Error(await responseError(res, "Failed to load roster"));
        const payload = (await res.json()) as RosterPayload;
        if (active) setData(payload);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load roster");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  const byCategory = useMemo(() => {
    const groups = new Map<string, AdminRosterRow[]>();
    for (const row of data?.rows ?? []) {
      const list = groups.get(row.categoryName) ?? [];
      list.push(row);
      groups.set(row.categoryName, list);
    }
    return [...groups.entries()];
  }, [data]);

  async function handleCopy(text: string, key: string) {
    const ok = await copyText(text);
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    }
  }

  function handleDownload() {
    if (!data || data.rows.length === 0) return;
    downloadRosterXlsx(data.rows, data.event.slug);
  }

  if (loading) {
    return <p className="mt-md border border-line p-lg text-ink-muted">Loading roster…</p>;
  }

  if (error || !data) {
    return <p className="mt-md border border-line p-lg text-accent">{error || "Failed to load roster."}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
          {data.rows.length} {data.rows.length === 1 ? "person" : "people"} · {byCategory.length}{" "}
          {byCategory.length === 1 ? "category" : "categories"}
        </p>
        <button
          type="button"
          disabled={data.rows.length === 0}
          onClick={handleDownload}
          className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.1em] text-paper disabled:opacity-50"
        >
          Download XLSX
        </button>
      </div>

      {byCategory.length === 0 ? (
        <p className="mt-md border border-line p-lg text-ink-muted">No registrations yet.</p>
      ) : null}

      {byCategory.map(([categoryName, rows]) => {
        const phones = rows.map((r) => r.phone).filter((p): p is string => Boolean(p));
        return (
          <section key={categoryName} className="mt-lg border border-line">
            <div className="flex flex-wrap items-center justify-between gap-sm border-b border-line bg-paper-soft px-lg py-md">
              <div>
                <h3 className="font-display text-title-md uppercase">{categoryName}</h3>
                <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
                  {rows.length} {rows.length === 1 ? "person" : "people"}
                </p>
              </div>
              <button
                type="button"
                disabled={phones.length === 0}
                onClick={() => void handleCopy(phones.join("\n"), `all-${categoryName}`)}
                className="border border-line px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {copied === `all-${categoryName}` ? "Copied ✓" : "Copy all numbers"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Name</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Phone</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Category</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Team</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Choreographer</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Address</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Email</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Age</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">City</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Music file</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Song link</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Registered</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Payment</th>
                    <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.registrationId}-${row.role}-${i}`} className="border-b border-line last:border-b-0">
                      <td className="px-md py-sm font-bold uppercase">
                        {row.name ?? "—"}
                        {row.username ? (
                          <span className="ml-sm font-mono text-[0.65rem] font-normal normal-case text-ink-muted">
                            @{row.username}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-md py-sm">
                        {row.phone ? (
                          <button
                            type="button"
                            title="Copy number"
                            onClick={() => void handleCopy(row.phone as string, `${row.registrationId}-${i}`)}
                            className="font-mono hover:text-accent hover:underline"
                          >
                            {copied === `${row.registrationId}-${i}` ? "Copied ✓" : row.phone}
                          </button>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-md py-sm">{row.categoryName}</td>
                      <td className="px-md py-sm">{row.teamName ?? "—"}</td>
                      <td className="px-md py-sm">{row.choreographerName ?? "—"}</td>
                      <td className="px-md py-sm">{row.address ?? "—"}</td>
                      <td className="px-md py-sm">{row.email ?? "—"}</td>
                      <td className="px-md py-sm">{row.age ?? "—"}</td>
                      <td className="px-md py-sm">{row.auditionCity ?? "—"}</td>
                      <td className="px-md py-sm text-[0.7rem]">{row.musicFileName ?? "—"}</td>
                      <td className="px-md py-sm">
                        {row.musicFileUrl ? (
                          <a
                            className="font-mono text-[0.7rem] text-accent hover:underline"
                            href={row.musicFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={row.musicFileUrl}
                          >
                            Open song
                          </a>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-md py-sm font-mono text-[0.65rem] uppercase text-ink-muted">{row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                      <td className="px-md py-sm">
                        {row.paid ? (
                          <span className="font-mono text-[0.7rem] uppercase">{paymentLabel(row)}</span>
                        ) : (
                          <span className="font-mono text-[0.7rem] uppercase text-accent">Unpaid</span>
                        )}
                      </td>
                      <td className="px-md py-sm font-mono text-[0.65rem] uppercase text-ink-muted">
                        {statusLabel(row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
