"use client";

import { useState } from "react";

export type GuideStep = {
  title: string;
  text: string;
};

export type GuideTab = {
  id: string;
  label: string;
  steps: GuideStep[];
  note?: string;
};

export function StepGuide({ tabs }: { tabs: GuideTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  if (!active) return null;

  return (
    <div className="mt-lg">
      <div className="flex flex-wrap gap-sm" role="tablist" aria-label="Guide topics">
        {tabs.map((tab) => {
          const isActive = active.id === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={`border px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.1em] transition-colors ${
                isActive
                  ? "border-accent bg-accent text-paper"
                  : "border-line bg-paper text-ink-muted hover:border-accent hover:text-accent"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-lg border border-line bg-paper-soft p-lg sm:p-xl">
        {active.steps.length > 0 ? (
          <ol className="space-y-lg">
            {active.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-md">
                <span className="shrink-0 font-mono text-body-sm text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-title-md uppercase">{step.title}</h3>
                  <p className="mt-xs text-body-sm leading-relaxed text-ink-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
        {active.note ? (
          <p className="mt-lg border-t border-line pt-lg text-body-sm leading-relaxed text-ink-muted">
            {active.note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
