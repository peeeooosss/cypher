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

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-xs border border-accent bg-accent px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.15em] text-paper">
      Interactive demo
    </span>
  );
}

function DemoVoteButton({
  label,
  name,
  tone,
  selected,
  onSelect,
}: {
  label: string;
  name: string;
  tone: "red" | "blue";
  selected: boolean;
  onSelect: () => void;
}) {
  const isRed = tone === "red";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full border-2 px-md py-lg text-center font-display uppercase transition-colors",
        isRed ? "border-accent" : "border-[#2980FF]",
        selected
          ? isRed
            ? "bg-accent text-paper"
            : "bg-[#2980FF] text-paper"
          : isRed
            ? "text-accent hover:bg-accent/10"
            : "text-[#2980FF] hover:bg-[#2980FF]/10",
      ].join(" ")}
    >
      <span className="block text-button-md leading-tight">{label}</span>
      <span className="mt-xs block break-words text-body-sm font-bold normal-case">{name}</span>
    </button>
  );
}

export function JudgePortalDemo() {
  const [view, setView] = useState<DemoView>("battle");
  const [format, setFormat] = useState("SOLO");
  const [rosterDrafts, setRosterDrafts] = useState<Record<string, SectionScores>>({});
  const [demoVote, setDemoVote] = useState<"RED" | "BLUE" | null>(null);

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
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-accent bg-paper-soft font-display text-display-md uppercase text-accent">
                  K
                </div>
                <div className="min-w-0">
                  <p className="break-words font-display text-display-md uppercase leading-none text-accent">Krish Bhakuni</p>
                  <p className="mt-xs break-words font-mono text-body-sm uppercase text-ink-muted">Seed #7 / Bombay Cypher</p>
                </div>
              </div>
              <DemoVoteButton
                label="Vote red"
                name="Krish Bhakuni"
                tone="red"
                selected={demoVote === "RED"}
                onSelect={() => setDemoVote("RED")}
              />
            </div>
            <div className="p-md">
              <div className="mb-md flex items-center gap-md">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-[#2980FF] bg-paper-soft font-display text-display-md uppercase text-[#2980FF]">
                  S
                </div>
                <div className="min-w-0">
                  <p className="break-words font-display text-display-md uppercase leading-none text-[#2980FF]">Sahil Kushwaha</p>
                  <p className="mt-xs break-words font-mono text-body-sm uppercase text-ink-muted">Seed #12 / Delhi Unit</p>
                </div>
              </div>
              <DemoVoteButton
                label="Vote blue"
                name="Sahil Kushwaha"
                tone="blue"
                selected={demoVote === "BLUE"}
                onSelect={() => setDemoVote("BLUE")}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-md border-t border-line bg-paper-soft px-md py-lg">
            <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
              {demoVote ? "Red 2 · Blue 1 · 3 judges voted" : "3 judges voted · pick a side"}
            </p>
            <button
              type="button"
              disabled={!demoVote}
              onClick={() => setDemoVote(null)}
              className={`border border-accent px-lg py-md text-button-md font-bold uppercase ${
                demoVote ? "bg-accent text-paper" : "cursor-not-allowed border-line text-ink-muted opacity-60"
              }`}
            >
              {demoVote ? "Vote submitted" : "Submit vote"}
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
                    className="flex items-center gap-sm border-b border-line px-md py-sm"
                  >
                    <span className={`w-8 shrink-0 text-center font-mono text-title-md font-bold ${row.rank === 1 ? "text-accent" : row.rank === 2 ? "text-ink" : "text-ink-muted"}`}>
                      {row.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-body-md font-bold uppercase leading-tight md:truncate">{row.name}</p>
                      <p className="break-words text-[0.7rem] uppercase leading-snug text-ink-muted md:truncate">
                        {row.crew} / Seed #{row.seed}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-title-md font-bold text-accent">{row.total}</span>
                    <span className="hidden w-20 shrink-0 text-right text-xs uppercase text-ink-muted sm:block">
                      {row.judges} judges
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
