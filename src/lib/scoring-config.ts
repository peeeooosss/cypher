import { prisma } from "@/lib/prisma";
import type { ScoringConfig } from "@/generated/prisma/client";

export type ScoringCriterion = {
  key: string;
  label: string;
  max: number;
  order: number;
};

export type ScoringConfigType = {
  id: string;
  name: string;
  description?: string | null;
  appliesTo: "EVENT_TYPE" | "ROUND_TYPE" | "EVENT" | "CATEGORY" | "ROUND_FORMAT";
  appliesToValue?: string | null;
  criteria: ScoringCriterion[];
  totalMax: number;
  isDefault: boolean;
  isActive: boolean;
  eventId?: string | null;
  categoryId?: string | null;
  roundFormatId?: string | null;
};

function toConfig(row: ScoringConfig): ScoringConfigType {
  return {
    ...row,
    criteria: Array.isArray(row.criteria) ? (row.criteria as unknown as ScoringCriterion[]) : [],
  };
}

export const DEFAULT_SCORING_CRITERIA: ScoringCriterion[] = [
  { key: "musicality", label: "Musicality", max: 5, order: 1 },
  { key: "foundation", label: "Foundation", max: 5, order: 2 },
  { key: "presentation", label: "Presentation", max: 5, order: 3 },
  { key: "execution", label: "Execution", max: 5, order: 4 },
];

export const DEFAULT_CYPHER_SCORING_CRITERIA: ScoringCriterion[] = [
  { key: "musicality", label: "Musicality", max: 5, order: 1 },
  { key: "foundation", label: "Foundation", max: 5, order: 2 },
  { key: "presentation", label: "Presentation", max: 5, order: 3 },
  { key: "execution", label: "Execution", max: 5, order: 4 },
  { key: "battle_strategy", label: "Battle Strategy", max: 5, order: 5 },
];

export function getDefaultScoringCriteria(totalMax = 20) {
  const sum = DEFAULT_SCORING_CRITERIA.reduce((s, c) => s + c.max, 0);
  if (sum === totalMax) return DEFAULT_SCORING_CRITERIA;
  return DEFAULT_SCORING_CRITERIA.map((c) => ({
    ...c,
    max: Math.round((c.max * totalMax) / sum) || c.max,
  }));
}

export async function findEffectiveScoringConfig({
  eventId,
  categoryId,
  roundFormatId,
  eventType,
  roundType,
}: {
  eventId?: string | null;
  categoryId?: string | null;
  roundFormatId?: string | null;
  eventType?: string | null;
  roundType?: string | null;
}): Promise<ScoringConfigType | null> {
  if (roundFormatId) {
    const rf = await prisma.roundFormat.findUnique({ where: { id: roundFormatId }, include: { scoringConfig: true } });
    if (rf?.scoringConfig && rf.scoringConfig.isActive) {
      return toConfig(rf.scoringConfig);
    }
    const c = await prisma.scoringConfig.findFirst({
      where: { isActive: true, appliesTo: "ROUND_FORMAT", OR: [{ appliesToValue: roundFormatId }, { roundFormats: { some: { id: roundFormatId } } }] },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    if (c) return toConfig(c);
  }

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId }, include: { scoringConfig: true } });
    if (cat?.scoringConfig && cat.scoringConfig.isActive) {
      return toConfig(cat.scoringConfig);
    }
    const c = await prisma.scoringConfig.findFirst({
      where: { isActive: true, appliesTo: "CATEGORY", OR: [{ appliesToValue: categoryId }, { categories: { some: { id: categoryId } } }] },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    if (c) return toConfig(c);
  }

  if (eventId) {
    const ev = await prisma.event.findUnique({ where: { id: eventId }, include: { scoringConfig: true } });
    if (ev?.scoringConfig && ev.scoringConfig.isActive) {
      return toConfig(ev.scoringConfig);
    }
    const c = await prisma.scoringConfig.findFirst({
      where: { isActive: true, appliesTo: "EVENT", OR: [{ appliesToValue: eventId }, { events: { some: { id: eventId } } }] },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    if (c) return toConfig(c);
    if (eventType) {
      const c2 = await prisma.scoringConfig.findFirst({
        where: { isActive: true, appliesTo: "EVENT_TYPE", appliesToValue: eventType },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });
      if (c2) return toConfig(c2);
    }
  }

  if (roundType) {
    const c = await prisma.scoringConfig.findFirst({
      where: { isActive: true, appliesTo: "ROUND_TYPE", appliesToValue: roundType },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    if (c) return toConfig(c);
  }

  if (eventType) {
    const c = await prisma.scoringConfig.findFirst({
      where: { isActive: true, appliesTo: "EVENT_TYPE", appliesToValue: eventType },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    if (c) return toConfig(c);
  }

  const d = await prisma.scoringConfig.findFirst({
    where: { isActive: true, isDefault: true },
    orderBy: { createdAt: "desc" },
  });
  if (d) return toConfig(d);
  return null;
}