import { CategoryFormat, EventType } from "@/generated/prisma/enums";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  UNDERGROUND_BATTLE: "Underground battle",
  DANCE_COMPETITION: "Dance competition",
  MUSIC_COMPETITION: "Music competition",
  WORKSHOP: "Workshop",
};

export const EVENT_TYPE_LIST: EventType[] = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export const SINGLE_POINT_ROUND_TYPES = ["CYPHER", "QUALIFIER"] as const;

export const CATEGORY_FORMAT_LABELS: Record<CategoryFormat, string> = {
  SOLO: "Solo",
  DUO: "Duo",
  GROUP: "Group",
  BATTLE_1V1: "1v1",
  BATTLE_2V2: "2v2",
  BATTLE_3V3: "3v3",
  CREW_VS_CREW: "Crew vs crew",
};

export const BATTLE_FORMATS: CategoryFormat[] = [
  CategoryFormat.BATTLE_1V1,
  CategoryFormat.BATTLE_2V2,
  CategoryFormat.BATTLE_3V3,
  CategoryFormat.CREW_VS_CREW,
];

export const COMPETITION_FORMATS: CategoryFormat[] = [
  CategoryFormat.SOLO,
  CategoryFormat.DUO,
  CategoryFormat.GROUP,
];

export const CATEGORY_FORMAT_LIST = Object.keys(CATEGORY_FORMAT_LABELS) as CategoryFormat[];

export function formatLabel(format: CategoryFormat | string | null | undefined): string {
  return format ? CATEGORY_FORMAT_LABELS[format as CategoryFormat] ?? format : "Solo";
}

export function defaultRosterSize(format: CategoryFormat | string | null | undefined) {
  switch (format) {
    case CategoryFormat.DUO:
    case CategoryFormat.BATTLE_2V2:
      return { min: 2, max: 2 };
    case CategoryFormat.BATTLE_3V3:
      return { min: 3, max: 3 };
    case CategoryFormat.GROUP:
    case CategoryFormat.CREW_VS_CREW:
      return { min: 4, max: format === CategoryFormat.GROUP ? 12 : 20 };
    default:
      return { min: 1, max: 1 };
  }
}

export function isTeamFormat(format: CategoryFormat | string | null | undefined) {
  return format !== CategoryFormat.SOLO && format !== CategoryFormat.BATTLE_1V1 && Boolean(format);
}

export function isCompetitionType(type: EventType | string | null | undefined): boolean {
  return type === EventType.DANCE_COMPETITION || type === EventType.MUSIC_COMPETITION;
}

export function isBattleType(type: EventType | string | null | undefined): boolean {
  return type === EventType.UNDERGROUND_BATTLE;
}

export function isWorkshopType(type: EventType | string | null | undefined): boolean {
  return type === EventType.WORKSHOP;
}
