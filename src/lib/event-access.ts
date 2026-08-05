import { prisma } from "@/lib/prisma";

export async function getEventForOwner(eventId: string, userId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, organizerId: userId },
    select: { id: true },
  });
}
