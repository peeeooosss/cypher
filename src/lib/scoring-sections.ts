export const SCORING_SECTIONS = [
  "MUSICALITY",
  "FOUNDATION",
  "PRESENTATION",
  "EXECUTION",
] as const;

export type SectionKey = (typeof SCORING_SECTIONS)[number];

export type SectionScores = Record<SectionKey, number>;

export const MAX_SECTION = 5;
export const STEP = 0.5;
export const SECTION_VALUES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
export const MAX_TOTAL = 20;

export const EMPTY_SECTIONS: SectionScores = {
  MUSICALITY: 0,
  FOUNDATION: 0,
  PRESENTATION: 0,
  EXECUTION: 0,
};

export function sectionTotal(sections: SectionScores): number {
  return SCORING_SECTIONS.reduce((sum, key) => sum + (sections[key] ?? 0), 0);
}

export function isComplete(sections: SectionScores): boolean {
  return SCORING_SECTIONS.every((key) => sections[key] > 0);
}

export function valueFromAny(value: unknown): number {
  if (typeof value !== "number") return 0;
  if (value < 0 || value > MAX_SECTION) return 0;
  return Math.round(value / STEP) * STEP;
}

export function sectionsFromRecord(record: Record<string, unknown> | null | undefined): SectionScores {
  const out = { ...EMPTY_SECTIONS };
  if (!record) return out;
  for (const key of SCORING_SECTIONS) {
    out[key] = valueFromAny(record[key]);
  }
  return out;
}
