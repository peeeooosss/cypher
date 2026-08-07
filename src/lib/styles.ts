export const DANCE_STYLES = [
  "Breaking",
  "Popping",
  "Locking",
  "Hip-Hop",
  "House",
  "Krump",
  "Waacking",
  "Voguing",
  "Afrobeat",
  "Dancehall",
  "Flexing",
  "Turfing",
  "B-boy / B-girl",
  "Toprock",
  "Footwork",
  "Power Moves",
  "New Style",
  "Lyrical",
  "Contemporary",
  "Jazz",
] as const;

export type DanceStyle = (typeof DANCE_STYLES)[number];

export const EXPERIENCE_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i));

export function isDanceStyle(value: string): boolean {
  return (DANCE_STYLES as readonly string[]).includes(value);
}
