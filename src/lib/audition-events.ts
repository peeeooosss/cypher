// Custom per-event audition flow (BORN TO DANCE CHAMPIONSHIP).

export const CUSTOM_AUDITION_EVENT_SLUG = "born-to-dance";

export const CUSTOM_AUDITION_CITIES = [
  "Tezpur",
  "Dhekiajuli",
  "Bokajan",
  "Sarupathar",
  "Jorhat",
  "Mariani",
  "Sivasagar",
  "Dibrugarh",
  "Nagaon",
  "Silchar",
  "Moran",
  "Titabor",
  "Tinsukia",
  "Digboi",
  "Rajgarh",
  "Bamunbari (Moran)",
  "Narayanpur",
  "Biswanath Chariali",
  "Shillong (Meghalaya)",
  "Agartala (Tripura)",
  "Guwahati",
] as const;

export function isCustomAuditionEvent(slug: string | null | undefined): boolean {
  return slug === CUSTOM_AUDITION_EVENT_SLUG;
}

export function isCustomAuditionCity(city: string | null | undefined): boolean {
  if (!city) return false;
  return (CUSTOM_AUDITION_CITIES as readonly string[]).includes(city);
}

// Single source of truth for the organizer verification message on the custom
// audition event — shared by the fresh-checkout and pending-payment cart paths
// so the text can never drift between them.
export function buildStructuredVerifyMessage({
  studio,
  sender,
  age,
  city,
  team,
  choreographer,
  categories,
  payment,
  musicFileName,
  musicFileUrl,
}: {
  studio: string;
  sender: string;
  age?: number | null;
  city?: string | null;
  team?: string | null;
  choreographer?: string | null;
  categories: string;
  payment: string;
  musicFileName?: string | null;
  musicFileUrl?: string | null;
}): string {
  return [
    `Hi, ${studio}`,
    `Name: ${sender}`,
    ...(age != null ? [`Age: ${age}`] : []),
    ...(city ? [`City: ${city}`] : []),
    ...(team ? [`Team: ${team}`] : []),
    ...(choreographer ? [`Choreographer: ${choreographer}`] : []),
    `Category: ${categories}`,
    `Payment: ${payment}`,
    ...(musicFileName ? [`Music: ${musicFileName}`] : []),
    ...(musicFileUrl ? [`Music Link: ${musicFileUrl}`] : []),
    "Sharing my payment screenshot for verification.",
  ].join("\n");
}
