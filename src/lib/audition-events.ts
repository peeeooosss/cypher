// Custom per-event audition flow (BORN TO DANCE CHAMPIONSHIP).
// Only this event forces an audition-type step during registration.

export const CUSTOM_AUDITION_EVENT_SLUG = "born-to-dance";

export const CUSTOM_AUDITION_CITIES = ["Guwahati", "Dibrugarh", "Tezpur"] as const;

export type CustomAuditionMode = "offline" | "online";

export function isCustomAuditionEvent(slug: string | null | undefined): boolean {
  return slug === CUSTOM_AUDITION_EVENT_SLUG;
}

export function isCustomAuditionCity(city: string | null | undefined): boolean {
  if (!city) return false;
  return (CUSTOM_AUDITION_CITIES as readonly string[]).includes(city);
}

export function auditionTypeLabel(mode: CustomAuditionMode, city: string | null): string {
  return `${mode === "offline" ? "Offline" : "Online"}${city ? ` (${city})` : ""}`;
}

// Single source of truth for the organizer verification message on the custom
// audition event — shared by the fresh-checkout and pending-payment cart paths
// so the text can never drift between them.
export function buildStructuredVerifyMessage({
  studio,
  sender,
  team,
  categories,
  payment,
  audMode,
  audCity,
}: {
  studio: string;
  sender: string;
  team?: string | null;
  categories: string;
  payment: string;
  audMode?: CustomAuditionMode | null;
  audCity?: string | null;
}): string {
  return [
    `Hi, ${studio}`,
    `Name: ${sender}`,
    ...(team ? [`Team: ${team}`] : []),
    `Category: ${categories}`,
    `Payment: ${payment}`,
    ...(audMode ? [`Audition Type: ${auditionTypeLabel(audMode, audMode === "offline" ? (audCity ?? null) : null)}`] : []),
    "Sharing my payment screenshot for verification.",
  ].join("\n");
}
