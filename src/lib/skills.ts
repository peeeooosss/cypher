import type { Skill } from "@/generated/prisma/enums";

export const SKILLS: Skill[] = [
  "DANCER",
  "CHOREOGRAPHER",
  "PERFORMER",
  "DJ",
  "MC",
  "GUITARIST",
  "DRUMMER",
  "RAPPER",
  "VOCALIST",
  "PRODUCER",
  "BEATBOXER",
  "PHOTOGRAPHER",
  "VISUAL_ARTIST",
];

export const SKILL_LABELS: Record<Skill, string> = {
  DANCER: "Dancer",
  CHOREOGRAPHER: "Choreographer",
  PERFORMER: "Performer",
  DJ: "DJ",
  MC: "MC",
  GUITARIST: "Guitarist",
  DRUMMER: "Drummer",
  RAPPER: "Rapper",
  VOCALIST: "Vocalist",
  PRODUCER: "Producer",
  BEATBOXER: "Beatboxer",
  PHOTOGRAPHER: "Photographer",
  VISUAL_ARTIST: "Visual artist",
};

export function skillLabel(skill: string) {
  return SKILL_LABELS[skill as Skill] ?? skill;
}
