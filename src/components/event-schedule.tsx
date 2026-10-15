"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/section-heading";

export type PublicScheduleItem = {
  id: string;
  title: string;
  startTime: Date | string;
  endTime: Date | string | null;
  description: string | null;
};

function dayKey(value: Date | string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function timeLabel(value: Date | string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isLiveNow(start: Date | string, end: Date | string | null, now: number) {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : s + 60 * 60 * 1000;
  return now >= s && now <= e;
}

export function EventSchedule({ items }: { items: PublicScheduleItem[] }) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (items.length === 0) return null;

  const days = new Map<string, { label: string; items: PublicScheduleItem[] }>();
  for (const item of items) {
    const key = dayKey(item.startTime);
    const group = days.get(key) ?? { label: dayLabel(item.startTime), items: [] };
    group.items.push(item);
    days.set(key, group);
  }

  return (
    <section id="schedule" aria-label="Schedule" className="scroll-mt-24">
      <SectionHeading
        eyebrow="Run of show"
        title="Schedule"
        description="Doors, check-ins, battles and finals — plan your day."
      />
      <div className="space-y-xl">
        {[...days.values()].map((day) => (
          <div key={day.label}>
            <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.2em] text-accent">
              {day.label}
            </p>
            <ol className="mt-md border-l-2 border-line pl-lg">
              {day.items.map((item) => {
                const live = isLiveNow(item.startTime, item.endTime, now);
                return (
                  <li key={item.id} className="relative mb-lg last:mb-0">
                    <span
                      className={`absolute -left-lg top-1.5 h-2.5 w-2.5 -translate-x-[5px] rounded-full ${
                        live ? "animate-pulse-soft bg-accent" : "bg-line-strong"
                      }`}
                    />
                    <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-ink-muted tabular-nums">
                      {timeLabel(item.startTime)}
                      {item.endTime ? ` – ${timeLabel(item.endTime)}` : ""}
                      {live ? <span className="ml-sm text-accent">· Happening now</span> : null}
                    </p>
                    <h3 className="mt-xs font-display text-title-md uppercase">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-xs max-w-prose text-body-sm leading-relaxed text-ink-muted">
                        {item.description}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
