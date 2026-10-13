import { headers } from "next/headers";

/** Path segments under /artist/* claimed by real pages — usernames may not use these. */
export const RESERVED_USERNAMES = new Set([
  "directory",
  "marketplace",
  "gigs",
  "gig-bill",
  "admin",
  "api",
  "login",
  "signup",
  "events",
  "judge",
  "organizer",
  "artist",
  "cart",
  "payment",
  "feedback",
  "about",
  "offline",
  "forgot-password",
  "for-artists",
  "for-organizers",
  "app",
  "manifest",
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

/** Accepts "tulika" or "@tulika" from the URL; returns the bare lowercase handle. */
export function normalizeUsernameParam(param: string): string {
  return decodeURIComponent(param).replace(/^@+/, "").toLowerCase();
}

/** Canonical public path for an artist portfolio. */
export function profilePath(username: string): string {
  return `/artist/@${username}`;
}

export async function resolveAppBaseUrl(): Promise<string> {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (envBase) {
    return /^https?:\/\//.test(envBase) ? envBase : `https://${envBase}`;
  }
  const list = await headers();
  const host = list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function resolveProfileUrl(username: string): Promise<string> {
  const base = await resolveAppBaseUrl();
  return new URL(profilePath(username), base).toString();
}
