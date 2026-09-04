"use client";

import {
  MAX_SECTION,
  MAX_TOTAL,
  SCORING_SECTIONS,
  SECTION_VALUES,
  STEP,
  sectionTotal,
  type SectionScores,
} from "@/lib/scoring-sections";

export function ScoringSectionGrid({
  value,
  onChange,
  className = "",
}: {
  value: SectionScores;
  onChange: (next: SectionScores) => void;
  className?: string;
}) {
  const total = sectionTotal(value);

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
          Score by section
        </p>
        <span className="font-mono text-body-sm font-bold text-accent">
          {total.toFixed(1)}/{MAX_TOTAL}
        </span>
      </div>

      <div className="mt-sm space-y-sm">
        {SCORING_SECTIONS.map((section) => {
          const current = value[section];
          const filled = Math.round(current / STEP);
          return (
            <div key={section} className="grid grid-cols-[1fr_auto] items-center gap-sm">
              <div className="flex items-center gap-xs">
                <span className="w-28 shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink">
                  {section}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: MAX_SECTION * 2 }).map((_, i) => {
                    const idx = i + 1;
                    const isFilled = idx <= filled;
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-label={`${section} ${idx * STEP}`}
                        className={`h-4 w-2 rounded-[2px] border transition-colors ${
                          isFilled ? "border-accent bg-accent" : "border-line bg-paper"
                        }`}
                        onClick={() =>
                          onChange({ ...value, [section]: idx * STEP })
                        }
                      />
                    );
                  })}
                </div>
              </div>
              <select
                aria-label={`${section} value`}
                value={current}
                onChange={(e) =>
                  onChange({ ...value, [section]: Number(e.target.value) })
                }
                className="border border-line bg-paper px-xs py-xs font-mono text-body-sm"
              >
                {SECTION_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v.toFixed(1)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
