import { getCurrentUser } from "@/lib/rbac";

export const LEADERBOARD_HIDDEN_CODE = "LEADERBOARD_HIDDEN";

export type LeaderboardGate = {
  showPublicLeaderboard: boolean;
  organizerId: string;
};

/**
 * Aggregate standings are public while the organizer keeps them visible.
 * Once hidden they are locked to the event's own organizer (and ADMIN for
 * support) — visitors, signed-in users and registered artists all get a
 * "Results paused" response. Artists still see their own personal scores on
 * their dashboard. `eventId` is accepted for signature stability but unused.
 */
export async function canViewLeaderboard(_eventId: string, gate: LeaderboardGate): Promise<boolean> {
  if (gate.showPublicLeaderboard) return true;

  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "ORGANIZER" && gate.organizerId === user.id) return true;

  return false;
}

export function leaderboardHiddenResponse() {
  return Response.json(
    { error: "Results are paused by the organizer.", code: LEADERBOARD_HIDDEN_CODE },
    { status: 403 },
  );
}
