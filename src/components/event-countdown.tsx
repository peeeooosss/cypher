"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function EventCountdown({ startsAt }: { startsAt: Date | string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const diff = new Date(startsAt).getTime() - now;
  if (diff <= 0) return null;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  const units = [
    { value: String(days), label: "days" },
    { value: pad(hours), label: "hrs" },
    { value: pad(minutes), label: "min" },
  ];

  return (
    <div className="flex items-center gap-sm" aria-label="Countdown to event">
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted">
        Starts in
      </span>
      <div className="flex items-stretch gap-xs">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="min-w-14 border border-line bg-paper px-sm py-xs text-center"
          >
            <p className="font-display text-title-md font-semibold tabular-nums leading-none">
              {unit.value}
            </p>
            <p className="mt-xs font-mono text-[0.55rem] uppercase tracking-[0.2em] text-ink-muted">
              {unit.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
