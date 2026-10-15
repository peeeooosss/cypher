import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const LEADERBOARD_HIDDEN_CODE = "LEADERBOARD_HIDDEN";

export type LeaderboardGate = {
  showPublicLeaderboard: boolean;
  organizerId: string;
};

/**
 * Aggregate standings are public while the organizer keeps them visible.
 * When hidden, the event owner and artists registered in the event
 * (captains or accepted/pending members) can still view them.
 */
export async function canViewLeaderboard(eventId: string, gate: LeaderboardGate): Promise<boolean> {
  if (gate.showPublicLeaderboard) return true;

  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "ORGANIZER" && gate.organizerId === user.id) return true;
  if (user.role !== "ARTIST") return false;

  const registration = await prisma.registration.findFirst({
    where: {
      category: { eventId },
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id, status: { in: ["PENDING", "ACCEPTED"] } } } },
      ],
    },
    select: { id: true },
  });

  return registration != null;
}

export function leaderboardHiddenResponse() {
  return Response.json(
    { error: "Results are paused by the organizer.", code: LEADERBOARD_HIDDEN_CODE },
    { status: 403 },
  );
}
