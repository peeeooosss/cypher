import { EventType } from "@/generated/prisma/enums";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  UNDERGROUND_BATTLE: "Underground battle",
  DANCE_COMPETITION: "Dance competition",
  MUSIC_COMPETITION: "Music competition",
  WORKSHOP: "Workshop",
};

export const EVENT_TYPE_LIST: EventType[] = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export const SINGLE_POINT_ROUND_TYPES = ["CYPHER", "QUALIFIER"] as const;

export function isCompetitionType(type: EventType | string | null | undefined): boolean {
  return type === EventType.DANCE_COMPETITION || type === EventType.MUSIC_COMPETITION;
}

export function isBattleType(type: EventType | string | null | undefined): boolean {
  return type === EventType.UNDERGROUND_BATTLE;
}

export function isWorkshopType(type: EventType | string | null | undefined): boolean {
  return type === EventType.WORKSHOP;
}
