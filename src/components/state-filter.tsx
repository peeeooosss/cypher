"use client";

import { INDIAN_STATES } from "@/lib/states";

export function StateFilter({ current, status, type }: { current: string; status?: string; type?: string }) {
  return (
    <form method="get" action="/events" className="flex min-w-0 flex-1 flex-wrap items-center gap-sm">
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {type ? <input type="hidden" name="type" value={type} /> : null}
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">State</span>
      <select
        name="state"
        className="min-w-0 max-w-[20rem] flex-1 border border-line bg-paper px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.submit()}
      >
        <option value="">All states</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </form>
  );
}
