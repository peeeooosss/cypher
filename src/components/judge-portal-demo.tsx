"use client";

import { useState } from "react";
import { ScoringSectionGrid } from "@/components/scoring-section-grid";
import { EMPTY_SECTIONS, MAX_TOTAL, type SectionScores } from "@/lib/scoring-sections";

type DemoView = "battle" | "roster" | "leaderboard";

const DEMO_ENTRIES = [
  { id: "1", name: "Krish Bhakuni", seed: 7, crew: "Bombay Cypher" },
  { id: "2", name: "Sahil Kushwaha", seed: 12, crew: "Delhi Unit" },
  { id: "3", name: "Aarav Mehta", seed: 3, crew: "Pune Crew" },
  { id: "4", name: "Devansh Gupta", seed: 9, crew: "Gurgaon OG" },
  { id: "5", name: "Ishaan Verma", seed: 1, crew: "Jaipur Tribe" },
  { id: "6", name: "Rohan Singh", seed: 15, crew: "Agra Force" },
];

const DEMO_JUDGE_SCORES = [
  { judge: "Judge A", entry: "Krish Bhakuni", m: 4.5, f: 4.0, p: 4.5, e: 4.0, total: 17 },
  { judge: "Judge B", entry: "Krish Bhakuni", m: 4.0, f: 4.5, p: 4.0, e: 4.5, total: 17 },
  { judge: "Judge A", entry: "Sahil Kushwaha", m: 3.5, f: 4.0, p: 3.5, e: 3.5, total: 14.5 },
  { judge: "Judge B", entry: "Sahil Kushwaha", m: 4.0, f: 3.5, p: 3.5, e: 3.0, total: 14 },
];

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-xs border border-accent bg-accent px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.15em] text-paper">
      Interactive demo
    </span>
  );
}

function JudgePanel({ color }: { color: string }) {
  const [sections, setSections] = useState<SectionScores>({ ...EMPTY_SECTIONS });
  return (
    <ScoringSectionGrid
      value={sections}
      onChange={setSections}
      className={`flex-1 ${color}`}
    />
  );
}

export function JudgePortalDemo() {
  const [view, setView] = useState<DemoView>("battle");
  const [format, setFormat] = useState("SOLO");
  const [rosterDrafts, setRosterDrafts] = useState<Record<string, SectionScores>>({});

  return (
    <div className="mx-auto max-w-7xl px-md py-section md:px-xl">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">
            Judge portal — preview
          </p>
          <h1 className="mt-lg font-display text-display-xl uppercase leading-tight tracking-[-0.03em]">
            4-section scoring, live.
          </h1>
          <p className="mt-md max-w-2xl text-body-md text-ink-muted">
            Every entry is scored across <span className="text-accent">Musicality</span>,{" "}
            <span className="text-accent">Foundation</span>,{" "}
            <span className="text-accent">Presentation</span>, and{" "}
            <span className="text-accent">Execution</span> — 0 to 5 each in half-step
            increments (max {MAX_TOTAL}/side). Judges submit; standings sum live across the panel.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-lg flex flex-wrap items-center gap-md">
        <div className="flex flex-wrap gap-xs">
          {([
            ["battle", "Battle screen"],
            ["roster", "Cypher / qualifier"],
            ["leaderboard", "Leaderboard & artist view"],
          ] as [DemoView, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`border px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] transition-colors ${
                view === key
                  ? "border-accent bg-accent text-paper"
                  : "border-line text-ink-muted hover:border-accent hover:text-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-sm">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="border border-line bg-paper px-md py-sm font-mono text-[0.7rem] uppercase"
          >
            {["SOLO", "DUO", "CREW"].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>

      {view === "battle" ? (
        <div className="mt-section overflow-hidden border border-line">
          <div className="flex items-center justify-between border-b border-line bg-paper-soft px-md py-sm">
            <div>
              <p className="font-mono text-[0.7rem] uppercase text-accent">
                BREAKING · Round 2 · Match 4
              </p>
              <p className="font-display text-title-md uppercase">South Asia Masters — {format}</p>
            </div>
            <span className="flex items-center gap-sm font-mono text-[0.7rem] uppercase">
              LIVE <span className="h-2 w-2 rounded-full bg-accent" />
            </span>
          </div>
          <div className="grid lg:grid-cols-2">
            <div className="border-b border-line p-md lg:border-b-0 lg:border-r">
              <div className="mb-md flex items-center gap-md">
                <div className="flex h-14 w-14 items-center justify-center border-2 border-accent bg-paper-soft font-display text-display-md uppercase text-accent">
                  K
                </div>
                <div>
                  <p className="font-display text-display-md uppercase leading-none text-accent">Krish Bhakuni</p>
                  <p className="mt-xs font-mono text-body-sm uppercase text-ink-muted">Seed #7 / Bombay Cypher</p>
                </div>
              </div>
              <JudgePanel color="text-accent" />
            </div>
            <div className="p-md">
              <div className="mb-md flex items-center gap-md">
                <div className="flex h-14 w-14 items-center justify-center border-2 border-[#2980FF] bg-paper-soft font-display text-display-md uppercase text-[#2980FF]">
                  S
                </div>
                <div>
                  <p className="font-display text-display-md uppercase leading-none text-[#2980FF]">Sahil Kushwaha</p>
                  <p className="mt-xs font-mono text-body-sm uppercase text-ink-muted">Seed #12 / Delhi Unit</p>
                </div>
              </div>
              <JudgePanel color="text-[#2980FF]" />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-md border-t border-line bg-paper-soft px-md py-lg">
            <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
              2 judges · scores sum live
            </p>
            <button
              type="button"
              className="cursor-not-allowed border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper opacity-60"
            >
              Submit score
            </button>
          </div>
        </div>
      ) : view === "roster" ? (
        <div className="mt-section">
          <div className="mb-lg border border-line p-lg">
            <p className="font-display text-title-md uppercase">
              {format === "CREW" ? "Cypher scoring" : "Qualifier scoring"} — {format}
            </p>
            <p className="mt-xs text-body-sm text-ink-muted">
              Score each entry across 4 sections as they perform (0&ndash;5 each, max 20). Scores are summed across judges.
            </p>
          </div>
          <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
            {DEMO_ENTRIES.slice(0, format === "SOLO" ? 6 : 4).map((entry, index) => {
              const draft = rosterDrafts[entry.id] ?? { ...EMPTY_SECTIONS };
              return (
                <div key={entry.id} className="border border-line bg-paper-soft p-lg">
                  <div className="flex items-start justify-between gap-sm">
                    <div>
                      <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-xs font-display text-title-md uppercase">{entry.name}</p>
                      <p className="mt-xs text-body-sm text-ink-muted">Seed #{entry.seed} / {entry.crew}</p>
                    </div>
                  </div>
                  <div className="mt-lg">
                    <ScoringSectionGrid
                      value={draft}
                      onChange={(next) =>
                        setRosterDrafts((prev) => ({ ...prev, [entry.id]: next }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-section">
          <div className="overflow-hidden border border-line">
            <div className="flex flex-wrap items-center justify-between gap-sm border-b border-line bg-paper-soft px-md py-sm">
              <p className="font-display text-title-md uppercase">
                {format === "CREW" ? "Cypher result" : "Qualifier result"} — live leaderboard
              </p>
              <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                Section scores · summed across judges
              </p>
            </div>
            <div>
              {DEMO_ENTRIES.slice(0, format === "SOLO" ? 6 : 4)
                .map((entry, i) => ({
                  ...entry,
                  rank: i + 1,
                  total: 34 - i * 2,
                  judges: 2,
                }))
                .map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-md border-b border-line px-md py-sm"
                  >
                    <span className={`w-10 text-center font-mono text-display-lg font-bold ${row.rank === 1 ? "text-accent" : row.rank === 2 ? "text-ink" : "text-ink-muted"}`}>
                      {row.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-md font-bold uppercase">{row.name}</p>
                      <p className="text-[0.7rem] uppercase text-ink-muted">{row.crew} / Seed #{row.seed}</p>
                    </div>
                    <span className="font-mono text-title-md font-bold text-accent">{row.total}</span>
                    <span className="w-20 text-right text-xs uppercase text-ink-muted">{row.judges} judges</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-md overflow-hidden border border-line">
            <div className="bg-paper-soft px-md py-sm">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-muted">
                Artist view — per-judge, per-section breakdown
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem]">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[0.6rem] uppercase text-ink-muted">
                    <th className="px-md py-sm">Entry</th>
                    <th className="px-md py-sm">Judge</th>
                    <th className="px-md py-sm text-right">Musicality</th>
                    <th className="px-md py-sm text-right">Foundation</th>
                    <th className="px-md py-sm text-right">Presentation</th>
                    <th className="px-md py-sm text-right">Execution</th>
                    <th className="px-md py-sm text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_JUDGE_SCORES.map((s, i) => (
                    <tr key={i} className="border-b border-line">
                      <td className="px-md py-sm text-body-sm font-bold uppercase">{s.entry}</td>
                      <td className="px-md py-sm text-body-sm text-ink-muted">{s.judge}</td>
                      <td className="px-md py-sm text-right font-mono text-body-sm">{s.m.toFixed(1)}</td>
                      <td className="px-md py-sm text-right font-mono text-body-sm">{s.f.toFixed(1)}</td>
                      <td className="px-md py-sm text-right font-mono text-body-sm">{s.p.toFixed(1)}</td>
                      <td className="px-md py-sm text-right font-mono text-body-sm">{s.e.toFixed(1)}</td>
                      <td className="px-md py-sm text-right font-mono text-body-sm font-bold text-accent">{s.total.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
