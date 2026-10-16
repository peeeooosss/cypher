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
