import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

export async function requireOrganizerEventAccess(eventId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: { error: "Authentication required" }, status: 401 };
  if (user.role !== "ORGANIZER") return { error: { error: "Organizer access required" }, status: 403 };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true },
  });
  if (!event) return { error: { error: "Event not found" }, status: 404 };
  if (event.organizerId !== user.id) return { error: { error: "Access denied" }, status: 403 };

  return { user, event };
}
